#!/usr/bin/env node
/**
 * Video Pipeline (Task 52)
 *
 * Generates short promo clips from 3–5 screenshots using FFmpeg.
 *
 * Usage:
 *   node tools/video-pipeline.js [--app lightscout] [--screenshots dir] [--output dir]
 *
 * Outputs:
 *   output/promo-landscape.mp4  (1920x1080)
 *   output/promo-square.mp4     (1080x1080)
 *   output/promo-vertical.mp4   (1080x1920)
 *
 * --------------------------------------------------------------------------------------
 * README: how this works (pipeline overview)
 *
 * 1) Inputs
 *    - By default reads screenshots from: public/screenshots/
 *    - Uses up to 5 images (png/jpg/jpeg/webp), sorted by filename.
 *    - If no screenshots exist, it generates simple gradient placeholder images (PPM)
 *      into <output>/_placeholders and uses those instead.
 *
 * 2) Per-slide animation (Ken Burns)
 *    For each screenshot:
 *      - loop the still image for `slideDurSec` seconds
 *      - scale+crop to the target canvas (force_original_aspect_ratio=increase)
 *      - apply `zoompan` for a subtle pan/zoom over the duration
 *
 * 3) Transitions
 *    Slides are chained together with `xfade` (fade), 1s duration.
 *    Offsets are computed so each transition starts at (slideDur - transitionDur) * k.
 *
 * 4) Text overlay
 *    An RGBA overlay image is generated (BMP) with app name + tagline loaded from
 *    tools/video-pipeline.config.json (override with --app), then composited with
 *    FFmpeg's overlay filter.
 *
 * 5) Encodes
 *    We run the same pipeline 3 times for the 3 aspect ratios and write MP4/H.264
 *    with yuv420p + faststart.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SLIDE_DUR_SEC = 5;
const TRANS_DUR_SEC = 1;
const FPS = 30;
const MAX_SLIDES = 5;
const MIN_SLIDES = 3;

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = { app: undefined, screenshots: undefined, output: undefined };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--app') out.app = argv[++i];
    else if (a === '--screenshots') out.screenshots = argv[++i];
    else if (a === '--output') out.output = argv[++i];
    else if (a === '-h' || a === '--help') out.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return out;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`${cmd} exited with code ${res.status}`);
}

function which(bin) {
  const res = spawnSync('which', [bin], { encoding: 'utf8' });
  if (res.status === 0) return (res.stdout || '').trim();
  return null;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function listScreenshots(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const exts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  return fs
    .readdirSync(dir)
    .filter((f) => exts.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => path.join(dir, f));
}

// NOTE: this machine's ffmpeg is built without the drawtext filter, so we implement
// a tiny bitmap text renderer and overlay it as an RGBA BMP.

function loadAppConfig(appKey) {
  const cfgPath = path.join(ROOT, 'tools', 'video-pipeline.config.json');
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const cfg = JSON.parse(raw);
  const key = appKey || cfg.defaultApp;
  const app = (cfg.apps || {})[key];
  if (!app) {
    const known = Object.keys(cfg.apps || {}).join(', ') || '(none)';
    throw new Error(`Unknown --app ${key}. Known apps: ${known}`);
  }
  return { key, ...app };
}

function makeGradientPPM(outPath, w, h, c1, c2) {
  // Binary PPM (P6): small, no deps.
  const header = Buffer.from(`P6\n${w} ${h}\n255\n`, 'ascii');
  const buf = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    const t = y / Math.max(1, h - 1);
    const r = Math.round(c1[0] * (1 - t) + c2[0] * t);
    const g = Math.round(c1[1] * (1 - t) + c2[1] * t);
    const b = Math.round(c1[2] * (1 - t) + c2[2] * t);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      // subtle horizontal modulation
      const m = 0.9 + 0.1 * Math.sin((x / Math.max(1, w - 1)) * Math.PI);
      buf[i] = Math.max(0, Math.min(255, Math.round(r * m)));
      buf[i + 1] = Math.max(0, Math.min(255, Math.round(g * m)));
      buf[i + 2] = Math.max(0, Math.min(255, Math.round(b * m)));
    }
  }
  fs.writeFileSync(outPath, Buffer.concat([header, buf]));
}

function ensurePlaceholders(outputDir, count) {
  const phDir = path.join(outputDir, '_placeholders');
  ensureDir(phDir);

  const colors = [
    [[35, 133, 255], [140, 255, 215]],
    [[255, 80, 120], [255, 210, 120]],
    [[155, 90, 255], [120, 220, 255]],
    [[25, 200, 160], [255, 255, 180]],
    [[255, 140, 60], [255, 80, 200]]
  ];

  const w = 1280;
  const h = 720;

  const files = [];
  for (let i = 0; i < count; i++) {
    const ppm = path.join(phDir, `slide-${String(i + 1).padStart(2, '0')}.ppm`);
    if (!fs.existsSync(ppm)) {
      const [c1, c2] = colors[i % colors.length];
      makeGradientPPM(ppm, w, h, c1, c2);
    }
    files.push(ppm);
  }

  return files;
}

// Very small 5x7 bitmap font (uppercase). Each entry is 7 strings of length 5.
const FONT_5X7 = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '?': ['01110','10001','00010','00100','00100','00000','00100'],
  '.': ['00000','00000','00000','00000','00000','00110','00110'],
  ',': ['00000','00000','00000','00000','00110','00110','00100'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '!': ['00100','00100','00100','00100','00100','00000','00100'],
  ':': ['00000','00110','00110','00000','00110','00110','00000'],
  '\'': ['00100','00100','00000','00000','00000','00000','00000'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'],
  '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'],
  '5': ['11111','10000','10000','11110','00001','00001','11110'],
  '6': ['01110','10000','10000','11110','10001','10001','01110'],
  '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00001','01110'],
  'A': ['01110','10001','10001','11111','10001','10001','10001'],
  'B': ['11110','10001','10001','11110','10001','10001','11110'],
  'C': ['01110','10001','10000','10000','10000','10001','01110'],
  'D': ['11100','10010','10001','10001','10001','10010','11100'],
  'E': ['11111','10000','10000','11110','10000','10000','11111'],
  'F': ['11111','10000','10000','11110','10000','10000','10000'],
  'G': ['01110','10001','10000','10111','10001','10001','01110'],
  'H': ['10001','10001','10001','11111','10001','10001','10001'],
  'I': ['01110','00100','00100','00100','00100','00100','01110'],
  'J': ['00001','00001','00001','00001','10001','10001','01110'],
  'K': ['10001','10010','10100','11000','10100','10010','10001'],
  'L': ['10000','10000','10000','10000','10000','10000','11111'],
  'M': ['10001','11011','10101','10101','10001','10001','10001'],
  'N': ['10001','11001','10101','10011','10001','10001','10001'],
  'O': ['01110','10001','10001','10001','10001','10001','01110'],
  'P': ['11110','10001','10001','11110','10000','10000','10000'],
  'Q': ['01110','10001','10001','10001','10101','10010','01101'],
  'R': ['11110','10001','10001','11110','10100','10010','10001'],
  'S': ['01111','10000','10000','01110','00001','00001','11110'],
  'T': ['11111','00100','00100','00100','00100','00100','00100'],
  'U': ['10001','10001','10001','10001','10001','10001','01110'],
  'V': ['10001','10001','10001','10001','10001','01010','00100'],
  'W': ['10001','10001','10001','10101','10101','11011','10001'],
  'X': ['10001','10001','01010','00100','01010','10001','10001'],
  'Y': ['10001','10001','01010','00100','00100','00100','00100'],
  'Z': ['11111','00001','00010','00100','01000','10000','11111']
};

function bmpWriteRGBA({ outPath, w, h, pixelsBGRA }) {
  // 32-bit BGRA BMP with BITMAPINFOHEADER, no compression.
  const fileHeaderSize = 14;
  const dibHeaderSize = 40;
  const pixelDataSize = w * h * 4;
  const fileSize = fileHeaderSize + dibHeaderSize + pixelDataSize;

  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER
  buf.write('BM', 0, 2, 'ascii');
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(fileHeaderSize + dibHeaderSize, 10);

  // BITMAPINFOHEADER
  buf.writeUInt32LE(dibHeaderSize, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22); // positive => bottom-up rows
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(32, 28);
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(pixelDataSize, 34);
  buf.writeInt32LE(2835, 38); // ~72 DPI
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // Pixel data: bottom-up
  const dstOffset = fileHeaderSize + dibHeaderSize;
  for (let y = 0; y < h; y++) {
    const srcY = h - 1 - y;
    const srcRow = srcY * w * 4;
    const dstRow = dstOffset + y * w * 4;
    pixelsBGRA.copy(buf, dstRow, srcRow, srcRow + w * 4);
  }

  fs.writeFileSync(outPath, buf);
}

function drawRect(pix, w, h, x0, y0, x1, y1, rgba) {
  const [r, g, b, a] = rgba;
  const xx0 = Math.max(0, Math.min(w, x0));
  const yy0 = Math.max(0, Math.min(h, y0));
  const xx1 = Math.max(0, Math.min(w, x1));
  const yy1 = Math.max(0, Math.min(h, y1));
  for (let y = yy0; y < yy1; y++) {
    for (let x = xx0; x < xx1; x++) {
      const i = (y * w + x) * 4;
      // alpha blend over existing
      const oa = pix[i + 3] / 255;
      const na = a / 255;
      const outA = na + oa * (1 - na);
      if (outA <= 0) continue;
      const ob = pix[i + 0];
      const og = pix[i + 1];
      const or = pix[i + 2];
      const outR = Math.round((r * na + or * oa * (1 - na)) / outA);
      const outG = Math.round((g * na + og * oa * (1 - na)) / outA);
      const outB = Math.round((b * na + ob * oa * (1 - na)) / outA);
      pix[i + 0] = outB;
      pix[i + 1] = outG;
      pix[i + 2] = outR;
      pix[i + 3] = Math.round(outA * 255);
    }
  }
}

function drawChar(pix, w, h, x, y, ch, scale, rgba) {
  const glyph = FONT_5X7[ch] || FONT_5X7['?'];
  for (let gy = 0; gy < 7; gy++) {
    const row = glyph[gy];
    for (let gx = 0; gx < 5; gx++) {
      if (row[gx] !== '1') continue;
      drawRect(pix, w, h, x + gx * scale, y + gy * scale, x + (gx + 1) * scale, y + (gy + 1) * scale, rgba);
    }
  }
}

function drawTextLine(pix, w, h, x, y, text, scale, rgba, letterSpacing) {
  let cx = x;
  const s = String(text).toUpperCase();
  for (const ch of s) {
    drawChar(pix, w, h, cx, y, ch, scale, rgba);
    cx += 5 * scale + letterSpacing;
  }
  return cx - x;
}

function ensureOverlayBMP(outputDir, { w, h, title, tagline }) {
  const ovDir = path.join(outputDir, '_overlays');
  ensureDir(ovDir);
  const safe = `${w}x${h}-${(title + '-' + tagline).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`;
  const outPath = path.join(ovDir, `overlay-${safe}.bmp`);
  if (fs.existsSync(outPath)) return outPath;

  const pix = Buffer.alloc(w * h * 4, 0); // BGRA, start fully transparent

  const pad = Math.round(h * 0.04);
  const boxH = Math.round(h * 0.20);
  const x0 = pad;
  const y0 = pad;
  const x1 = w - pad;
  const y1 = pad + boxH;
  drawRect(pix, w, h, x0, y0, x1, y1, [0, 0, 0, 110]);

  const scaleTitle = Math.max(2, Math.round(h / 220));
  const scaleTag = Math.max(2, Math.round(h / 300));
  const spacing = Math.max(1, Math.round(scaleTitle / 2));

  const titleText = String(title).toUpperCase();
  const tagText = String(tagline).toUpperCase();

  const titleW = titleText.length * (5 * scaleTitle + spacing) - spacing;
  const tagW = tagText.length * (5 * scaleTag + Math.max(1, Math.round(scaleTag / 2))) - Math.max(1, Math.round(scaleTag / 2));

  const tx = Math.max(x0 + pad, Math.round((w - titleW) / 2));
  const ty = y0 + Math.round(boxH * 0.18);
  drawTextLine(pix, w, h, tx, ty, titleText, scaleTitle, [255, 255, 255, 255], spacing);

  const tagSpacing = Math.max(1, Math.round(scaleTag / 2));
  const tx2 = Math.max(x0 + pad, Math.round((w - tagW) / 2));
  const ty2 = ty + 7 * scaleTitle + Math.round(h * 0.015);
  drawTextLine(pix, w, h, tx2, ty2, tagText, scaleTag, [255, 255, 255, 235], tagSpacing);

  bmpWriteRGBA({ outPath, w, h, pixelsBGRA: pix });
  return outPath;
}

function buildFilterComplex({ inputsCount, w, h, overlayIndex }) {
  const frames = SLIDE_DUR_SEC * FPS;
  const slideDur = SLIDE_DUR_SEC;
  const transDur = TRANS_DUR_SEC;

  const parts = [];

  // Per-input slide prep
  for (let i = 0; i < inputsCount; i++) {
    // zoompan: subtle zoom in (max 1.08). Centered.
    // Note: zoompan requires fps and output size.
    parts.push(
      `[${i}:v]` +
        `scale=${w}:${h}:force_original_aspect_ratio=increase,` +
        `crop=${w}:${h},` +
        `zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${FPS},` +
        `setsar=1,format=rgba` +
        `[v${i}]`
    );
  }

  // Chain xfades
  let last = `[v0]`;
  for (let i = 1; i < inputsCount; i++) {
    const offset = (slideDur - transDur) * i;
    const out = `[vx${i}]`;
    parts.push(`${last}[v${i}]xfade=transition=fade:duration=${transDur}:offset=${offset}${out}`);
    last = out;
  }

  // Overlay (pre-rendered RGBA BMP) + final pixel format
  parts.push(
    `[${overlayIndex}:v]format=rgba[ov]`
  );
  parts.push(
    `${last}[ov]overlay=0:0:format=auto,format=yuv420p[vout]`
  );

  return parts.join(';');
}

function makeVideo({ ffmpeg, inputs, outPath, w, h, app, outputDir }) {
  const totalDur = inputs.length * SLIDE_DUR_SEC - (inputs.length - 1) * TRANS_DUR_SEC;

  const overlayBmp = ensureOverlayBMP(outputDir, {
    w,
    h,
    title: app.name,
    tagline: app.tagline
  });

  const inputsArgs = [];
  for (const p of inputs) {
    // -loop 1 creates an infinite stream; cap with -t.
    inputsArgs.push('-loop', '1', '-t', String(SLIDE_DUR_SEC), '-i', p);
  }
  // overlay input lasts full duration
  inputsArgs.push('-loop', '1', '-t', String(totalDur), '-i', overlayBmp);

  const filter = buildFilterComplex({
    inputsCount: inputs.length,
    w,
    h,
    overlayIndex: inputs.length
  });

  const args = [
    '-y',
    ...inputsArgs,
    '-filter_complex',
    filter,
    '-map',
    '[vout]',
    '-t',
    String(totalDur),
    '-r',
    String(FPS),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-level',
    '4.1',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-movflags',
    '+faststart',
    outPath
  ];

  console.log(`\n▶ ffmpeg ${w}x${h} → ${outPath}`);
  run(ffmpeg, args);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 40).join('\n'));
    process.exit(0);
  }

  const ffmpeg = which('ffmpeg');
  if (!ffmpeg) {
    console.error('FFmpeg not found. Install ffmpeg and ensure it is on PATH.');
    console.error('On macOS (Homebrew): brew install ffmpeg');
    process.exit(1);
  }

  const app = loadAppConfig(args.app);

  const screenshotsDir = path.resolve(ROOT, args.screenshots || path.join('public', 'screenshots'));
  const outputDir = path.resolve(ROOT, args.output || 'output');
  ensureDir(outputDir);

  let shots = listScreenshots(screenshotsDir);
  if (shots.length === 0) {
    console.warn(`No screenshots found in ${screenshotsDir}. Generating placeholders...`);
    shots = ensurePlaceholders(outputDir, Math.max(MIN_SLIDES, 3));
  }

  shots = shots.slice(0, MAX_SLIDES);
  if (shots.length < MIN_SLIDES) {
    // pad with placeholders
    const need = MIN_SLIDES - shots.length;
    const placeholders = ensurePlaceholders(outputDir, MIN_SLIDES);
    shots = shots.concat(placeholders.slice(0, need));
  }

  console.log(`App: ${app.name} — ${app.tagline}`);
  console.log(`Using ${shots.length} slides:`);
  for (const s of shots) console.log(`  - ${path.relative(ROOT, s)}`);

  makeVideo({
    ffmpeg,
    inputs: shots,
    outPath: path.join(outputDir, 'promo-landscape.mp4'),
    w: 1920,
    h: 1080,
    app,
    outputDir
  });

  makeVideo({
    ffmpeg,
    inputs: shots,
    outPath: path.join(outputDir, 'promo-square.mp4'),
    w: 1080,
    h: 1080,
    app,
    outputDir
  });

  makeVideo({
    ffmpeg,
    inputs: shots,
    outPath: path.join(outputDir, 'promo-vertical.mp4'),
    w: 1080,
    h: 1920,
    app,
    outputDir
  });

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
