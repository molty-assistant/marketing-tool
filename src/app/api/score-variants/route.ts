import { NextRequest, NextResponse } from 'next/server';

interface VariantScore {
  variant: string;
  scores: {
    clarity: number;
    persuasion: number;
    seo_strength: number;
    emotional_appeal: number;
    overall: number;
  };
  reasoning: string;
}

interface ScoreResponse {
  results: VariantScore[];
  winner: number;
  winner_reasoning: string;
}

function extractJson(text: string): ScoreResponse | null {
  const trimmed = text.trim();
  // Try direct parse
  try {
    return JSON.parse(trimmed) as ScoreResponse;
  } catch {
    // fallthrough
  }
  // Try extracting first { ... }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as ScoreResponse;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, variants } = body as { planId?: string; variants?: string[] };

    if (!planId || typeof planId !== 'string') {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }
    if (!Array.isArray(variants) || variants.length === 0 || !variants.every((v: unknown) => typeof v === 'string' && v.trim().length > 0)) {
      return NextResponse.json({ error: 'variants must be a non-empty array of strings' }, { status: 400 });
    }
    if (variants.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 variants allowed' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const variantList = variants.map((v, i) => `Variant ${i + 1}:\n"""${v}"""`).join('\n\n');

    const systemPrompt = `You are an expert marketing copy analyst. Score each variant on 5 dimensions (1-10 scale):
- clarity: How clear and easy to understand
- persuasion: How compelling and action-driving
- seo_strength: How well optimized for search engines
- emotional_appeal: How well it connects emotionally
- overall: Overall effectiveness

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "results": [
    {
      "variant": "<the variant text>",
      "scores": { "clarity": N, "persuasion": N, "seo_strength": N, "emotional_appeal": N, "overall": N },
      "reasoning": "<brief explanation>"
    }
  ],
  "winner": <1-based index of best variant>,
  "winner_reasoning": "<why this variant wins>"
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: `Score these marketing copy variants:\n\n${variantList}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    }).finally(() => clearTimeout(timeout));

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json({ error: `Gemini API error (${geminiResponse.status})` }, { status: 502 });
    }

    const data = await geminiResponse.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'Unexpected Gemini response' }, { status: 502 });
    }

    const parsed = extractJson(rawText);
    if (!parsed || !Array.isArray(parsed.results)) {
      console.error('Could not parse score JSON:', rawText.slice(0, 500));
      return NextResponse.json({ error: 'Failed to parse scoring response' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    console.error('score-variants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
