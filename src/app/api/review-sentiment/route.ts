import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';

type Review = {
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
};

type SentimentResult = {
  sentiment: { positive: number; neutral: number; negative: number };
  themes: Array<{ topic: string; count: number; sentiment: 'positive' | 'neutral' | 'negative' }>
  summary: string;
};

function safeJsonParse(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Model returned invalid JSON');
    return JSON.parse(m[0]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const reviews = Array.isArray(body.reviews) ? (body.reviews as Review[]) : [];

    if (!planId) return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    if (!reviews.length) return NextResponse.json({ error: 'Missing "reviews"' }, { status: 400 });

    const row = getPlan(planId);
    if (!row) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const config = JSON.parse(row.config || '{}');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a product marketing analyst.

Analyze the sentiment and themes in these App Store reviews.

Output MUST be valid JSON in exactly this shape:
{
  "sentiment": { "positive": 0, "neutral": 0, "negative": 0 },
  "themes": [
    { "topic": "topic label", "count": 0, "sentiment": "positive" }
  ],
  "summary": "2-4 sentences"
}

Rules:
- positive/neutral/negative are percentages that sum to 100 (integers).
- themes: 5-10 themes max. topic should be short (2-5 words). count is the number of reviews mentioning it.
- sentiment for each theme is one of: positive|neutral|negative.
- summary should be plain English, concrete, and reference what users actually said.
- Do NOT output markdown. JSON only.`;

    const userContent = `APP: ${config?.app_name || 'Unknown'}\n\nREVIEWS (JSON):\n${JSON.stringify(
      reviews.slice(0, 40).map((r) => ({
        author: r.author,
        rating: r.rating,
        title: r.title,
        body: r.body,
        date: r.date,
      })),
      null,
      2
    )}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
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
      return NextResponse.json({ error: 'Unexpected response from Gemini.' }, { status: 502 });
    }

    const parsed = safeJsonParse(text) as SentimentResult;

    // Basic sanity
    const sentiment = parsed?.sentiment;
    const themes = Array.isArray(parsed?.themes) ? parsed.themes : [];
    const summary = typeof parsed?.summary === 'string' ? parsed.summary : '';

    const result: SentimentResult = {
      sentiment: {
        positive: Number.isFinite(sentiment?.positive) ? Math.round(sentiment.positive) : 0,
        neutral: Number.isFinite(sentiment?.neutral) ? Math.round(sentiment.neutral) : 0,
        negative: Number.isFinite(sentiment?.negative) ? Math.round(sentiment.negative) : 0,
      },
      themes: themes
        .filter(Boolean)
        .slice(0, 10)
        .map((t: any) => ({
          topic: typeof t.topic === 'string' ? t.topic : 'Theme',
          count: Number.isFinite(Number(t.count)) ? Number(t.count) : 0,
          sentiment:
            t.sentiment === 'positive' || t.sentiment === 'neutral' || t.sentiment === 'negative'
              ? t.sentiment
              : 'neutral',
        })),
      summary,
    };

    // Persist to plan_content
    saveContent(planId, 'review-sentiment', null, JSON.stringify({
      ...result,
      metadata: {
        model: 'gemini-2.5-flash',
        reviewCount: reviews.length,
        generatedAt: new Date().toISOString(),
      },
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('review-sentiment error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
