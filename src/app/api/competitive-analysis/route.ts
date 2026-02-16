import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

type PlanConfig = {
  app_name?: string;
  one_liner?: string;
  category?: string;
  target_audience?: string;
  pricing?: string;
  differentiators?: string;
  competitors?: string;
  distribution_channels?: string;
  app_url?: string;
  app_type?: string;
};

async function fetchCompetitorsViaPerplexity(params: {
  url?: string;
  category?: string;
  appName?: string;
  description?: string;
}): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const prompt = `Find 5-8 direct competitors for this product.

Product:
- Name: ${params.appName || 'Unknown'}
- URL: ${params.url || 'Unknown'}
- Category: ${params.category || 'Unknown'}
- Description: ${params.description || 'N/A'}

Return: competitor name, homepage URL, positioning/tagline, and pricing model for each.
Prefer JSON array: [{"name":"...","url":"...","positioning":"...","pricing":"..."}]`;

  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a meticulous market researcher. Prefer primary sources and current competitor homepages.' },
        { role: 'user', content: prompt },
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
  return content;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const inputUrl = typeof body.url === 'string' ? body.url : '';
    const inputCategory = typeof body.category === 'string' ? body.category : '';

    if (!planId && !inputUrl) {
      return NextResponse.json({ error: 'Provide either "planId" or "url"' }, { status: 400 });
    }

    let appName: string | undefined;
    let url: string | undefined = inputUrl || undefined;
    let category: string | undefined = inputCategory || undefined;
    let scraped: Record<string, unknown> = {};
    let stages: Record<string, unknown> = {};
    let generated = '';
    let config: PlanConfig = {};

    if (planId) {
      const row = getPlan(planId);
      if (!row) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      config = JSON.parse(row.config || '{}') as PlanConfig;
      scraped = JSON.parse(row.scraped || '{}') as Record<string, unknown>;
      stages = JSON.parse(row.stages || '{}') as Record<string, unknown>;
      generated = row.generated;
      appName = config.app_name;
      url = url || config.app_url;
      category = category || config.category;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    // Step 1: Perplexity competitor discovery (best-effort)
    let competitorResearch = '';
    let perplexityUsed = false;
    try {
      const desc =
        (typeof scraped.description === 'string' ? scraped.description : '') ||
        (typeof scraped.appDescription === 'string' ? scraped.appDescription : '') ||
        (generated ? generated.slice(0, 800) : '');
      competitorResearch = await fetchCompetitorsViaPerplexity({ url, category, appName, description: desc || undefined });
      perplexityUsed = true;
    } catch (e) {
      console.warn('Perplexity failed, falling back to Gemini-only:', e);
    }

    // Step 2: Gemini structures the analysis
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

    const appContext = {
      app_name: config.app_name,
      one_liner: config.one_liner,
      category: config.category,
      target_audience: config.target_audience,
      pricing: config.pricing,
      differentiators: config.differentiators,
      competitors: config.competitors,
      distribution_channels: config.distribution_channels,
      app_url: config.app_url,
      app_type: config.app_type,
    };

    const systemPrompt = `You are a sharp competitive intelligence analyst.

Build a competitive analysis for the given product.
Use the competitor research input if present. If absent, infer reasonable competitors from category and description — but do NOT invent precise pricing unless confident.

Output MUST be valid JSON matching this exact shape:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "url": "their URL",
      "positioning": "how they position themselves",
      "pricing": "their pricing model",
      "strengths": ["strength1"],
      "weaknesses": ["weakness1"],
      "keyMessaging": ["headline or tagline"]
    }
  ],
  "gaps": ["positioning gap 1"],
  "opportunities": ["opportunity 1"],
  "keywordGaps": ["keyword they miss"]
}

Constraints:
- 4-8 competitors.
- 3-6 items per strengths/weaknesses/keyMessaging.
- 4-10 items for gaps/opportunities/keywordGaps.
- Keep it specific and actionable for marketing.`;

    const userContent = `PRODUCT URL: ${url || 'N/A'}\nCATEGORY: ${category || 'N/A'}\n\nAPP CONTEXT:\n${JSON.stringify(appContext)}\n\nSCRAPED INFO:\n${JSON.stringify(scraped)}\n\nPLAN STAGES:\n${JSON.stringify(stages)}\n\nFULL PLAN:\n${generated}\n\nCOMPETITOR RESEARCH (Perplexity):\n${competitorResearch || '(none — use your own knowledge)'}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.6,
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

    return NextResponse.json({ competitive: parsed, metadata: { model: 'gemini-2.5-flash', perplexityUsed } });
  } catch (err) {
    console.error('competitive-analysis error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
