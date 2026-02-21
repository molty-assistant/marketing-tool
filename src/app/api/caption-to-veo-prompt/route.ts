import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

type CandidatePart = { text?: unknown };

/**
 * POST /api/caption-to-video-prompt
 * Body: { caption: string }
 * Returns: { prompt: string }
 *
 * Uses Gemini to convert a social media caption into a Kling 3.0 video prompt.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { caption?: string };
    const caption = typeof body.caption === 'string' ? body.caption.trim() : '';

    if (!caption) {
      return NextResponse.json({ error: 'Missing caption' }, { status: 400 });
    }

    const apiKey = getApiKey();

    const system =
      'You are an expert at writing Kling 3.0 video generation prompts. Given a social media post caption, write a single cinematic video prompt. Rules: one focused scene, specify shot type (close-up/wide/medium), specify camera movement (dolly in/pan/crane), specify lighting and mood, be descriptive (up to 200 words — Kling supports detailed prompts), no quotation marks. Return ONLY valid JSON with exactly this schema: {"prompt":"..."}.';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [
          {
            parts: [
              {
                text: `Caption:\n${caption}\n\nReturn JSON only with schema: {\"prompt\": \"...\"}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('caption-to-video-prompt Gemini error:', res.status, text);
      return NextResponse.json({ error: 'Failed to generate video prompt' }, { status: 502 });
    }

    const data = await res.json();

    const parts = data?.candidates?.[0]?.content?.parts as CandidatePart[] | undefined;
    const text = Array.isArray(parts)
      ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('\n').trim()
      : '';

    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    // We ask for JSON, but models sometimes return plain text or slightly different keys.
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = null;
        }
      }
    }

    const obj = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : null;
    const videoPrompt = obj?.videoPrompt;
    const veoPrompt = obj?.veoPrompt;
    const promptCandidate =
      (obj && typeof obj.prompt === 'string' && obj.prompt) ||
      (typeof videoPrompt === 'string' && videoPrompt) ||
      (typeof veoPrompt === 'string' && veoPrompt) ||
      (typeof parsed === 'string' ? parsed : '') ||
      '';

    // Final fallback: if the model ignored JSON but returned a short prompt, accept it.
    const prompt = (promptCandidate || text).trim();
    if (!prompt) {
      return NextResponse.json({ error: 'AI response missing prompt' }, { status: 502 });
    }

    return NextResponse.json({ prompt });
  } catch (err) {
    console.error('caption-to-video-prompt error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
