import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlanContent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const systemPrompt = `You are a direct-response positioning strategist.

Generate 3-5 positioning angles for THIS product using these frameworks:
1) The Specialist — position as the go-to for a specific niche
2) The Speed Advantage — emphasise time savings or quick results
3) The Anti-[Category] — position against the bloated/complex incumbents
4) The Methodology — a unique process or approach that creates trust
5) The Results-First — lead with concrete outcomes

Rules:
- Ground every angle in evidence from the plan and scraped copy.
- If competitors are listed, factor them into anti-positioning.
- Hooks and headlines must feel specific to THIS product, not template-y.

Output MUST be valid JSON matching this exact shape:
{
  "angles": [
    {
      "name": "The [X] Angle",
      "hook": "one-liner hook",
      "psychology": "why this works",
      "headlineDirections": ["headline 1", "headline 2", "headline 3"],
      "bestFor": "where to use (landing page / ads / social / etc)"
    }
  ],
  "antiPositioning": {
    "whatWeAreNot": ["not X", "not Y"],
    "whyItMatters": "explanation"
  },
  "recommendedPrimary": "angle name"
}

Constraints:
- 3-5 angles, each meaningfully different.
- 3 headlineDirections per angle.
- recommendedPrimary must exactly match one angle name.
- Avoid unverifiable claims.`;

    const userContent = `APP CONTEXT:\n${JSON.stringify(appContext)}\n\nSCRAPED INFO:\n${JSON.stringify(scraped)}\n\nPLAN STAGES:\n${JSON.stringify(stages)}\n\nFULL PLAN:\n${row.generated}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
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
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {
          return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
        }
      } else {
        return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
      }
    }

    updatePlanContent(planId, 'positioningAngles', parsed);

    return NextResponse.json({ positioning: parsed, metadata: { model: 'gemini-2.5-flash' } });
  } catch (err) {
    console.error('positioning-angles error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
