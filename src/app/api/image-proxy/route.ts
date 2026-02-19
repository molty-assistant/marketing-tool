import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';

export const runtime = 'nodejs';

// 1x1 transparent PNG
const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X9d8AAAAASUVORK5CYII=';
const TRANSPARENT_PNG = Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((x) => Number.parseInt(x, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;

  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local / metadata
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 0) return true; // 0.0.0.0/8 (invalid/non-routable)

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1') return true; // loopback
  if (normalized.startsWith('fe80:')) return true; // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local fc00::/7
  return false;
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must be http/https');
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  if (!hostname) throw new Error('Invalid hostname');

  // Basic hostname blocks
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Blocked host');
  }
  if (hostname === 'metadata.google.internal') {
    throw new Error('Blocked host');
  }

  // If hostname is an IP literal, validate directly
  const ipType = net.isIP(hostname);
  if (ipType === 4 && isPrivateIPv4(hostname)) throw new Error('Blocked IP');
  if (ipType === 6 && isPrivateIPv6(hostname)) throw new Error('Blocked IP');

  // Otherwise DNS resolve and validate all returned A/AAAA records
  if (ipType === 0) {
    const addrs = await dns.lookup(hostname, { all: true, verbatim: true });
    if (addrs.length === 0) throw new Error('DNS lookup failed');

    for (const addr of addrs) {
      if (addr.family === 4 && isPrivateIPv4(addr.address)) {
        throw new Error('Blocked IP');
      }
      if (addr.family === 6 && isPrivateIPv6(addr.address)) {
        throw new Error('Blocked IP');
      }
    }
  }

  return parsed;
}

function transparentPngResponse(status = 502) {
  return new NextResponse(TRANSPARENT_PNG, {
    status,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  let target: URL;
  try {
    target = await assertSafeUrl(urlParam);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid url param';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'marketing-tool-image-proxy/1.0',
        Accept: 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!upstream.ok || !upstream.body) {
      return transparentPngResponse(502);
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Keep it simple/safe: do not cache; upstream URLs can be volatile.
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return transparentPngResponse(502);
  } finally {
    clearTimeout(timeout);
  }
}
