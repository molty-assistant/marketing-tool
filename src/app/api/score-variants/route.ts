import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';

type VariantScore = {
  text: string;
  clarity: number;
  emotion: number;
  urgency: number;
  uniqueness: number;
  overall: number;
  feedback: string;
};

type ScoreVariantsResult = {
  scores: VariantScore[];
  winner: number; // index into scores
};

function clampScore(n: unknown): number {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.max(1, Math.min(10, Math.round(num)));
}

function computeWinner(scores: VariantScore[]): number {
  if (scores.length === 0) return -1;
  let bestIdx = 0;
  let best = scores[0]?.overall ?? 0;
  for (let i = 1; i < scores.length; i++) {
    const v = scores[i]?.overall ?? 0;
    if (v > best) {
      best = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const planId = typeof body?.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const variantsRaw = Array.isArray(body?.variants) ? body.variants : null;
    if (!variantsRaw) {
      return NextResponse.json({ error: 'Missing "variants" (string[])' }, { status: 400 });
    }

    const variants: string[] = (variantsRaw as unknown[])
      .filter((v: unknown): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (variants.length < 2 || variants.length > 5) {
      return NextResponse.json(
        { error: 'Provide between 2 and 5 non-empty variants.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are an expert direct-response copy chief.

Score EACH copy variant (marketing headline/body) on a 1-10 scale for:
- clarity: instantly understandable, no confusion
- emotion: evokes feeling / desire / pain
- urgency: creates immediate motivation to act
- uniqueness: differentiated, memorable, not generic
- overall: holistic effectiveness as marketing copy

Return ONLY valid JSON in this exact shape:
{
  "scores": [
    {
      "text": "<exact variant text>",
      "clarity": 1,
      "emotion": 1,
      "urgency": 1,
      "uniqueness": 1,
      "overall": 1,
      "feedback": "1-2 sentences: why it scored this way + 1 improvement suggestion"
    }
  ],
  "winner": 0
}

Rules:
- scores must be the same length as the input variants.
- Keep the same order as input.
- "text" must match the input variant exactly.
- winner is the index (0-based) of the strongest overall variant.`;

    let appName = '';
    try {
      const cfg = JSON.parse(row.config || '{}');
      appName = typeof cfg?.app_name === 'string' ? cfg.app_name : '';
    } catch {
      appName = '';
    }

    const userContent = `PLAN CONTEXT (optional):\nApp name: ${appName}\n\nVARIANTS (in order):\n${variants.map((v, i) => `${i + 1}. ${v}`).join('\n\n')}`;

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
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const obj = parsed as Partial<ScoreVariantsResult>;
    const scoresRaw = Array.isArray(obj?.scores) ? obj.scores : [];

    const scores: VariantScore[] = scoresRaw.slice(0, variants.length).map((s: any, idx: number) => {
      const safeText = typeof s?.text === 'string' ? s.text : variants[idx];
      return {
        text: safeText,
        clarity: clampScore(s?.clarity),
        emotion: clampScore(s?.emotion),
        urgency: clampScore(s?.urgency),
        uniqueness: clampScore(s?.uniqueness),
        overall: clampScore(s?.overall),
        feedback: typeof s?.feedback === 'string' ? s.feedback : '',
      };
    });

    // Ensure we have exactly one score object per variant.
    while (scores.length < variants.length) {
      scores.push({
        text: variants[scores.length],
        clarity: 1,
        emotion: 1,
        urgency: 1,
        uniqueness: 1,
        overall: 1,
        feedback: '',
      });
    }

    // Prefer model winner if valid, otherwise compute.
    const winnerFromModel = typeof obj?.winner === 'number' && Number.isInteger(obj.winner) ? obj.winner : -1;
    const winner = winnerFromModel >= 0 && winnerFromModel < scores.length ? winnerFromModel : computeWinner(scores);

    const result: ScoreVariantsResult = { scores, winner };

    // Persist snapshot
    saveContent(planId, 'variant-scores', null, JSON.stringify(result));

    return NextResponse.json(result);
  } catch (err) {
    console.error('score-variants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
