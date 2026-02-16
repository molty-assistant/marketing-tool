import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlanContent } from '@/lib/db';

type PlanConfig = {
  app_name?: string;
  one_liner?: string;
  category?: string;
  target_audience?: string;
  competitors?: string;
  app_url?: string;
  app_type?: string;
};

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

export interface Keyword {
  keyword: string;
  searchVolume: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  relevance: number; // 1-10
}

export interface KeywordResearchResult {
  primaryKeywords: Keyword[];
  longTailKeywords: Keyword[];
  generatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'PERPLEXITY_API_KEY is not set' }, { status: 500 });
    }

    const config = JSON.parse(row.config || '{}') as PlanConfig;
    const scraped = JSON.parse(row.scraped || '{}') as Record<string, unknown>;

    const appDescription =
      (typeof scraped.description === 'string' ? scraped.description : '') ||
      (typeof scraped.appDescription === 'string' ? scraped.appDescription : '') ||
      config.one_liner || '';

    const prompt = `You are an App Store Optimization (ASO) and SEO keyword researcher.

Research high-value keywords for the following app:
- Name: ${config.app_name || 'Unknown'}
- Category: ${config.category || 'Unknown'}
- Description: ${appDescription.slice(0, 500)}
- Target Audience: ${config.target_audience || 'Unknown'}
- Competitors: ${config.competitors || 'Unknown'}
- URL: ${config.app_url || 'N/A'}
- Type: ${config.app_type || 'N/A'}

Return ONLY valid JSON (no markdown, no backticks) matching this exact shape:
{
  "primaryKeywords": [
    {"keyword": "example keyword", "searchVolume": "high", "difficulty": "medium", "relevance": 9}
  ],
  "longTailKeywords": [
    {"keyword": "example long tail keyword phrase", "searchVolume": "medium", "difficulty": "easy", "relevance": 8}
  ]
}

Requirements:
- primaryKeywords: 10-15 short, high-impact keywords (1-3 words)
- longTailKeywords: 10-15 longer keyword phrases (3-6 words)
- searchVolume: "high", "medium", or "low"
- difficulty: "easy", "medium", or "hard"
- relevance: integer 1-10 (10 = most relevant to this specific app)
- Focus on keywords that would work well in App Store keyword fields and web SEO
- Consider the app's category, competitors, and target audience
- Include a mix of branded, category, and feature-based keywords`;

    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a keyword research expert. Return only valid JSON, no markdown formatting.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
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

    let parsed: KeywordResearchResult;
    try {
      const cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned) as KeywordResearchResult;
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]) as KeywordResearchResult;
      } else {
        return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
      }
    }

    // Validate structure
    if (!Array.isArray(parsed.primaryKeywords) || !Array.isArray(parsed.longTailKeywords)) {
      return NextResponse.json({ error: 'Invalid keyword data structure' }, { status: 502 });
    }

    const result: KeywordResearchResult = {
      primaryKeywords: parsed.primaryKeywords,
      longTailKeywords: parsed.longTailKeywords,
      generatedAt: new Date().toISOString(),
    };

    // Save to plan stages
    const stages = JSON.parse(row.stages || '{}') as Record<string, unknown>;
    stages.keywords = result;
    updatePlanContent(planId, { stages });

    return NextResponse.json({ keywords: result });
  } catch (err) {
    console.error('keyword-research error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
