import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';
import { getPlan, updatePlanContent } from '@/lib/db';
import type { MarketingPlan } from '@/lib/types';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  generateSocialTemplates,
  type SocialPlatform,
  type SocialStyle,
} from '@/lib/socialTemplates';

let activeJobs = 0;
const MAX_CONCURRENT = 1;

function isPlatform(x: unknown): x is SocialPlatform {
  return (
    x === 'twitter' ||
    x === 'linkedin' ||
    x === 'instagram-post' ||
    x === 'instagram-story' ||
    x === 'facebook-og'
  );
}

function isStyle(x: unknown): x is SocialStyle {
  return x === 'gradient' || x === 'dark' || x === 'light';
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/generate-social-images', bucket: 'heavy', maxRequests: 4, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  if (activeJobs >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: 'A social pack is already generating. Please try again shortly.' },
      { status: 429 }
    );
  }

  activeJobs++;
  try {
    const body = await request.json();
    const planId = typeof body?.planId === 'string' ? body.planId : '';
    const platformsRaw = body?.platforms;
    const styleRaw = body?.style;
    const accentColor =
      typeof body?.accentColor === 'string' ? body.accentColor : '#667eea';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const platforms = Array.isArray(platformsRaw)
      ? platformsRaw.filter(isPlatform)
      : [];

    if (platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing "platforms" (non-empty array)' },
        { status: 400 }
      );
    }

    const style: SocialStyle = isStyle(styleRaw) ? styleRaw : 'gradient';

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const plan: MarketingPlan = {
      id: row.id,
      config: JSON.parse(row.config || '{}'),
      scraped: JSON.parse(row.scraped || '{}'),
      generated: row.generated,
      createdAt: row.created_at,
      stages: JSON.parse(row.stages || '{}'),
    };

    const templates = generateSocialTemplates({
      plan,
      platforms,
      style,
      accentColor,
    });

    // Render templates to png via Playwright (single browser, sequential pages)
    let chromium;
    try {
      const pw = await import('playwright');
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
      const pngBuffers: { filename: string; buffer: Buffer }[] = [];

      for (const t of templates) {
        const context = await browser.newContext({
          viewport: { width: t.width, height: t.height },
        });
        const page = await context.newPage();

        await page.setContent(t.html, {
          waitUntil: 'networkidle',
          timeout: 15000,
        });

        const screenshot = await page.screenshot({
          type: 'png',
          timeout: 15000,
        });

        pngBuffers.push({
          filename: t.filename.endsWith('.png') ? t.filename : `${t.filename}.png`,
          buffer: Buffer.from(screenshot),
        });

        await context.close();
      }

      const passthrough = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 6 } });

      const chunks: Buffer[] = [];
      passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));

      const finishPromise = new Promise<Buffer>((resolve, reject) => {
        passthrough.on('end', () => resolve(Buffer.concat(chunks)));
        passthrough.on('error', reject);
        archive.on('error', reject);
      });

      archive.pipe(passthrough);

      for (const { filename, buffer } of pngBuffers) {
        archive.append(Readable.from(buffer), { name: filename });
      }

      await archive.finalize();
      const zipBuffer = await finishPromise;

      // Save metadata about generated images
      updatePlanContent(planId, 'socialImages', {
        platforms,
        style,
        accentColor,
        files: pngBuffers.map(p => p.filename),
        generatedAt: new Date().toISOString(),
      });

      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="social-images.zip"',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate social pack';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    activeJobs--;
  }
}
