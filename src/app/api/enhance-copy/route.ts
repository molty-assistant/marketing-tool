import { NextRequest, NextResponse } from 'next/server';

type Tone = 'professional' | 'casual' | 'technical' | 'enthusiastic';

interface EnhanceRequest {
  text: string;
  tone: Tone;
  context: string;
}

const VALID_TONES: Tone[] = ['professional', 'casual', 'technical', 'enthusiastic'];

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

    const systemPrompt = `You are a marketing copywriter. Rewrite the following marketing copy to sound more natural, human, and engaging. Tone: ${tone}. Context about the app: ${context}. Return ONLY the improved copy, nothing else.`;

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
