import { NextRequest, NextResponse } from 'next/server';

/**
 * Constant-time string comparison for Edge runtime.
 * Uses XOR accumulation — runs in fixed time regardless of where strings differ.
 * No node:crypto dependency (Edge-compatible).
 */
function secureCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  const maxLen = Math.max(aBuf.length, bBuf.length);

  let mismatch = aBuf.length ^ bBuf.length;
  for (let i = 0; i < maxLen; i++) {
    mismatch |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0);
  }
  return mismatch === 0;
}

function isAuthEnabled(raw: string | undefined): boolean {
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Keep public routes accessible even when basic auth is enabled.
  if (
    pathname === '/' ||
    pathname === '/intake' ||
    pathname === '/favicon.ico' ||
    pathname === '/site.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/apple-touch-icon-precomposed.png' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/shared/') ||
    pathname.startsWith('/api/shared/') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next();
  }

  // API key auth for automation (crons, scripts)
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const headerKey = request.headers.get('x-api-key');
    const queryKey = request.nextUrl.searchParams.get('api_key');
    if (
      (headerKey && secureCompare(headerKey, apiKey)) ||
      (queryKey && secureCompare(queryKey, apiKey))
    ) {
      return NextResponse.next();
    }
  }

  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  const authEnabled = isAuthEnabled(process.env.BASIC_AUTH_ENABLED);

  // Basic auth is opt-in. Keep app public by default unless explicitly enabled.
  if (!authEnabled || !user || !pass) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const sepIdx = decoded.indexOf(':');
      if (sepIdx >= 0) {
        const authUser = decoded.slice(0, sepIdx);
        const authPass = decoded.slice(sepIdx + 1);
        if (secureCompare(authUser, user) && secureCompare(authPass, pass)) {
          return NextResponse.next();
        }
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Marketing Tool"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
