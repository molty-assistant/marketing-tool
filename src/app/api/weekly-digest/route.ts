import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPlan, saveContent } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface WeeklyDigestRequest {
  planId: string;
}

export interface WeeklyDigest {
  summary: string;
  contentCreated: Array<{
    type: string;
    key: string | null;
    description: string;
    updatedAt?: string;
  }>;
  recommendations: Array<{ title: string; detail: string }>;
  nextActions: Array<{ action: string; why: string; priority: 'high' | 'medium' | 'low' }>;
  generatedAt: string;
  competitiveLandscape?: string;
}

function parseGeminiJson(text: string): unknown {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    cleaned = '{' + cleaned + '}';
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error('No JSON found');
    return JSON.parse(objMatch[0]);
  }
}

function truncate(s: string, max = 8000): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n…(truncated, ${s.length - max} chars omitted)`;
}

function asStringOrEmpty(x: unknown): string {
  return typeof x === 'string' ? x : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<WeeklyDigestRequest>;
    const planId = typeof body.planId === 'string' ? body.planId : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const db = getDb();

    // Last 7 days of activity (best-effort definition of "this period")
    const recentRows = db
      .prepare(
        `SELECT content_type, content_key, content, created_at, updated_at
         FROM plan_content
         WHERE plan_id = ?
           AND datetime(updated_at) >= datetime('now', '-7 days')
         ORDER BY datetime(updated_at) DESC`
      )
      .all(planId) as Array<{
      content_type: string;
      content_key: string | null;
      content: string;
      created_at: string;
      updated_at: string;
    }>;

    const allRows = db
      .prepare(
        `SELECT content_type, content_key, content, created_at, updated_at
         FROM plan_content
         WHERE plan_id = ?
         ORDER BY content_type, content_key`
      )
      .all(planId) as Array<{
      content_type: string;
      content_key: string | null;
      content: string;
      created_at: string;
      updated_at: string;
    }>;

    const config = (() => {
      try {
        return JSON.parse(row.config || '{}');
      } catch {
        return {};
      }
    })();

    const scraped = (() => {
      try {
        return JSON.parse(row.scraped || '{}');
      } catch {
        return {};
      }
    })();

    const stages = (() => {
      try {
        return JSON.parse(row.stages || '{}');
      } catch {
        return {};
      }
    })();

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

    const toPromptRow = (r: {
      content_type: string;
      content_key: string | null;
      content: string;
      created_at: string;
      updated_at: string;
    }) => {
      let parsed: unknown = r.content;
      try {
        parsed = JSON.parse(r.content);
      } catch {
        // keep string
      }

      let preview: string;
      if (typeof parsed === 'string') preview = parsed;
      else preview = JSON.stringify(parsed);

      return {
        type: r.content_type,
        key: r.content_key,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        preview: truncate(preview, 2500),
      };
    };

    const recentForPrompt = recentRows.slice(0, 40).map(toPromptRow);
    const indexForPrompt = allRows
      .slice(0, 120)
      .map((r) => ({ type: r.content_type, key: r.content_key, updatedAt: r.updated_at }));

    const hasCompetitiveIntel = allRows.some(
      (r) => r.content_type === 'competitive-intel' || r.content_type === 'competitive-analysis'
    );

    const systemPrompt = `You are a senior marketing strategist.\n\nGenerate a WEEKLY marketing digest for the plan.\n\nOutput rules:\n- Output MUST be valid JSON only (no markdown, no commentary).\n- Return an object with exactly this shape:\n  {\n    \"summary\": string,\n    \"contentCreated\": [{\"type\": string, \"key\": string|null, \"description\": string, \"updatedAt\"?: string }],\n    \"recommendations\": [{\"title\": string, \"detail\": string}],\n    \"nextActions\": [{\"action\": string, \"why\": string, \"priority\": \"high\"|\"medium\"|\"low\"}],\n    \"generatedAt\": string (ISO8601),\n    \"competitiveLandscape\"?: string\n  }\n\nDigest requirements:\n- Summarise what content was created/updated in the last 7 days, based on the provided recent activity.\n- Provide 4-8 actionable recommendations. Be specific and grounded in the plan context.\n- Provide 4-10 next actions, prioritised.\n- If competitive intel exists, include a competitiveLandscape summary; otherwise omit it.\n- Avoid unverifiable claims and avoid inventing metrics; if metrics are missing, say what to track next.`;

    const userContent = `APP CONTEXT:\n${truncate(JSON.stringify(appContext), 6000)}\n\nRECENT PLAN CONTENT ACTIVITY (last 7 days, previews):\n${truncate(JSON.stringify(recentForPrompt), 14000)}\n\nALL SAVED CONTENT INDEX (types/keys):\n${truncate(JSON.stringify(indexForPrompt), 8000)}\n\nSCRAPED INFO (may be noisy):\n${truncate(JSON.stringify(scraped), 6000)}\n\nPLAN STAGES (markdown snippets):\n${truncate(JSON.stringify(stages), 6000)}\n\nFULL PLAN MARKDOWN (brief):\n${truncate(asStringOrEmpty(row.generated), 12000)}\n\nNOTES:\ncompetitiveIntelExists=${hasCompetitiveIntel}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
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
      parsed = parseGeminiJson(text);
    } catch {
      console.error('Failed to parse Gemini JSON:', text.slice(0, 500));
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;

    const createdRaw: unknown[] = Array.isArray(obj?.contentCreated)
      ? (obj?.contentCreated as unknown[])
      : [];

    const recommendationsRaw: unknown[] = Array.isArray(obj?.recommendations)
      ? (obj?.recommendations as unknown[])
      : [];

    const actionsRaw: unknown[] = Array.isArray(obj?.nextActions)
      ? (obj?.nextActions as unknown[])
      : [];

    const digest: WeeklyDigest = {
      summary: (obj && typeof obj.summary === 'string' ? obj.summary : '').trim(),
      contentCreated: createdRaw
        .map((x) => {
          const r = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
          return {
            type: typeof r.type === 'string' ? r.type : 'unknown',
            key: typeof r.key === 'string' ? r.key : r.key === null ? null : null,
            description: typeof r.description === 'string' ? r.description : '',
            updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
          };
        })
        .filter((x) => x.description.trim().length > 0),
      recommendations: recommendationsRaw
        .map((x) => {
          const r = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
          return {
            title: typeof r.title === 'string' ? r.title : '',
            detail: typeof r.detail === 'string' ? r.detail : '',
          };
        })
        .filter((x) => x.title.trim() && x.detail.trim()),
      nextActions: actionsRaw
        .map((x): { action: string; why: string; priority: 'high' | 'medium' | 'low' } => {
          const r = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
          const p = r.priority;
          const priority: 'high' | 'medium' | 'low' =
            p === 'high' || p === 'medium' || p === 'low' ? (p as 'high' | 'medium' | 'low') : 'medium';
          return {
            action: typeof r.action === 'string' ? r.action : '',
            why: typeof r.why === 'string' ? r.why : '',
            priority,
          };
        })
        .filter((x) => x.action.trim()),
      generatedAt: typeof obj?.generatedAt === 'string' ? obj.generatedAt : new Date().toISOString(),
      competitiveLandscape:
        typeof obj?.competitiveLandscape === 'string' ? obj.competitiveLandscape : undefined,
    };

    if (!digest.summary) {
      digest.summary = 'Weekly digest generated.';
    }

    saveContent(planId, 'weekly-digest', null, JSON.stringify(digest));

    return NextResponse.json({ digest });
  } catch (err) {
    console.error('weekly-digest error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
