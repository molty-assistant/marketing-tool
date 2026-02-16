import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, getContent } from '@/lib/db';

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

type PlanConfig = {
  app_name?: string;
  one_liner?: string;
  category?: string;
};

export type CompetitorIntel = {
  name: string;
  oneLiner: string;
  strengths: string[];
  weaknesses: string[];
  pricing: string;
};

export type CompetitiveIntelResult = {
  competitors: CompetitorIntel[];
  opportunities: string[];
  marketGaps: string[];
};

function safeJsonParse(input: string): unknown {
  const cleaned = input
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Model returned invalid JSON');
  }
}

async function fetchCompetitiveIntel(params: {
  appName: string;
  category: string;
  oneLiner: string;
}): Promise<CompetitiveIntelResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const systemPrompt =
    'You are a meticulous competitive intelligence analyst. Prefer well-known, direct competitors. Be specific and concise. Output valid JSON only.';

  const userPrompt = `Perform competitive intelligence research for this product.

Product:
- Name: ${params.appName}
- Category: ${params.category}
- One-liner: ${params.oneLiner}

Return ONLY a JSON object matching this exact shape:
{
  "competitors": [
    {
      "name": "Competitor name",
      "oneLiner": "1-2 sentence description",
      "strengths": ["...", "..."],
      "weaknesses": ["...", "..."],
      "pricing": "Their pricing model (e.g., free, freemium, subscription tiers)"
    }
  ],
  "opportunities": ["Market positioning opportunity 1", "..."],
  "marketGaps": ["Underserved need or gap 1", "..."]
}

Constraints:
- competitors: exactly 5 items
- strengths: 3-6 items per competitor
- weaknesses: 3-6 items per competitor
- opportunities: 3-5 items — specific ways this product could differentiate or position itself
- marketGaps: 3-5 items — underserved needs, missing features, or segments competitors ignore
- Keep pricing high-level if exact numbers are uncertain.
- Do not include markdown, citations, or extra keys.`;

  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Perplexity error (${resp.status}): ${errText.slice(0, 500)}`);
  }

  const data = (await resp.json()) as PerplexityResponse;
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Unexpected Perplexity response shape');
  }

  const parsed = safeJsonParse(content) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.competitors)) {
    throw new Error('Model returned invalid JSON shape (expected object with competitors array)');
  }

  const competitors: CompetitorIntel[] = (parsed.competitors as unknown[])
    .filter((c) => c && typeof c === 'object')
    .map((c) => {
      const obj = c as Record<string, unknown>;
      return {
        name: typeof obj.name === 'string' ? obj.name : '',
        oneLiner: typeof obj.oneLiner === 'string' ? obj.oneLiner : (typeof obj.description === 'string' ? obj.description : ''),
        strengths: Array.isArray(obj.strengths)
          ? obj.strengths.filter((s): s is string => typeof s === 'string')
          : [],
        weaknesses: Array.isArray(obj.weaknesses)
          ? obj.weaknesses.filter((s): s is string => typeof s === 'string')
          : [],
        pricing: typeof obj.pricing === 'string' ? obj.pricing : '',
      };
    })
    .filter((c) => c.name && c.oneLiner);

  if (competitors.length === 0) {
    throw new Error('Model returned empty competitors');
  }

  const opportunities = Array.isArray(parsed.opportunities)
    ? (parsed.opportunities as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  const marketGaps = Array.isArray(parsed.marketGaps)
    ? (parsed.marketGaps as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  return {
    competitors: competitors.slice(0, 5),
    opportunities,
    marketGaps,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      planId?: unknown;
      appName?: unknown;
      category?: unknown;
      oneLiner?: unknown;
    };
    const planId = typeof body.planId === 'string' ? body.planId : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}') as PlanConfig;

    // Accept from body or fall back to plan config
    const appName = (typeof body.appName === 'string' && body.appName) || config.app_name || '';
    const category = (typeof body.category === 'string' && body.category) || config.category || '';
    const oneLiner = (typeof body.oneLiner === 'string' && body.oneLiner) || config.one_liner || '';

    if (!appName || !category || !oneLiner) {
      return NextResponse.json(
        { error: 'Plan is missing required fields (app_name, category, one_liner)' },
        { status: 400 }
      );
    }

    const result = await fetchCompetitiveIntel({ appName, category, oneLiner });

    saveContent(planId, 'competitive-intel', null, JSON.stringify(result));

    return NextResponse.json({
      ...result,
      metadata: {
        provider: 'perplexity',
        model: 'sonar',
      },
    });
  } catch (err) {
    console.error('competitive-intel error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const planId = request.nextUrl.searchParams.get('planId') || '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getContent(planId, 'competitive-intel');
    if (!row) {
      return NextResponse.json({ competitors: [], opportunities: [], marketGaps: [] });
    }

    const parsed = JSON.parse(row.content || '{}');
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('competitive-intel GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
