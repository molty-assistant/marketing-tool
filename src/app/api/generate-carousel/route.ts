import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 180;

const IMAGES_DIR = process.env.IMAGE_DIR || '/app/data/images';
const KIE_API_BASE = 'https://api.kie.ai/api/v1/jobs';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

type SlideType = 'hero' | 'feature' | 'cta';

interface SlideSpec {
  index: number;
  type: SlideType;
  headline: string;
  subtext: string;
}

interface CarouselConcept {
  concept: string;
  caption: string;
  hashtags: string[];
  slides: SlideSpec[];
}

interface CarouselSlide {
  index: number;
  type: SlideType;
  headline: string;
  subtext: string;
  publicUrl: string;
  filename: string;
}

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || '';
}

function getKieKey() {
  return process.env.KIE_API_KEY || '';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureImagesDir() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

function saveImageBuffer(buffer: Buffer): { filename: string; publicUrl: string } {
  ensureImagesDir();
  const filename = `${crypto.randomUUID()}.png`;
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
  return { filename, publicUrl: `/api/images/${filename}` };
}

function sanitizeAccentColor(color: unknown): string {
  if (typeof color === 'string' && HEX_COLOR_RE.test(color)) return color;
  return '#667eea';
}

// ── Gemini: generate carousel concept ──────────────────────────────────────

async function generateCarouselConcept(params: {
  appName: string;
  oneLiner: string;
  category: string;
  features: string[];
  description: string;
  mode: string;
  direction: string;
  slideCount: number;
}): Promise<CarouselConcept> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const systemPrompt = `You are a social media carousel strategist for Instagram. Create a carousel concept for the given app/product.

Output MUST be valid JSON matching this exact schema:
{
  "concept": "Short description of the carousel theme",
  "caption": "Instagram caption for the carousel post (150-300 chars, engaging, with line breaks)",
  "hashtags": ["tag1", "tag2", ...],
  "slides": [
    { "index": 0, "type": "hero", "headline": "Scroll-stopping headline (3-6 words)", "subtext": "Compelling subtitle (8-15 words)" },
    { "index": 1, "type": "feature", "headline": "Feature name (2-4 words)", "subtext": "Benefit description (10-20 words)" },
    ...
    { "index": N, "type": "cta", "headline": "Call to action (2-4 words)", "subtext": "Action description (5-10 words)" }
  ]
}

Rules:
- Generate exactly ${params.slideCount} slides.
- First slide MUST be type "hero" (the scroll-stopper).
- Last slide MUST be type "cta" with a clear call-to-action.
- Middle slides are type "feature" — each highlights a different benefit or feature.
- Headlines must be punchy, bold, and concise.
- Subtexts must be informative but brief.
- 15-25 hashtags, relevant to the app and its category.
- Caption should hook the reader and encourage them to swipe.
- Do NOT fabricate features not mentioned in the input.
- Do NOT include HTML tags, script tags, or special characters in headlines/subtexts.`;

  const userContent = `App: ${params.appName}
One-liner: ${params.oneLiner}
Category: ${params.category}
Features: ${params.features.join(', ')}
Description: ${params.description.slice(0, 1000)}
Mode: ${params.mode}
${params.direction ? `User direction: ${params.direction}` : ''}

Generate a ${params.slideCount}-slide Instagram carousel concept. Return JSON only.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Gemini carousel error:', res.status, text.slice(0, 300));
    throw new Error(`Failed to generate carousel concept (${res.status})`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  let parsed: CarouselConcept;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid JSON from Gemini');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error('Gemini returned no slides');
  }

  return parsed;
}

// ── Nano Banana Pro: generate hero image ───────────────────────────────────

async function generateHeroImage(params: {
  headline: string;
  subtext: string;
  appName: string;
  accentColor: string;
}): Promise<Buffer> {
  const apiKey = getKieKey();
  if (!apiKey) throw new Error('KIE_API_KEY is not set');

  const prompt = [
    `Create a bold, eye-catching Instagram carousel cover image with native text rendering.`,
    `Include the exact text "${params.headline}" prominently as the main headline.`,
    `Subtitle text: "${params.subtext}"`,
    `Style: modern, vibrant, professional marketing material.`,
    `Color theme: ${params.accentColor} as accent with complementary dark/neutral tones.`,
    `Composition: centered text layout, strong visual hierarchy, clean negative space.`,
    `Hard constraints:`,
    `- No UI elements, phone mockups, or screenshots.`,
    `- No people or faces.`,
    `- Background should be atmospheric and brand-consistent.`,
    `- 4:5 aspect ratio (Instagram carousel).`,
    `Style: cinematic, high detail, modern graphic design, 4k quality.`,
  ].join('\n');

  const createRes = await fetch(`${KIE_API_BASE}/createTask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'nano-banana-pro',
      input: {
        prompt,
        aspect_ratio: '4:5',
        resolution: '1K',
        output_format: 'png',
      },
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => '');
    throw new Error(`Nano Banana Pro task failed (${createRes.status}): ${text.slice(0, 300)}`);
  }

  const createJson = await createRes.json();
  const taskId = createJson?.data?.taskId;
  if (!taskId) throw new Error('No taskId from Kie.ai');

  // Poll for completion
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const pollRes = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) continue;

    const pollJson = await pollRes.json();
    const state = pollJson?.data?.state;

    if (state === 'success') {
      const resultJson = pollJson?.data?.resultJson;
      if (!resultJson) throw new Error('Empty resultJson');

      let parsed;
      try {
        parsed = JSON.parse(resultJson);
      } catch {
        throw new Error('Kie.ai returned invalid JSON in resultJson');
      }

      const url = parsed?.resultUrls?.[0];
      if (!url) throw new Error('No resultUrls');

      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error('Failed to download hero image');
      return Buffer.from(await imgRes.arrayBuffer());
    }

    if (state === 'fail') {
      throw new Error(`Hero generation failed: ${pollJson?.data?.failMsg || 'Unknown'}`);
    }
  }

  throw new Error('Hero image generation timed out');
}

// ── Playwright: render feature/CTA slides ──────────────────────────────────

function buildSlideHtml(params: {
  headline: string;
  subtext: string;
  type: SlideType;
  index: number;
  totalSlides: number;
  appName: string;
  accentColor: string;
}): string {
  const headline = escapeHtml(params.headline);
  const subtext = escapeHtml(params.subtext);
  const appName = escapeHtml(params.appName);
  const { type, index, totalSlides, accentColor } = params;

  // Darken accent for gradient
  const r = parseInt(accentColor.slice(1, 3), 16);
  const g = parseInt(accentColor.slice(3, 5), 16);
  const b = parseInt(accentColor.slice(5, 7), 16);
  const darker = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;

  const dotIndicators = Array.from({ length: totalSlides }, (_, i) =>
    `<div style="width: ${i === index ? 24 : 10}px; height: 10px; border-radius: 5px; background: ${i === index ? (type === 'cta' ? 'white' : accentColor) : (type === 'cta' ? 'rgba(255,255,255,0.35)' : accentColor + '35')}; transition: width 0.3s;"></div>`
  ).join('');

  if (type === 'cta') {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  body { font-family: 'Inter', system-ui, sans-serif; }
</style></head>
<body>
<div style="width: 1080px; height: 1350px; background: linear-gradient(160deg, ${accentColor}, ${darker}); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 80px; position: relative;">
  <div style="position: absolute; top: 60px; left: 60px; font-size: 22px; color: rgba(255,255,255,0.5); font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">
    ${appName}
  </div>
  <div style="font-size: 76px; font-weight: 800; color: white; text-align: center; line-height: 1.15; margin-bottom: 32px; max-width: 900px;">
    ${headline}
  </div>
  <div style="font-size: 34px; color: rgba(255,255,255,0.85); text-align: center; line-height: 1.5; max-width: 780px; margin-bottom: 60px;">
    ${subtext}
  </div>
  <div style="padding: 24px 64px; background: white; border-radius: 20px; font-size: 34px; font-weight: 700; color: ${accentColor}; box-shadow: 0 8px 32px rgba(0,0,0,0.15);">
    Get Started &rarr;
  </div>
  <div style="position: absolute; bottom: 50px; display: flex; gap: 10px;">
    ${dotIndicators}
  </div>
</div>
</body></html>`;
  }

  // Feature slide
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  body { font-family: 'Inter', system-ui, sans-serif; }
</style></head>
<body>
<div style="width: 1080px; height: 1350px; background: linear-gradient(160deg, ${accentColor}15, ${accentColor}30); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 80px; position: relative;">
  <div style="position: absolute; top: 60px; left: 60px; display: flex; align-items: center; gap: 14px;">
    <div style="font-size: 22px; color: ${accentColor}; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">
      ${appName}
    </div>
  </div>
  <div style="width: 80px; height: 80px; border-radius: 20px; background: ${accentColor}; display: flex; align-items: center; justify-content: center; margin-bottom: 40px; box-shadow: 0 8px 24px ${accentColor}40;">
    <div style="font-size: 40px; font-weight: 800; color: white;">${index}</div>
  </div>
  <div style="font-size: 68px; font-weight: 800; color: #1a1a2e; text-align: center; line-height: 1.2; margin-bottom: 28px; max-width: 900px;">
    ${headline}
  </div>
  <div style="font-size: 32px; color: #4a4a6a; text-align: center; line-height: 1.6; max-width: 780px;">
    ${subtext}
  </div>
  <div style="position: absolute; bottom: 50px; display: flex; gap: 10px;">
    ${dotIndicators}
  </div>
</div>
</body></html>`;
}

async function renderSlideViaPlaywright(
  html: string,
  internalBase: string
): Promise<Buffer> {
  const res = await fetch(`${internalBase}/api/render-png`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.API_KEY || '',
    },
    body: JSON.stringify({ html, width: 1080, height: 1350 }),
  });

  if (!res.ok) {
    throw new Error(`render-png failed (${res.status})`);
  }

  return Buffer.from(await res.arrayBuffer());
}

// ── Main endpoint ──────────────────────────────────────────────────────────

/**
 * POST /api/generate-carousel
 * Body: { planId, mode?: 'auto'|'guided'|'manual', direction?: string, slideCount?: number }
 * Returns: { slides: CarouselSlide[], caption, hashtags, concept }
 */
export async function POST(request: NextRequest) {
  // Rate limit: expensive endpoint (Gemini + Kie.ai + N Playwright renders)
  const rateLimited = guardApiRoute(request, { maxRequests: 5, windowSeconds: 300 });
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json().catch(() => ({}));
    const planId = typeof body?.planId === 'string' ? body.planId : '';
    const mode = (['auto', 'guided', 'manual'].includes(body?.mode) ? body.mode : 'auto') as string;
    const direction = typeof body?.direction === 'string' ? body.direction.trim() : '';
    const slideCount = Math.max(3, Math.min(10, Number(body?.slideCount) || 5));

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const appName = config.app_name || scraped.name || 'App';
    const oneLiner = config.one_liner || scraped.shortDescription || '';
    const category = config.category || scraped.category || '';
    const description = scraped.description || scraped.appDescription || '';
    const features = Array.isArray(config.differentiators)
      ? config.differentiators
      : Array.isArray(scraped.features)
        ? scraped.features
        : [];
    const accentColor = sanitizeAccentColor(config.accent_color);

    // 1. Generate carousel concept via Gemini
    const concept = await generateCarouselConcept({
      appName,
      oneLiner,
      category,
      features: features.slice(0, 10),
      description,
      mode,
      direction,
      slideCount,
    });

    // Ensure slides are in order and clamp to requested count
    const slides = concept.slides
      .sort((a, b) => a.index - b.index)
      .slice(0, slideCount);

    const totalSlides = slides.length;
    const internalBase = `http://localhost:${process.env.PORT || 3000}`;
    const resultSlides: CarouselSlide[] = [];

    // 2. Generate each slide image
    for (const slide of slides) {
      let imageBuffer: Buffer;

      if (slide.type === 'hero') {
        // Hero slide: Nano Banana Pro for high-quality AI image
        try {
          imageBuffer = await generateHeroImage({
            headline: slide.headline,
            subtext: slide.subtext,
            appName,
            accentColor,
          });
        } catch (heroErr) {
          // Fallback to Playwright-rendered hero if Nano Banana Pro fails
          console.warn('Hero generation failed, falling back to template:', heroErr);
          const html = buildSlideHtml({
            headline: slide.headline,
            subtext: slide.subtext,
            type: 'hero',
            index: slide.index,
            totalSlides,
            appName,
            accentColor,
          });
          imageBuffer = await renderSlideViaPlaywright(html, internalBase);
        }
      } else {
        // Feature / CTA slides: Playwright-rendered templates
        const html = buildSlideHtml({
          headline: slide.headline,
          subtext: slide.subtext,
          type: slide.type,
          index: slide.index,
          totalSlides,
          appName,
          accentColor,
        });
        imageBuffer = await renderSlideViaPlaywright(html, internalBase);
      }

      const saved = saveImageBuffer(imageBuffer);
      resultSlides.push({
        index: slide.index,
        type: slide.type,
        headline: slide.headline,
        subtext: slide.subtext,
        ...saved,
      });
    }

    return NextResponse.json({
      concept: concept.concept,
      caption: concept.caption || '',
      hashtags: Array.isArray(concept.hashtags) ? concept.hashtags : [],
      slides: resultSlides,
    });
  } catch (err) {
    console.error('generate-carousel error:', err);
    return NextResponse.json({ error: 'Carousel generation failed' }, { status: 500 });
  }
}
