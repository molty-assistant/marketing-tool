import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * POST /api/generate-hero-bg
 *
 * Body:
 * {
 *   imageBrief: { hook, scene, subject, mood, palette, composition, avoid[] },
 *   aspectRatio?: "1:1" | "4:5" | "9:16" | "16:9",
 *   publicBase?: string
 * }
 *
 * Generates a background image (PNG) using Nano Banana Pro via Kie.ai
 * and saves it to the configured images directory.
 */

const KIE_API_BASE = 'https://api.kie.ai/api/v1/jobs';
const IMAGES_DIR = process.env.IMAGE_DIR || '/app/data/images';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // 3s * 60 = 180s max wait

type ImageBrief = {
  hook?: string;
  scene?: string;
  subject?: string;
  mood?: string;
  palette?: string;
  composition?: string;
  textOverlay?: string;
  avoid?: string[];
};

function getApiKey() {
  const key = process.env.KIE_API_KEY || '';
  return key;
}

function safeLine(label: string, value: unknown) {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? `${label}: ${s}` : '';
}

function buildImagePrompt(brief: ImageBrief) {
  const avoid = Array.isArray(brief.avoid)
    ? brief.avoid.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
    : [];

  const lines = [
    'Create a high-quality image for a social post with strong native text rendering.',
    safeLine('Scene', brief.scene),
    safeLine('Subject', brief.subject),
    safeLine('Mood', brief.mood),
    safeLine('Color palette', brief.palette),
    safeLine('Composition', brief.composition),
    brief.hook ? `Creative intent: evoke the hook "${brief.hook.trim()}"` : '',
    brief.textOverlay ? `Include the exact text overlay: "${brief.textOverlay}" prominently in the design.` : '',
    avoid.length ? `Avoid: ${avoid.join('; ')}.` : '',
    'Hard constraints:',
    '- No UI elements, app screens, frames, phone mockups.',
    '- Do not include people or faces.',
    '- Background should have clear negative space for overlaid text.',
    'Style: modern, cinematic, tasteful, realistic lighting, high detail, sharp, 4k.',
  ].filter(Boolean);

  return lines.join('\n');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollForResult(taskId: string, apiKey: string): Promise<{ url: string } | { error: string }> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const res = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return { error: `Poll failed (${res.status})` };
    }

    const json = await res.json();
    const state = json?.data?.state;

    if (state === 'success') {
      const resultJson = json?.data?.resultJson;
      if (!resultJson) return { error: 'Task succeeded but resultJson is empty' };
      const parsed = JSON.parse(resultJson);
      const url = parsed?.resultUrls?.[0];
      if (!url) return { error: 'Task succeeded but no resultUrls found' };
      return { url };
    }

    if (state === 'fail') {
      const msg = json?.data?.failMsg || 'Unknown error';
      return { error: `Image generation failed: ${msg}` };
    }

    // still waiting/queuing/generating — continue polling
  }

  return { error: 'Image generation timed out' };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'KIE_API_KEY is not set' }, { status: 500 });
    }

    const body = await request.json();
    const imageBrief = (body?.imageBrief || null) as ImageBrief | null;
    const aspectRatio = (['1:1', '4:5', '9:16', '16:9'].includes(body?.aspectRatio) ? body.aspectRatio : '1:1') as string;
    const baseUrl = (body?.publicBase as string | undefined) || request.nextUrl.origin;

    if (!imageBrief) {
      return NextResponse.json({ error: 'Missing imageBrief' }, { status: 400 });
    }

    const prompt = buildImagePrompt(imageBrief);

    // Create task via Kie.ai
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
          aspect_ratio: aspectRatio,
          resolution: '1K',
          output_format: 'png',
        },
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '');
      return NextResponse.json(
        { error: 'Nano Banana Pro task creation failed', status: createRes.status, details: text.slice(0, 2000) },
        { status: 502 }
      );
    }

    const createJson = await createRes.json();
    const taskId = createJson?.data?.taskId;

    if (!taskId) {
      return NextResponse.json(
        { error: 'No taskId returned from Kie.ai', details: JSON.stringify(createJson).slice(0, 2000) },
        { status: 502 }
      );
    }

    // Poll until complete
    const result = await pollForResult(taskId, apiKey);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // Download the image from the result URL and save locally
    const imageRes = await fetch(result.url);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to download generated image' }, { status: 502 });
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    const filename = `${crypto.randomUUID()}.png`;
    const filePath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filePath, imageBuffer);

    const publicUrl = `/api/images/${filename}`;

    return NextResponse.json({
      publicUrl,
      fullPublicUrl: `${baseUrl}${publicUrl}`,
      prompt,
    });
  } catch (err) {
    console.error('generate-hero-bg error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
