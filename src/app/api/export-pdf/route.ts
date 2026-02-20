import { headers } from 'next/headers';
import { chromium } from 'playwright';
import { enforceRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

async function getBaseUrl() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  if (!host) return null;
  return `${proto}://${host}`;
}

function parseCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return [] as { name: string; value: string }[];
  return cookieHeader
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf('=');
      if (idx === -1) return { name: pair, value: '' };
      return { name: pair.slice(0, idx), value: pair.slice(idx + 1) };
    });
}

function getFilenameFromPlanName(planName: string | undefined | null) {
  const safe = slugify(planName || 'plan');
  return `marketing-brief-${safe}.pdf`;
}

export async function POST(req: Request) {
  const rateLimitResponse = enforceRateLimit(req, { endpoint: '/api/export-pdf', bucket: 'heavy', maxRequests: 12, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  const baseUrl = await getBaseUrl();
  if (!baseUrl) {
    return Response.json({ error: 'Missing host' }, { status: 400 });
  }

  let body: { planId?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const planId = body.planId?.toString();
  const token = body.token?.toString();

  if (!planId && !token) {
    return Response.json({ error: 'Provide planId or token' }, { status: 400 });
  }

  const cookieHeader = req.headers.get('cookie');

  // Determine filename by fetching the plan JSON (prefer real name, but don't fail export on name lookup).
  let planName: string | undefined;
  try {
    if (token) {
      const res = await fetch(`${baseUrl}/api/shared/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as any;
        planName = json?.config?.app_name;
      }
    } else if (planId) {
      const res = await fetch(`${baseUrl}/api/plans/${encodeURIComponent(planId)}`, {
        cache: 'no-store',
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      });
      if (res.ok) {
        const json = (await res.json()) as any;
        planName = json?.config?.app_name;
      }
    }
  } catch {
    // ignore
  }

  const filename = getFilenameFromPlanName(planName);

  const targetUrl = token
    ? `${baseUrl}/shared/${encodeURIComponent(token)}?pdf=1`
    : `${baseUrl}/plan/${encodeURIComponent(planId as string)}/strategy/brief?pdf=1`;

  let browser: any;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // For authenticated exports, carry cookies into Playwright so the page can render.
    if (planId && cookieHeader) {
      const host = new URL(baseUrl).host;
      const domain = host.split(':')[0];
      const cookies = parseCookieHeader(cookieHeader).map((c) => ({
        name: c.name,
        value: c.value,
        domain,
        path: '/',
      }));
      if (cookies.length) await context.addCookies(cookies);
    }

    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('body', { timeout: 60_000 });

    // Hide UI elements that don't belong in a PDF.
    await page.addStyleTag({
      content: `
        @media print {
          button, a { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        button, nav, header { display: none !important; }
      `,
    });

    // Give client-side data loads a moment to finish rendering.
    await page.waitForTimeout(750);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      preferCSSPageSize: true,
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate PDF';
    return Response.json({ error: msg }, { status: 500 });
  } finally {
    try {
      await browser?.close();
    } catch {
      // ignore
    }
  }
}
