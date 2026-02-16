import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

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
  description: string;
  strengths: string[];
  weaknesses: string[];
  pricing: string;
};

function safeJsonParse(input: string): unknown {
  const cleaned = input
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
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
}): Promise<CompetitorIntel[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const systemPrompt =
    'You are a meticulous competitive intelligence analyst. Prefer well-known, direct competitors. Be specific and concise. Output valid JSON only.';

  const userPrompt = `Find the TOP 5 direct competitors for this product.

Product:
- Name: ${params.appName}
- Category: ${params.category}
- One-liner: ${params.oneLiner}

Return ONLY a JSON array of exactly 5 objects. Each object MUST match this shape:
{
  "name": "Competitor name",
  "description": "1-2 sentence description",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "pricing": "Their pricing model (e.g., free, freemium, subscription tiers)"
}

Constraints:
- strengths: 3-6 items
- weaknesses: 3-6 items
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

  const parsed = safeJsonParse(content);
  if (!Array.isArray(parsed)) {
    throw new Error('Model returned invalid JSON shape (expected array)');
  }

  const competitors: CompetitorIntel[] = parsed
    .filter((c) => c && typeof c === 'object')
    .map((c) => {
      const obj = c as Record<string, unknown>;
      return {
        name: typeof obj.name === 'string' ? obj.name : '',
        description: typeof obj.description === 'string' ? obj.description : '',
        strengths: Array.isArray(obj.strengths)
          ? obj.strengths.filter((s): s is string => typeof s === 'string')
          : [],
        weaknesses: Array.isArray(obj.weaknesses)
          ? obj.weaknesses.filter((s): s is string => typeof s === 'string')
          : [],
        pricing: typeof obj.pricing === 'string' ? obj.pricing : '',
      };
    })
    .filter((c) => c.name && c.description);

  if (competitors.length === 0) {
    throw new Error('Model returned empty competitors');
  }

  return competitors.slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { planId?: unknown };
    const planId = typeof body.planId === 'string' ? body.planId : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}') as PlanConfig;
    const appName = config.app_name || '';
    const category = config.category || '';
    const oneLiner = config.one_liner || '';

    if (!appName || !category || !oneLiner) {
      return NextResponse.json(
        { error: 'Plan is missing required fields (app_name, category, one_liner)' },
        { status: 400 }
      );
    }

    const competitors = await fetchCompetitiveIntel({ appName, category, oneLiner });

    return NextResponse.json({
      competitors,
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
