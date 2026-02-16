import { NextRequest, NextResponse } from 'next/server';

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

interface EnhanceRequest {
  text: string;
  tone: Tone;
  context: string;
}

const VALID_TONES: Tone[] = ['professional', 'casual', 'bold', 'minimal'];

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  professional:
    'Polished, credible, authoritative. Use clear language, benefits-focused, confident but not over-the-top.',
  casual:
    'Friendly, conversational, approachable. Write like a knowledgeable friend recommending something. Contractions OK, light humour OK.',
  bold:
    'Punchy, high-energy, attention-grabbing. Short sentences. Strong verbs. No filler. Make every word hit. Think Nike/Apple ad copy.',
  minimal:
    'Ultra-concise. Strip to essentials. Maximum impact, minimum words. No fluff, no adjectives unless they earn their place. Haiku-like brevity.',
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<EnhanceRequest>;

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "text" field' },
        { status: 400 }
      );
    }

    const tone: Tone = body.tone && VALID_TONES.includes(body.tone) ? body.tone : 'professional';
    const context = typeof body.context === 'string' ? body.context : '';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const toneGuide = TONE_DESCRIPTIONS[tone];
    const systemPrompt = `You are an expert marketing copywriter. Rewrite the following marketing copy to match this tone:

TONE: ${tone}
GUIDE: ${toneGuide}

${context ? `APP CONTEXT: ${context}` : ''}

Rules:
- Return ONLY the improved copy, nothing else.
- No quotes around the output.
- Keep the core message but transform the voice.
- Each tone should feel distinctly different from the others.`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: body.text }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();

    const enhanced =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!enhanced || typeof enhanced !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ enhanced: enhanced.trim() });
  } catch (err) {
    console.error('enhance-copy error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
