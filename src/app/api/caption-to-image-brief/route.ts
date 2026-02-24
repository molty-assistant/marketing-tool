import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

type CandidatePart = { text?: unknown };

/**
 * POST /api/caption-to-image-brief
 * Body: { caption: string, platform?: "instagram"|"tiktok" }
 * Returns: {
 *   hook: string;
 *   scene: string;
 *   subject: string;
 *   mood: string;
 *   palette: string;
 *   composition: string;
 *   avoid: string[];
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      caption?: string;
      platform?: string;
    };

    const caption = typeof body.caption === 'string' ? body.caption.trim() : '';
    const platform = typeof body.platform === 'string' ? body.platform.trim() : 'instagram';

    if (!caption) {
      return NextResponse.json({ error: 'Missing caption' }, { status: 400 });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const system =
      'You are a senior creative director. Given a social post caption, extract ONE dominant visual hook and produce a concise image brief as JSON only. ' +
      'Return ONLY valid JSON with exactly this schema: {"hook":"...","scene":"...","subject":"...","mood":"...","palette":"...","composition":"...","textOverlay":"...","avoid":["...",...]}. ' +
      'Rules: Nano Banana supports strong native text rendering. You MUST include a concise "textOverlay" (3-5 words) that acts as the hook. ' +
      'Enforce strong brand consistency through the palette and mood. Avoid UI/screenshots/logos/watermarks.';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [
          {
            parts: [
              {
                text: `Platform: ${platform}\n\nCaption:\n${caption}\n\nReturn JSON only.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('caption-to-image-brief Gemini error:', res.status, text);
      return NextResponse.json({ error: 'Failed to generate image brief' }, { status: 502 });
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts as CandidatePart[] | undefined;
    const text = Array.isArray(parts)
      ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('\n').trim()
      : '';

    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let parsed: Record<string, unknown> | null = null;
    try {
      const maybe = JSON.parse(text) as unknown;
      parsed = maybe && typeof maybe === 'object' ? (maybe as Record<string, unknown>) : null;
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const maybe = JSON.parse(match[0]) as unknown;
        parsed = maybe && typeof maybe === 'object' ? (maybe as Record<string, unknown>) : null;
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
    }

    const brief = {
      hook: typeof parsed.hook === 'string' ? parsed.hook.trim() : '',
      scene: typeof parsed.scene === 'string' ? parsed.scene.trim() : '',
      subject: typeof parsed.subject === 'string' ? parsed.subject.trim() : '',
      mood: typeof parsed.mood === 'string' ? parsed.mood.trim() : '',
      palette: typeof parsed.palette === 'string' ? parsed.palette.trim() : '',
      composition: typeof parsed.composition === 'string' ? parsed.composition.trim() : '',
      textOverlay: typeof parsed.textOverlay === 'string' ? parsed.textOverlay.trim() : '',
      avoid: Array.isArray(parsed.avoid)
        ? parsed.avoid.filter((x: unknown): x is string => typeof x === 'string').map((s: string) => s.trim())
        : ['logos', 'UI', 'watermarks', 'screenshots'],
    };

    if (!brief.hook) {
      return NextResponse.json({ error: 'AI response missing hook' }, { status: 502 });
    }

    return NextResponse.json(brief);
  } catch (err) {
    console.error('caption-to-image-brief error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
