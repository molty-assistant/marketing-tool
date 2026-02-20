import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

interface DigestRequest {
  planId: string;
}

type DigestKey =
  | 'key_metrics_summary'
  | 'content_performance_highlights'
  | 'recommended_next_actions'
  | 'trending_keywords'
  | 'competitive_movements'
  | 'markdown';

const DIGEST_KEYS: DigestKey[] = [
  'key_metrics_summary',
  'content_performance_highlights',
  'recommended_next_actions',
  'trending_keywords',
  'competitive_movements',
  'markdown',
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DigestRequest>;

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
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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

    const systemPrompt = `You are a senior growth marketer producing a weekly marketing digest for an app.

Use ONLY the information provided. If data is missing, make reasonable, clearly-labelled assumptions and keep them minimal.
Avoid unverifiable claims ("#1", guaranteed outcomes). Be concrete and actionable.

Output MUST be valid JSON only (no markdown, no commentary).

Return an object with EXACTLY these keys (all strings):
- key_metrics_summary: short bullet-style summary of key metrics and changes week-over-week (if numbers are unknown, use qualitative signals and what to measure next).
- content_performance_highlights: best/worst performing content, what worked, what didn't, with 3-6 bullets.
- recommended_next_actions: prioritized next steps for the next 7 days, 5-10 bullets with owners/effort when possible.
- trending_keywords: 10-20 keywords/phrases relevant to the category; include brief intent notes (e.g. "high intent", "education").
- competitive_movements: notable competitor activity, positioning shifts, store/listing changes, pricing/promos; 3-6 bullets.
- markdown: a full report in Markdown with section headings matching the above (H2), suitable to paste into email/Notion.

The digest should be crisp, skimmable, and based on the plan's category, audience, channels, and any scraped/analysis content.`;

    const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userContent }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
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
      console.error(
        'Unexpected Gemini response shape:',
        JSON.stringify(data).slice(0, 500)
      );
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      // Strip markdown code fences if present (common Gemini behaviour)
      let cleaned = text
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

      // If Gemini omitted the outer braces, try wrapping
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        cleaned = '{' + cleaned + '}';
      }

      parsed = JSON.parse(cleaned);
    } catch {
      // Second attempt: extract JSON object with regex
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(
          'Failed to parse Gemini JSON (no JSON found):',
          text.slice(0, 500)
        );
        return NextResponse.json(
          { error: 'Model returned invalid JSON. Please try again.' },
          { status: 502 }
        );
      }

      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        console.error(
          'Failed to parse Gemini JSON (both attempts):',
          text.slice(0, 500)
        );
        return NextResponse.json(
          { error: 'Model returned invalid JSON. Please try again.' },
          { status: 502 }
        );
      }
    }

    const digest: Record<string, string> = {};
    if (parsed && typeof parsed === 'object') {
      for (const k of DIGEST_KEYS) {
        const val = (parsed as Record<string, unknown>)[k];
        if (typeof val === 'string') {
          digest[k] = val.trim();
        }
      }
    }

    const missing = DIGEST_KEYS.filter((k) => !digest[k]);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Model did not return the expected digest sections. Please try again.',
        },
        { status: 502 }
      );
    }

    const usage = data?.usageMetadata;
    const tokens =
      typeof usage?.totalTokenCount === 'number'
        ? usage.totalTokenCount
        : typeof usage?.promptTokenCount === 'number' &&
            typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null;

    return NextResponse.json({
      digest,
      metadata: {
        model: 'gemini-2.0-flash',
        tokens,
      },
    });
  } catch (err) {
    console.error('digest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
