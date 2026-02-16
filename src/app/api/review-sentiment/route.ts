import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlanContent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body?.planId === 'string' ? body.planId : '';
    const reviews = Array.isArray(body?.reviews) ? body.reviews : null;

    if (!planId) return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    if (!reviews?.length) return NextResponse.json({ error: 'Missing "reviews" (non-empty array)' }, { status: 400 });

    const row = getPlan(planId);
    if (!row) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });

    const config = JSON.parse(row.config || '{}');

    const systemPrompt = `You are a product analyst.

Given recent App Store reviews for a product, analyse the sentiment and summarise what users love and hate.

Output MUST be valid JSON matching this exact shape:
{
  "overallScore": 0,
  "summary": "",
  "topPraiseThemes": [{ "theme": "", "evidence": ["short quote"] }],
  "topComplaintThemes": [{ "theme": "", "evidence": ["short quote"] }],
  "suggestedImprovements": [{ "title": "", "description": "", "priority": "high|medium|low" }]
}

Rules:
- overallScore: integer 0-100 where 100 is extremely positive.
- Evidence quotes <= 120 chars, verbatim from reviews where possible.
- Do NOT invent facts not in the reviews.
- suggestedImprovements: concrete and actionable.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topN = reviews.slice(0, 50).map((r: any) => ({
      rating: r.rating, title: r.title, body: r.body, date: r.date,
    }));

    const userContent = `APP:\n${JSON.stringify({
      app_name: config?.app_name, category: config?.category,
      pricing: config?.pricing, one_liner: config?.one_liner,
    })}\n\nREVIEWS:\n${JSON.stringify(topN)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: 'application/json' },
      }),
    });

    if (!geminiRes.ok) {
      console.error('Gemini error:', geminiRes.status, (await geminiRes.text()).slice(0, 500));
      return NextResponse.json({ error: `Gemini API error (${geminiRes.status})` }, { status: 502 });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: 'Unexpected Gemini response' }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim());
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return NextResponse.json({ error: 'Invalid JSON from model' }, { status: 502 });
      parsed = JSON.parse(m[0]);
    }

    const sentiment = {
      ...(parsed as Record<string, unknown>),
      analysedAt: new Date().toISOString(),
      model: 'gemini-2.5-flash',
      reviewCount: reviews.length,
    };

    updatePlanContent(planId, { reviewSentiment: sentiment });

    return NextResponse.json({ sentiment });
  } catch (err) {
    console.error('review-sentiment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
