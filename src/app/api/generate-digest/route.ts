import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlanContent } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface GenerateDigestRequest {
  planId: string;
}

function parseGeminiJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Model returned invalid JSON');
    return JSON.parse(jsonMatch[0]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<GenerateDigestRequest>;
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

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    let content: Record<string, unknown> = {};
    try {
      content = row.content ? (JSON.parse(row.content) as Record<string, unknown>) : {};
    } catch {
      content = {};
    }

    const savedContent = {
      brief: content?.brief ?? null,
      brandVoice: content?.brandVoice ?? null,
      positioning: content?.positioning ?? null,
      competitive: content?.competitive ?? null,
      draft: content?.draft ?? null,
      emails: content?.emails ?? null,
    };

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

    const systemPrompt = `You are a senior growth marketing lead.

Create a WEEKLY MARKETING DIGEST for the app using all available saved plan material.
Be concrete and action-oriented. Avoid generic advice.

Output MUST be valid JSON matching this exact shape:
{
  "executiveSummary": "...",
  "keyMetricsToTrack": ["..."],
  "recommendedActions": [
    {
      "task": "A specific task",
      "why": "Why this matters this week",
      "successCriteria": "How to know it worked (measurable)"
    }
  ],
  "contentCalendarSuggestions": [
    {
      "day": "Mon/Tue/...",
      "channel": "e.g. X, Reddit, Blog, Email",
      "postIdea": "Specific post idea",
      "assetNeeded": "e.g. screenshot, short video, none"
    }
  ],
  "competitiveMovesToWatch": ["..."]
}

Constraints:
- executiveSummary: 3-6 bullet-like sentences (no markdown), specific to the app.
- keyMetricsToTrack: 5-10 metrics appropriate for the app's distribution channels.
- recommendedActions: 3-5 tasks, each must be doable within 1-3 hours.
- contentCalendarSuggestions: 4-7 items for the next 7 days.
- competitiveMovesToWatch: 3-6 items.
- Do NOT invent product facts. Use only what is present in inputs.`;

    const userContent = `APP CONTEXT:\n${JSON.stringify(appContext)}\n\nSAVED CONTENT (may be null if not generated yet):\n${JSON.stringify(savedContent)}\n\nSCRAPED INFO:\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
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
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let digest: unknown;
    try {
      digest = parseGeminiJson(text);
    } catch (e) {
      console.error('Failed to parse digest JSON:', e);
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const generatedAt = new Date().toISOString();
    updatePlanContent(planId, { digest, digestGeneratedAt: generatedAt });

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
      metadata: { model: 'gemini-2.5-flash', tokens, generatedAt },
    });
  } catch (err) {
    console.error('generate-digest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
