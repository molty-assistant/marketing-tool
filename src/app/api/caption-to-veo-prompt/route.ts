import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    // Prefer env vars when set; fallback to repo key per project instruction.
    (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')
  );
}

/**
 * POST /api/caption-to-veo-prompt
 * Body: { caption: string }
 * Returns: { prompt: string }
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
      'You are an expert at writing Veo 2 video generation prompts. Given a social media post caption, write a single cinematic video prompt. Rules: one focused scene, specify shot type (close-up/wide/medium), specify camera movement (dolly in/pan/crane), specify lighting and mood, under 100 words, no quotation marks around text.';

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
      console.error('caption-to-veo-prompt Gemini error:', res.status, text);
      return NextResponse.json({ error: 'Failed to generate Veo prompt' }, { status: 502 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
      }
      parsed = JSON.parse(match[0]);
    }

    const prompt = (parsed as { prompt?: unknown })?.prompt;
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'AI response missing prompt' }, { status: 502 });
    }

    return NextResponse.json({ prompt: prompt.trim() });
  } catch (err) {
    console.error('caption-to-veo-prompt error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
