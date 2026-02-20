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
 *   aspectRatio?: "1:1" | "9:16",
 *   publicBase?: string
 * }
 *
 * Generates a background image (PNG) using Imagen 3 and saves it to /app/data/images.
 */

const IMAGES_DIR = process.env.IMAGE_DIR || '/app/data/images';

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

function safeLine(label: string, value: unknown) {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? `${label}: ${s}` : '';
}

function buildImagenPrompt(brief: ImageBrief) {
  const avoid = Array.isArray(brief.avoid)
    ? brief.avoid.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
    : [];

  const lines = [
    'Create a high-quality image for a social post. Nano Banana will render text perfectly.',
    safeLine('Scene', brief.scene),
    safeLine('Subject', brief.subject),
    safeLine('Mood', brief.mood),
    safeLine('Color palette', brief.palette),
    safeLine('Composition', brief.composition),
    brief.hook ? `Creative intent: evoke the hook "${brief.hook.trim()}"` : '',
    brief.textOverlay ? `Include the exact text overlay: "${brief.textOverlay}" prominently in the design.` : '',
    avoid.length ? `Avoid: ${avoid.join('; ')}.` : '',
    // Hard constraints
    'Hard constraints:',
    '- No UI elements, app screens, frames, phone mockups.',
    '- Do not include people or faces.',
    '- Background should have clear negative space for overlaid text.',
    'Style: modern, cinematic, tasteful, realistic lighting, high detail, sharp, 4k.',
  ].filter(Boolean);

  return lines.join('\n');
}

function extractBase64Png(payload: unknown): string | null {
  const data = payload as {
    predictions?: Array<{ bytesBase64Encoded?: string; image?: { bytesBase64Encoded?: string }; imageBytes?: string }>;
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
    output?: Array<{ data?: string }>;
  };
  // Imagen predict responses have varied shapes across versions; handle common cases.
  const p0 = data?.predictions?.[0];
  const candidates = [
    p0?.bytesBase64Encoded,
    p0?.image?.bytesBase64Encoded,
    p0?.imageBytes,
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data,
    data?.output?.[0]?.data,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 100) return c;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const body = await request.json();
    const imageBrief = (body?.imageBrief || null) as ImageBrief | null;
    const aspectRatio = (body?.aspectRatio === '9:16' ? '9:16' : '1:1') as '1:1' | '9:16';
    const baseUrl = (body?.publicBase as string | undefined) || request.nextUrl.origin;

    if (!imageBrief) {
      return NextResponse.json({ error: 'Missing imageBrief' }, { status: 400 });
    }

    const prompt = buildImagenPrompt(imageBrief);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/nano-banana:predict?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
          safetyFilterLevel: 'BLOCK_ONLY_HIGH',
          personGeneration: 'DONT_ALLOW',
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Imagen request failed', status: res.status, details: text.slice(0, 2000) },
        { status: 502 }
      );
    }

    const json = await res.json();
    const b64 = extractBase64Png(json);

    if (!b64) {
      return NextResponse.json(
        { error: 'No image returned from Imagen', details: JSON.stringify(json).slice(0, 2000) },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(b64, 'base64');

    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    const filename = `${crypto.randomUUID()}.png`;
    const filePath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filePath, buffer);

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
