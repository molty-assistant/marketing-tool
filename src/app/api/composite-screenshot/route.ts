import { NextRequest, NextResponse } from 'next/server';
import { buildCompositeHtml, type CompositeScreenshotInput } from '@/lib/screenshot-compositor';
import { enforceRateLimit } from '@/lib/rate-limit';

let activeRenders = 0;
const MAX_CONCURRENT = 3;

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/composite-screenshot', bucket: 'heavy', maxRequests: 20, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  if (activeRenders >= MAX_CONCURRENT) {
    return NextResponse.json({ error: 'Too many concurrent renders. Please try again shortly.' }, { status: 429 });
  }
  activeRenders++;
  try {
    const body = (await request.json()) as CompositeScreenshotInput;
    const { html, width, height } = buildCompositeHtml(body);

    let chromium;
    try {
      const pw = await import('playwright');
      chromium = pw.chromium;
    } catch {
      return NextResponse.json({ error: 'Playwright is not installed.' }, { status: 500 });
    }

    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    try {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 20000 });
      const png = await page.screenshot({ type: 'png', timeout: 20000 });
      await ctx.close();
      return new NextResponse(new Uint8Array(png), {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'attachment; filename="composited-screenshot.png"',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to composite screenshot';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    activeRenders--;
  }
}
