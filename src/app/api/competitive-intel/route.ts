import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

export type CompetitiveIntelResult = {
  competitors: Array<{
    name: string;
    oneLiner: string;
    strengths: string[];
    weaknesses: string[];
    pricing: string;
  }>;
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
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error('Model returned invalid JSON');
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

function normaliseResult(parsed: unknown): CompetitiveIntelResult {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Model returned invalid JSON shape (expected object)');
  }

  const obj = parsed as Record<string, unknown>;
  const competitorsRaw = obj.competitors;
  if (!Array.isArray(competitorsRaw)) {
    throw new Error('Model returned invalid JSON shape (expected competitors array)');
  }

  const competitors = competitorsRaw
    .filter((c) => c && typeof c === 'object')
    .map((c) => {
      const item = c as Record<string, unknown>;
      return {
        name: typeof item.name === 'string' ? item.name.trim() : '',
        oneLiner:
          typeof item.oneLiner === 'string'
            ? item.oneLiner.trim()
            : typeof item.description === 'string'
              ? item.description.trim()
              : '',
        strengths: asStringArray(item.strengths),
        weaknesses: asStringArray(item.weaknesses),
        pricing: typeof item.pricing === 'string' ? item.pricing.trim() : '',
      };
    })
    .filter((c) => c.name);

  const opportunities = asStringArray(obj.opportunities);
  const marketGaps = asStringArray(obj.marketGaps);

  if (competitors.length === 0) {
    throw new Error('Model returned empty competitors');
  }

  return {
    competitors: competitors.slice(0, 5),
    opportunities,
    marketGaps,
  };
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
    'You are a meticulous competitive intelligence analyst. Prefer well-known, direct competitors. Be specific and concise. Output valid JSON only (no markdown, no commentary, no citations).';

  const userPrompt = `Research competitors for this product and category.

Product:
- Name: ${params.appName}
- Category: ${params.category}
- One-liner: ${params.oneLiner}

Return ONLY valid JSON matching this exact shape:
{
  "competitors": [
    {
      "name": "Competitor name",
      "oneLiner": "Short 1 sentence positioning summary",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "pricing": "Pricing model (free/freemium/subscription/usage-based, include tiers if you know them)"
    }
  ],
  "opportunities": ["Actionable opportunity 1"],
  "marketGaps": ["Market gap 1"]
}

Constraints:
- competitors: EXACTLY 5
- strengths: 3-6 items per competitor
- weaknesses: 3-6 items per competitor
- opportunities: 4-10 items
- marketGaps: 4-10 items
- If exact pricing is uncertain, describe the model at a high level.
- Do not add extra keys.`;

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

  const parsed = safeJsonParse(content);
  return normaliseResult(parsed);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    const appName = typeof body.appName === 'string' ? body.appName : '';
    const category = typeof body.category === 'string' ? body.category : '';
    const oneLiner = typeof body.oneLiner === 'string' ? body.oneLiner : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (!appName || !category || !oneLiner) {
      return NextResponse.json(
        { error: 'Missing required fields: appName, category, oneLiner' },
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
