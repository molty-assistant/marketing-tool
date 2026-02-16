import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

type Style = 'landscape' | 'square' | 'vertical';

interface GenerateVideoBody {
  planId: string;
  style: Style;
  screenshots: string[]; // URLs or base64 (data URLs allowed)
  headlines: string[];
  musicUrl?: string;
  // future: brand colors, font, etc.
}

function dimsForStyle(style: Style) {
  switch (style) {
    case 'square':
      return { width: 1080, height: 1080 };
    case 'vertical':
      return { width: 1080, height: 1920 };
    case 'landscape':
    default:
      return { width: 1920, height: 1080 };
  }
}

function isDataUrl(s: string) {
  return s.startsWith('data:');
}

function escapeForDrawtext(input: string) {
  // drawtext parsing rules are a bit odd; this covers common troublemakers.
  // Ref: https://ffmpeg.org/ffmpeg-filters.html#drawtext-1
  return input
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
}

async function writeScreenshotToFile(dir: string, idx: number, screenshot: string) {
  const baseName = `shot-${String(idx).padStart(2, '0')}`;

  if (isDataUrl(screenshot)) {
    const match = screenshot.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) throw new Error('Invalid data URL screenshot');
    const mime = match[1];
    const b64 = match[2];

    const ext = mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'bin';
    const outPath = path.join(dir, `${baseName}.${ext}`);
    const buf = Buffer.from(b64, 'base64');
    await fs.writeFile(outPath, buf);
    return outPath;
  }

  // Remote URL
  const res = await fetch(screenshot);
  if (!res.ok) throw new Error(`Failed to fetch screenshot: ${screenshot}`);
  const contentType = res.headers.get('content-type') || '';
  const ext = contentType.includes('png')
    ? 'png'
    : contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'jpg'
      : 'img';
  const outPath = path.join(dir, `${baseName}.${ext}`);
  const ab = await res.arrayBuffer();
  await fs.writeFile(outPath, Buffer.from(ab));
  return outPath;
}

async function writeMusicToFile(dir: string, musicUrl: string) {
  const res = await fetch(musicUrl);
  if (!res.ok) throw new Error(`Failed to fetch musicUrl: ${musicUrl}`);
  const contentType = res.headers.get('content-type') || '';
  const ext = contentType.includes('mpeg') || contentType.includes('mp3')
    ? 'mp3'
    : contentType.includes('wav')
      ? 'wav'
      : contentType.includes('aac')
        ? 'aac'
        : 'audio';
  const outPath = path.join(dir, `music.${ext}`);
  const ab = await res.arrayBuffer();
  await fs.writeFile(outPath, Buffer.from(ab));
  return outPath;
}

function findFontFile() {
  const candidates = [
    // Debian/Ubuntu common
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    // Alpine-ish
    '/usr/share/fonts/ttf-dejavu/DejaVuSans-Bold.ttf',
  ];
  for (const p of candidates) {
    if (fssync.existsSync(p)) return p;
  }
  return null;
}

export async function POST(request: NextRequest) {
  let tmpDir: string | null = null;
  try {
    const body = (await request.json()) as GenerateVideoBody;

    if (!body?.planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    if (!body?.style) return NextResponse.json({ error: 'Missing style' }, { status: 400 });
    if (!Array.isArray(body.screenshots) || body.screenshots.length < 3 || body.screenshots.length > 5) {
      return NextResponse.json({ error: 'screenshots must be an array of 3-5 images' }, { status: 400 });
    }
    if (!Array.isArray(body.headlines) || body.headlines.length < 1) {
      return NextResponse.json({ error: 'headlines must be a non-empty array' }, { status: 400 });
    }

    const { width, height } = dimsForStyle(body.style);

    // Timing
    const slideDurationSec = 4; // ~3-5s
    const transitionSec = 1;
    const fps = 30;
    const framesPerSlide = slideDurationSec * fps;
    const totalDurationSec = body.screenshots.length * slideDurationSec - (body.screenshots.length - 1) * transitionSec;

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'marketing-tool-video-'));

    const imagePaths: string[] = [];
    for (let i = 0; i < body.screenshots.length; i++) {
      imagePaths.push(await writeScreenshotToFile(tmpDir, i, body.screenshots[i]));
    }

    const musicPath = body.musicUrl ? await writeMusicToFile(tmpDir, body.musicUrl) : null;

    const outPath = path.join(tmpDir, `${body.planId}-${body.style}.mp4`);

    // Build filter graph
    const fontFile = findFontFile();
    const textY = Math.round(height * 0.78);
    const fontSize = Math.round(height * 0.06);

    const filters: string[] = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const headline = body.headlines[i] ?? body.headlines[body.headlines.length - 1] ?? '';
      const text = escapeForDrawtext(headline);

      const drawTextParts = [
        `text='${text}'`,
        fontFile ? `fontfile=${fontFile}` : null,
        `x=(w-text_w)/2`,
        `y=${textY}`,
        `fontsize=${fontSize}`,
        `fontcolor=white`,
        `box=1`,
        `boxcolor=0x00000088`,
        `boxborderw=${Math.round(fontSize * 0.55)}`,
        // fade in over first 0.8s
        `alpha='if(lt(t,0.8),t/0.8,1)'`,
      ].filter(Boolean);

      // scale+crop to fill, then Ken Burns zoom
      // zoompan produces a constant frame-rate stream from a single image.
      filters.push(
        `[${i}:v]` +
          `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
          `crop=${width}:${height},` +
          `format=rgba,` +
          `zoompan=z='min(zoom+0.0015,1.15)':d=${framesPerSlide}:s=${width}x${height}:fps=${fps},` +
          `setsar=1,` +
          `drawtext=${drawTextParts.join(':')}` +
          `[v${i}]`
      );
    }

    // Chain crossfades
    let lastLabel = 'v0';
    for (let i = 1; i < imagePaths.length; i++) {
      const offset = (slideDurationSec - transitionSec) * i;
      const outLabel = `xf${i}`;
      filters.push(
        `[${lastLabel}][v${i}]xfade=transition=fade:duration=${transitionSec}:offset=${offset}[${outLabel}]`
      );
      lastLabel = outLabel;
    }

    filters.push(`[${lastLabel}]format=yuv420p[vout]`);

    const args: string[] = ['-y'];

    // Inputs (images)
    for (const p of imagePaths) {
      args.push('-loop', '1', '-t', String(slideDurationSec), '-i', p);
    }

    // Audio input
    if (musicPath) {
      // loop music to be safe
      args.push('-stream_loop', '-1', '-i', musicPath);
    } else {
      args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    }

    const audioInputIndex = imagePaths.length;

    args.push(
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[vout]',
      '-map',
      `${audioInputIndex}:a:0`,
      '-t',
      String(totalDurationSec),
      '-r',
      String(fps),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outPath
    );

    // Run ffmpeg
    try {
      await execFileAsync('ffmpeg', args, { maxBuffer: 1024 * 1024 * 20 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'FFmpeg failed';
      return NextResponse.json(
        {
          error: msg,
          hint:
            'Ensure ffmpeg is installed in the runtime image. In Docker: apt-get update && apt-get install -y ffmpeg',
        },
        { status: 500 }
      );
    }

    const mp4 = await fs.readFile(outPath);
    return new NextResponse(mp4, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="promo-${body.planId}-${body.style}.mp4"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate video';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    if (tmpDir) {
      // Best-effort cleanup
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}
