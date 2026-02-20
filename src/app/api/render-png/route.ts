import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limit';

// Concurrency limiter: max 3 concurrent renders
let activeRenders = 0;
const MAX_CONCURRENT = 3;

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/render-png', bucket: 'heavy', maxRequests: 25, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  if (activeRenders >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: 'Too many concurrent renders. Please try again shortly.' },
      { status: 429 }
    );
  }

  activeRenders++;
  try {
    const body = await request.json();
    const { html, width, height } = body as {
      html: string;
      width: number;
      height: number;
    };

    if (!html || !width || !height) {
      return NextResponse.json(
        { error: 'Missing required fields: html, width, height' },
        { status: 400 }
      );
    }

    if (width > 4000 || height > 4000) {
      return NextResponse.json(
        { error: 'Dimensions too large (max 4000px)' },
        { status: 400 }
      );
    }

    let chromium;
    try {
      const pw = await import('playwright-core');
      chromium = pw.chromium;
    } catch {
      return NextResponse.json(
        {
          error:
            'Playwright is not installed. Run: npm install playwright-core && npx playwright-core install chromium',
        },
        { status: 500 }
      );
    }

    const browser = await chromium.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const context = await browser.newContext({
        viewport: { width, height },
      });
      const page = await context.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      const screenshot = await page.screenshot({
        type: 'png',
        timeout: 10000,
      });

      await context.close();

      return new NextResponse(new Uint8Array(screenshot), {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'attachment; filename="asset.png"',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to render PNG';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    activeRenders--;
  }
}
