import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent, getPlanContent } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

type DraftSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets'
  | 'landing_page_hero';

interface GenerateDraftRequest {
  planId: string;
  sections: DraftSection[];
  tone: Tone;
}

const VALID_TONES: Tone[] = ['professional', 'casual', 'bold', 'minimal'];
const VALID_SECTIONS: DraftSection[] = [
  'app_store_description',
  'short_description',
  'keywords',
  'whats_new',
  'feature_bullets',
  'landing_page_hero',
];

function sectionLabel(section: DraftSection): string {
  switch (section) {
    case 'app_store_description':
      return 'App Store / Play Store description';
    case 'short_description':
      return 'Short description';
    case 'keywords':
      return 'Keywords';
    case 'whats_new':
      return "What's New";
    case 'feature_bullets':
      return 'Feature bullets';
    case 'landing_page_hero':
      return 'Landing page hero copy';
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-draft',
    maxRequests: 12,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = (await request.json()) as Partial<GenerateDraftRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const tone: Tone =
      body.tone && VALID_TONES.includes(body.tone) ? body.tone : 'professional';

    const requestedSections = Array.isArray(body.sections) ? body.sections : [];
    const sections = requestedSections.filter((s): s is DraftSection =>
      VALID_SECTIONS.includes(s as DraftSection)
    );

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "sections"' },
        { status: 400 }
      );
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

    const systemPrompt = `You are an expert app store copywriter.

Write a complete first-draft of app listing / landing page copy based on the provided app marketing plan.
Tone: ${tone}.

Output MUST be valid JSON only (no markdown, no commentary). The JSON must be an object where each key is one of the requested sections, and the value is a string.

Sections requested:
${sections.map((s) => `- ${s}: ${sectionLabel(s)}`).join('\n')}

Writing requirements by section:
- app_store_description: 800-2000 characters. Use short paragraphs, benefits-first, include a light CTA.
- short_description: 60-80 characters (store-friendly). No quotes.
- keywords: comma-separated keywords (15-30), no hashtags.
- whats_new: 2-4 short bullet lines describing updates (even if fictional, keep plausible).
- feature_bullets: 5-8 bullets, each max ~12 words.
- landing_page_hero: 1 headline + 1 subheadline + 1 primary CTA label, separated by newlines.

Use the app's differentiators and audience. Avoid making unverifiable claims (e.g., "#1", "guaranteed").`;

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
          temperature: 0.7,
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
      // Strip markdown code fences if present (common Gemini behaviour)
      let cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      // If Gemini omitted the outer braces, try wrapping
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        cleaned = '{' + cleaned + '}';
      }
      parsed = JSON.parse(cleaned);
    } catch {
      // Second attempt: extract JSON object with regex
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('Failed to parse Gemini JSON (both attempts):', text.slice(0, 500));
          return NextResponse.json(
            { error: 'Model returned invalid JSON. Please try again.' },
            { status: 502 }
          );
        }
      } else {
        console.error('Failed to parse Gemini JSON (no JSON found):', text.slice(0, 500));
        return NextResponse.json(
          { error: 'Model returned invalid JSON. Please try again.' },
          { status: 502 }
        );
      }
    }

    const draft: Record<string, string> = {};
    if (parsed && typeof parsed === 'object') {
      for (const s of sections) {
        const val = (parsed as Record<string, unknown>)[s];
        if (typeof val === 'string') {
          draft[s] = val.trim();
        }
      }
    }

    if (Object.keys(draft).length === 0) {
      return NextResponse.json(
        { error: 'Model did not return the requested sections. Please try again.' },
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

    saveContent(planId, 'draft', tone, JSON.stringify(draft));

    // Persist the generated draft (keyed by tone)
    const existingDrafts = (getPlanContent(planId).drafts || {}) as Record<string, unknown>;
    existingDrafts[tone] = draft;
    updatePlanContent(planId, 'drafts', existingDrafts);

    return NextResponse.json({
      draft,
      metadata: {
        model: 'gemini-2.5-flash',
        tokens,
        tone,
      },
    });
  } catch (err) {
    console.error('generate-draft error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
