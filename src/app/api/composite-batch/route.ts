import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';
import { getPlan } from '@/lib/db';
import { buildCompositeHtml, type CompositeDevice } from '@/lib/screenshot-compositor';

interface BatchInput {
  planId: string;
  screenshots: Array<{
    imageUrl?: string;
    imageBase64?: string;
    headline: string;
    subheadline?: string;
    badge?: string;
  }>;
  device?: CompositeDevice;
  backgroundColor?: string;
  textColor?: string;
}

let active = 0;

export async function POST(request: NextRequest) {
  if (active >= 1) {
    return NextResponse.json({ error: 'A ZIP render is already in progress.' }, { status: 429 });
  }
  active++;
  try {
    const body = (await request.json()) as BatchInput;
    const { planId, screenshots, device, backgroundColor, textColor } = body;

    if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    if (!screenshots?.length) return NextResponse.json({ error: 'screenshots array is required' }, { status: 400 });
    if (screenshots.length > 10) return NextResponse.json({ error: 'Max 10 screenshots' }, { status: 400 });

    const row = getPlan(planId);
    if (!row) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    const config = JSON.parse(row.config) as { app_name?: string };
    const appName = config.app_name || '';

    let chromium;
    try {
      const pw = await import('playwright-core');
      chromium = pw.chromium;
    } catch {
      return NextResponse.json({ error: 'Playwright is not installed.' }, { status: 500 });
    }

    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    try {
      const pngs: { name: string; buf: Buffer }[] = [];

      for (let i = 0; i < screenshots.length; i++) {
        const s = screenshots[i];
        const { html, width, height } = buildCompositeHtml({
          ...s,
          device,
          backgroundColor,
          textColor,
          appName,
        });

        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        await page.setContent(html, { waitUntil: 'networkidle', timeout: 20000 });
        const shot = await page.screenshot({ type: 'png', timeout: 20000 });
        await ctx.close();
        pngs.push({ name: `screenshot-${String(i + 1).padStart(2, '0')}.png`, buf: Buffer.from(shot) });
      }

      const pt = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 6 } });
      const chunks: Buffer[] = [];
      pt.on('data', (c: Buffer) => chunks.push(c));
      const done = new Promise<Buffer>((res, rej) => {
        pt.on('end', () => res(Buffer.concat(chunks)));
        pt.on('error', rej);
        archive.on('error', rej);
      });
      archive.pipe(pt);
      for (const { name, buf } of pngs) archive.append(Readable.from(buf), { name });
      await archive.finalize();
      const zip = await done;

      const slug = (appName || 'screenshots').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'screenshots';
      return new NextResponse(new Uint8Array(zip), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${slug}-composited.zip"`,
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to composite batch';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    active--;
  }
}
