import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';
import { enforceRateLimit } from '@/lib/rate-limit';

interface AssetInput {
  html: string;
  width: number;
  height: number;
  filename: string;
}

// Concurrency limiter shared concept — zip can use up to 3 sequential renders
let activeZipRenders = 0;
const MAX_CONCURRENT_ZIP = 1; // Only 1 zip job at a time

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/render-zip', bucket: 'heavy', maxRequests: 15, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  if (activeZipRenders >= MAX_CONCURRENT_ZIP) {
    return NextResponse.json(
      { error: 'A ZIP render is already in progress. Please try again shortly.' },
      { status: 429 }
    );
  }

  activeZipRenders++;
  try {
    const body = await request.json();
    const { assets } = body as { assets: AssetInput[] };

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: assets (non-empty array)' },
        { status: 400 }
      );
    }

    if (assets.length > 10) {
      return NextResponse.json(
        { error: 'Too many assets (max 10)' },
        { status: 400 }
      );
    }

    for (const asset of assets) {
      if (!asset.html || !asset.width || !asset.height || !asset.filename) {
        return NextResponse.json(
          { error: 'Each asset needs: html, width, height, filename' },
          { status: 400 }
        );
      }
      if (asset.width > 4000 || asset.height > 4000) {
        return NextResponse.json(
          { error: `Dimensions too large for ${asset.filename} (max 4000px)` },
          { status: 400 }
        );
      }
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
      // Render all assets to PNG buffers
      const pngBuffers: { filename: string; buffer: Buffer }[] = [];

      for (const asset of assets) {
        const context = await browser.newContext({
          viewport: { width: asset.width, height: asset.height },
        });
        const page = await context.newPage();

        await page.setContent(asset.html, {
          waitUntil: 'networkidle',
          timeout: 10000,
        });

        const screenshot = await page.screenshot({
          type: 'png',
          timeout: 10000,
        });

        pngBuffers.push({
          filename: asset.filename.endsWith('.png')
            ? asset.filename
            : `${asset.filename}.png`,
          buffer: Buffer.from(screenshot),
        });

        await context.close();
      }

      // Create ZIP using archiver
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

      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="marketing-assets.zip"',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to render ZIP';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    activeZipRenders--;
  }
}
