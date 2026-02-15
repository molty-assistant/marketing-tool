import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

type TranslationSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets';

interface GenerateTranslationsRequest {
  planId: string;
  targetLanguages: string[];
  sections: TranslationSection[];
}

const VALID_SECTIONS: TranslationSection[] = [
  'app_store_description',
  'short_description',
  'keywords',
  'whats_new',
  'feature_bullets',
];

const SUPPORTED_LANGUAGES = [
  'es',
  'fr',
  'de',
  'ja',
  'ko',
  'pt-BR',
  'it',
  'zh-Hans',
  'nl',
  'ar',
] as const;

function sectionLabel(section: TranslationSection): string {
  switch (section) {
    case 'app_store_description':
      return 'App Store description';
    case 'short_description':
      return 'Short description';
    case 'keywords':
      return 'Keywords';
    case 'whats_new':
      return "What's New";
    case 'feature_bullets':
      return 'Feature bullets';
  }
}

function languageLabel(code: string): string {
  switch (code) {
    case 'es':
      return 'Spanish (es)';
    case 'fr':
      return 'French (fr)';
    case 'de':
      return 'German (de)';
    case 'ja':
      return 'Japanese (ja)';
    case 'ko':
      return 'Korean (ko)';
    case 'pt-BR':
      return 'Portuguese (Brazil) (pt-BR)';
    case 'it':
      return 'Italian (it)';
    case 'zh-Hans':
      return 'Chinese (Simplified) (zh-Hans)';
    case 'nl':
      return 'Dutch (nl)';
    case 'ar':
      return 'Arabic (ar)';
    default:
      return code;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<GenerateTranslationsRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const requestedLanguages = Array.isArray(body.targetLanguages)
      ? body.targetLanguages
      : [];
    const targetLanguages = requestedLanguages.filter((l): l is (typeof SUPPORTED_LANGUAGES)[number] =>
      (SUPPORTED_LANGUAGES as readonly string[]).includes(l)
    );

    if (targetLanguages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "targetLanguages"' },
        { status: 400 }
      );
    }

    const requestedSections = Array.isArray(body.sections) ? body.sections : [];
    const sections = requestedSections.filter((s): s is TranslationSection =>
      VALID_SECTIONS.includes(s as TranslationSection)
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

    const systemPrompt = `You are an expert app store localisation copywriter.

Task:
- Produce LOCALISED app store copy (not literal translation) for the requested languages.
- Adapt idioms, cultural references, and app store conventions for each locale.
- Keep meaning consistent with the product, but make it feel native.

Output rules:
- Output MUST be valid JSON only (no markdown, no commentary).
- The JSON MUST be an object with a top-level key "translations".
- translations[language_code][section] = string.
- Only include the requested languages and requested sections.

Languages requested:
${targetLanguages.map((l) => `- ${l}: ${languageLabel(l)}`).join('\n')}

Sections requested:
${sections.map((s) => `- ${s}: ${sectionLabel(s)}`).join('\n')}

Section requirements:
- app_store_description: 800-2000 characters (or natural equivalent length). Short paragraphs, benefits-first, light CTA.
- short_description: ~60-80 characters (store-friendly, no quotes). Localise length appropriately.
- keywords: comma-separated keywords (15-30). Use locale-appropriate search terms. No hashtags.
- whats_new: 2-4 short bullet lines describing updates (plausible). Use local style.
- feature_bullets: 5-8 bullets, each max ~12 words, benefit-forward.

Quality/safety:
- Avoid unverifiable claims (e.g., "#1", "guaranteed").
- Keep brand/product names in original form.
- For Arabic, write natural Modern Standard Arabic and keep punctuation readable.`;

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
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        {
          error: `Gemini API error (${geminiResponse.status}). Please try again.`,
        },
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
      const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse Gemini JSON:', text.slice(0, 500));
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const translations: Record<string, Record<string, string>> = {};
    const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    const t = obj?.translations;

    if (t && typeof t === 'object') {
      for (const lang of targetLanguages) {
        const langObj = (t as Record<string, unknown>)[lang];
        if (!langObj || typeof langObj !== 'object') continue;

        for (const section of sections) {
          const val = (langObj as Record<string, unknown>)[section];
          if (typeof val === 'string' && val.trim().length > 0) {
            translations[lang] ||= {};
            translations[lang][section] = val.trim();
          }
        }
      }
    }

    if (Object.keys(translations).length === 0) {
      return NextResponse.json(
        { error: 'Model did not return the requested translations. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      translations,
      metadata: {
        model: 'gemini-2.5-flash',
        languages: targetLanguages,
        sections,
      },
    });
  } catch (err) {
    console.error('generate-translations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
