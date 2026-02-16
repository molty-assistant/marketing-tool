import { NextRequest, NextResponse } from 'next/server';

type Review = {
  author?: string;
  rating?: number;
  title?: string;
  content?: string;
  date?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reviews = Array.isArray(body?.reviews) ? (body.reviews as Review[]) : null;

    if (!reviews) {
      return NextResponse.json({ error: 'Missing "reviews" (expected array)' }, { status: 400 });
    }

    if (reviews.length === 0) {
      return NextResponse.json(
        {
          analysis: {
            overallSentiment: 'neutral',
            summary: 'No reviews provided.',
            themes: { praise: [], complaints: [] },
            improvementSuggestions: [],
          },
          metadata: { model: 'gemini-2.0-flash' },
        },
        { status: 200 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a product analyst.\n\nAnalyse the provided App Store reviews and output STRICT JSON matching this exact shape:\n{\n  \"overallSentiment\": \"positive\" | \"neutral\" | \"negative\" | \"mixed\",\n  \"summary\": \"2-4 sentence executive summary\",\n  \"themes\": {\n    \"praise\": [\"short theme\", \"...\"],\n    \"complaints\": [\"short theme\", \"...\"]\n  },\n  \"improvementSuggestions\": [\n    { \"title\": \"short\", \"details\": \"1-2 sentences\", \"impact\": \"high\"|\"medium\"|\"low\" }\n  ]\n}\n\nRules:\n- Base everything ONLY on the supplied reviews.\n- Keep themes concise and non-overlapping.\n- Suggestions must be actionable and map to complaint themes.\n- Return valid JSON only. No markdown.`;

    const slimReviews = reviews.slice(0, 200).map((r) => ({
      rating: typeof r.rating === 'number' ? r.rating : undefined,
      title: typeof r.title === 'string' ? r.title : undefined,
      content: typeof r.content === 'string' ? r.content : undefined,
      date: typeof r.date === 'string' ? r.date : undefined,
    }));

    const userContent = `REVIEWS (most recent first):\n${JSON.stringify(slimReviews)}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
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
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: 'Unexpected response from Gemini. Please try again.' }, { status: 502 });
    }

    let parsed: unknown;
    try {
      const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
        }
      } else {
        return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
      }
    }

    return NextResponse.json({ analysis: parsed, metadata: { model: 'gemini-2.0-flash' } });
  } catch (err) {
    console.error('review-sentiment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
