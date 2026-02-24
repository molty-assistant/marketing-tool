import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent } from '@/lib/db';

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

    const systemPrompt = `You are a brand strategist and copy chief trained in David Ogilvy's research-first methods.

Your job: extract the TRUE voice of this specific product from evidence in the input — the scraped app description, feature lists, existing marketing copy, and the marketing plan. Do NOT invent or project; distil what is already there.

Ogilvy's method: immerse yourself in the product facts, understand the customer, then articulate the voice that already exists in the copy and positioning — just make it conscious and usable.

Output MUST be valid JSON matching this exact shape:
{
  "voiceSummary": "2-3 sentences describing this product's unique voice",
  "personalityTraits": [
    { "trait": "trait name", "description": "what it means for THIS product", "example": "an example sentence in this voice" }
  ],
  "vocabularyGuide": {
    "wordsToUse": ["word1", "word2"],
    "wordsToAvoid": ["word1", "word2"],
    "phrasesToUse": ["phrase1"],
    "phrasesToAvoid": ["phrase1"]
  },
  "toneSpectrum": {
    "formal": 0,
    "playful": 0,
    "technical": 0,
    "emotional": 0
  }
}

Constraints:
- voiceSummary: 2-3 sentences, specific to THIS product.
- personalityTraits: 5-8 traits. Each example must sound like THIS product's copy.
- vocabularyGuide: 8-15 items per list where the evidence supports it.
- toneSpectrum: integers 0-10.
- Do NOT output generic traits ("friendly", "professional") without concrete product-specific meaning.
- Do NOT fabricate product facts not present in the inputs.`;

    const userContent = `APP CONTEXT:\n${JSON.stringify(appContext)}\n\nSCRAPED INFO:\n${JSON.stringify(scraped)}\n\nPLAN STAGES:\n${JSON.stringify(stages)}\n\nFULL PLAN:\n${row.generated}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.5,
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

    // Persist to plan
    saveContent(planId, 'brand-voice', null, JSON.stringify(parsed));

    // Persist the generated brand voice
    updatePlanContent(planId, 'brandVoice', parsed);

    return NextResponse.json({ brandVoice: parsed, metadata: { model: 'gemini-2.5-flash' } });
  } catch (err) {
    console.error('brand-voice error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
