import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';
import { getPlan, getContent, saveContent } from '@/lib/db';
import { generateAssets } from '@/lib/asset-generator';
import type { AppConfig, AssetConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';
// Generous timeout: this endpoint can make multiple Gemini calls + render PNGs
export const maxDuration = 300;

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

interface ExportBundleRequest {
  planId: string;
  tones?: string[];
  languages?: string[];
  includeAssets?: boolean;
}

const VALID_TONES: Tone[] = ['professional', 'casual', 'bold', 'minimal'];
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

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

type DraftSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'feature_bullets';

type TranslationSection = 'app_store_description' | 'short_description' | 'keywords';

function safeFilenamePart(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function parseGeminiJson(text: string): unknown {
  // Strip markdown code fences if present
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
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Model returned invalid JSON');
    return JSON.parse(jsonMatch[0]);
  }
}

function draftSectionLabel(section: DraftSection): string {
  switch (section) {
    case 'app_store_description':
      return 'App Store description';
    case 'short_description':
      return 'Short description';
    case 'keywords':
      return 'Keywords';
    case 'feature_bullets':
      return 'Feature bullets';
  }
}

function translationSectionLabel(section: TranslationSection): string {
  switch (section) {
    case 'app_store_description':
      return 'App Store description';
    case 'short_description':
      return 'Short description';
    case 'keywords':
      return 'Keywords';
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

async function geminiGenerateJson({
  apiKey,
  systemPrompt,
  userContent,
  temperature,
}: {
  apiKey: string;
  systemPrompt: string;
  userContent: string;
  temperature: number;
}): Promise<{ parsed: unknown; rawText: string; usageTokens: number | null }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText.slice(0, 500)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Unexpected Gemini response shape');
  }

  const parsed = parseGeminiJson(text);

  const usage = data?.usageMetadata;
  const tokens =
    typeof usage?.totalTokenCount === 'number'
      ? usage.totalTokenCount
      : typeof usage?.promptTokenCount === 'number' &&
          typeof usage?.candidatesTokenCount === 'number'
        ? usage.promptTokenCount + usage.candidatesTokenCount
        : null;

  return { parsed, rawText: text, usageTokens: tokens };
}

async function generateDraftForTone({
  apiKey,
  planRow,
  tone,
  sections,
}: {
  apiKey: string;
  planRow: { config: string; scraped: string; stages: string; generated: string };
  tone: Tone;
  sections: DraftSection[];
}): Promise<Record<string, string>> {
  const config = JSON.parse(planRow.config || '{}');
  const scraped = JSON.parse(planRow.scraped || '{}');
  const stages = JSON.parse(planRow.stages || '{}');

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

Write a complete first-draft of app listing copy based on the provided app marketing plan.
Tone: ${tone}.

Output MUST be valid JSON only (no markdown, no commentary). The JSON must be an object where each key is one of the requested sections, and the value is a string.

Sections requested:
${sections.map((s) => `- ${s}: ${draftSectionLabel(s)}`).join('\n')}

Writing requirements by section:
- app_store_description: 800-2000 characters. Use short paragraphs, benefits-first, include a light CTA.
- short_description: 60-80 characters (store-friendly). No quotes.
- keywords: comma-separated keywords (15-30), no hashtags.
- feature_bullets: 5-8 bullets, each max ~12 words.

Use the app's differentiators and audience. Avoid making unverifiable claims (e.g., "#1", "guaranteed").`;

  const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${planRow.generated}`;

  const { parsed } = await geminiGenerateJson({
    apiKey,
    systemPrompt,
    userContent,
    temperature: 0.7,
  });

  const out: Record<string, string> = {};
  if (parsed && typeof parsed === 'object') {
    for (const s of sections) {
      const val = (parsed as Record<string, unknown>)[s];
      if (typeof val === 'string' && val.trim().length > 0) {
        out[s] = val.trim();
      }
    }
  }

  if (Object.keys(out).length === 0) {
    throw new Error('Model did not return requested draft sections');
  }

  return out;
}

async function generateTranslations({
  apiKey,
  planRow,
  targetLanguages,
  sections,
}: {
  apiKey: string;
  planRow: { config: string; scraped: string; stages: string; generated: string };
  targetLanguages: SupportedLanguage[];
  sections: TranslationSection[];
}): Promise<Record<string, Record<string, string>>> {
  const config = JSON.parse(planRow.config || '{}');
  const scraped = JSON.parse(planRow.scraped || '{}');
  const stages = JSON.parse(planRow.stages || '{}');

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
${sections.map((s) => `- ${s}: ${translationSectionLabel(s)}`).join('\n')}

Section requirements:
- app_store_description: 800-2000 characters (or natural equivalent length). Short paragraphs, benefits-first, light CTA.
- short_description: ~60-80 characters (store-friendly, no quotes). Localise length appropriately.
- keywords: comma-separated keywords (15-30). Use locale-appropriate search terms. No hashtags.

Quality/safety:
- Avoid unverifiable claims (e.g., "#1", "guaranteed").
- Keep brand/product names in original form.`;

  const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${planRow.generated}`;

  const { parsed } = await geminiGenerateJson({
    apiKey,
    systemPrompt,
    userContent,
    temperature: 0.6,
  });

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
    throw new Error('Model did not return requested translations');
  }

  return translations;
}

function buildDefaultAssetConfig(planConfig: Partial<AppConfig> | null | undefined): AssetConfig {
  const icon =
    typeof planConfig?.icon === 'string' &&
    planConfig.icon.trim() &&
    !/^https?:\/\//i.test(planConfig.icon)
      ? planConfig.icon.trim()
      : '🚀';

  return {
    name: planConfig?.app_name || 'Your App',
    tagline: planConfig?.one_liner || '',
    icon,
    url: planConfig?.app_url || planConfig?.repo_url || '',
    features: Array.isArray(planConfig?.differentiators)
      ? planConfig.differentiators.slice(0, 6)
      : [],
    colors: {
      background: '#0f172a',
      text: '#e2e8f0',
      primary: '#6366f1',
      secondary: '#8b5cf6',
    },
  };
}

async function renderAssetsToPngBuffers(assets: { type: string; width: number; height: number; html: string }[]) {
  let chromium;
  try {
    const pw = await import('playwright-core');
    chromium = pw.chromium;
  } catch {
    throw new Error(
      'Playwright is not installed. Run: npm install playwright-core && npx playwright-core install chromium'
    );
  }

  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const out: { filename: string; buffer: Buffer }[] = [];

    for (const asset of assets) {
      const context = await browser.newContext({
        viewport: { width: asset.width, height: asset.height },
      });
      const page = await context.newPage();

      await page.setContent(asset.html, { waitUntil: 'networkidle', timeout: 10000 });
      const screenshot = await page.screenshot({ type: 'png', timeout: 10000 });

      let filename = `${asset.type}.png`;
      if (asset.type === 'social-card') filename = 'twitter-card.png';

      out.push({ filename, buffer: Buffer.from(screenshot) });
      await context.close();
    }

    return out;
  } finally {
    await browser.close();
  }
}

let activeExportBundles = 0;
const MAX_CONCURRENT_EXPORTS = 1;

export async function POST(request: NextRequest) {
  if (activeExportBundles >= MAX_CONCURRENT_EXPORTS) {
    return NextResponse.json(
      { error: 'An export is already in progress. Please try again shortly.' },
      { status: 429 }
    );
  }

  activeExportBundles++;
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as Partial<ExportBundleRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const tones = Array.isArray(body.tones)
      ? body.tones.filter((t): t is Tone => VALID_TONES.includes(t as Tone))
      : [];

    const languages = Array.isArray(body.languages)
      ? body.languages.filter(
          (l): l is SupportedLanguage =>
            (SUPPORTED_LANGUAGES as readonly string[]).includes(l)
        )
      : [];

    const includeAssets = body.includeAssets !== false;

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey && (tones.length > 0 || languages.length > 0)) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const config = JSON.parse(row.config || '{}');

    const briefMd = typeof row.generated === 'string' ? row.generated : '';

    const exportErrors: {
      tones?: Record<string, string>;
      languages?: Record<string, string>;
      assets?: string;
    } = {};

    const copyByTone: Record<string, Record<string, string>> = {};
    const translationsByLang: Record<string, Record<string, string>> = {};

    const draftSections: DraftSection[] = [
      'app_store_description',
      'short_description',
      'keywords',
      'feature_bullets',
    ];

    const translationSections: TranslationSection[] = [
      'app_store_description',
      'short_description',
      'keywords',
    ];

    // Load previously generated content (plan_content)
    const savedDraftsRaw = getContent(planId, 'draft');
    const savedDrafts: Record<string, Record<string, string>> = {};
    if (Array.isArray(savedDraftsRaw)) {
      for (const item of savedDraftsRaw) {
        const tone = (item as any)?.contentKey;
        const content = (item as any)?.content;
        if (typeof tone === 'string' && content && typeof content === 'object') {
          savedDrafts[tone] = content as Record<string, string>;
        }
      }
    }

    const savedTranslationsRaw = getContent(planId, 'translations');
    const savedTranslations: Record<string, Record<string, string>> = {};
    if (Array.isArray(savedTranslationsRaw)) {
      for (const item of savedTranslationsRaw) {
        const lang = (item as any)?.contentKey;
        const content = (item as any)?.content;
        if (typeof lang === 'string' && content && typeof content === 'object') {
          savedTranslations[lang] = content as Record<string, string>;
        }
      }
    }

    const exportTones: Tone[] = tones.length > 0 ? tones : (Object.keys(savedDrafts) as Tone[]);
    const exportLanguages: SupportedLanguage[] =
      languages.length > 0 ? languages : (Object.keys(savedTranslations) as SupportedLanguage[]);

    // 1) Drafts per tone (use saved, only regenerate missing)
    for (const tone of exportTones) {
      if (savedDrafts[tone]) {
        copyByTone[tone] = savedDrafts[tone];
        continue;
      }

      if (!apiKey) continue;

      try {
        const draft = await generateDraftForTone({
          apiKey,
          planRow: row,
          tone,
          sections: draftSections,
        });
        copyByTone[tone] = draft;
        saveContent(planId, 'draft', tone, JSON.stringify(draft));
      } catch (e) {
        exportErrors.tones ||= {};
        exportErrors.tones[tone] = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    // 2) Translations (use saved, only regenerate missing)
    for (const [lang, content] of Object.entries(savedTranslations)) {
      translationsByLang[lang] = content;
    }

    const missingLanguages = exportLanguages.filter((l) => !savedTranslations[l]);

    if (apiKey && missingLanguages.length > 0) {
      try {
        const res = await generateTranslations({
          apiKey,
          planRow: row,
          targetLanguages: missingLanguages,
          sections: translationSections,
        });

        for (const [lang, content] of Object.entries(res)) {
          translationsByLang[lang] = content;
          saveContent(planId, 'translations', lang, JSON.stringify(content));
        }
      } catch (e) {
        exportErrors.languages ||= {};
        for (const lang of missingLanguages) {
          exportErrors.languages[lang] = e instanceof Error ? e.message : 'Unknown error';
        }
      }
    }

    // 3) Assets (best-effort)
    let pngBuffers: { filename: string; buffer: Buffer }[] = [];
    if (includeAssets) {
      try {
        const assetConfig = buildDefaultAssetConfig(config);
        const assets = generateAssets(assetConfig);
        pngBuffers = await renderAssetsToPngBuffers(assets);
      } catch (e) {
        exportErrors.assets = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    // 4) Package ZIP
    const passthrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 6 } });

    const chunks: Buffer[] = [];
    passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));

    const finishPromise = new Promise<Buffer>((resolve, reject) => {
      passthrough.on('end', () => resolve(Buffer.concat(chunks)));
      passthrough.on('error', reject);
      archive.on('error', reject);
    });

    archive.pipe(passthrough);

    // Root folder
    const root = 'marketing-pack';

    // brief
    archive.append(briefMd || '', { name: `${root}/brief.md` });

    // Saved (non-tone/language) artefacts
    const brandVoice = getContent(planId, 'brand-voice', null);
    if (brandVoice) {
      archive.append(JSON.stringify(brandVoice, null, 2), {
        name: `${root}/brand-voice.json`,
      });
    }

    const positioning = getContent(planId, 'positioning', null);
    if (positioning) {
      archive.append(JSON.stringify(positioning, null, 2), {
        name: `${root}/positioning.json`,
      });
    }

    const competitiveAnalysis = getContent(planId, 'competitive-analysis', null);
    if (competitiveAnalysis) {
      archive.append(JSON.stringify(competitiveAnalysis, null, 2), {
        name: `${root}/competitive-analysis.json`,
      });
    }

    const atoms = getContent(planId, 'atoms', null);
    if (atoms) {
      archive.append(JSON.stringify(atoms, null, 2), {
        name: `${root}/content-atoms.json`,
      });
    }

    const emails = getContent(planId, 'emails', null);
    if (emails) {
      archive.append(JSON.stringify(emails, null, 2), {
        name: `${root}/emails.json`,
      });
    }

    // copy
    for (const tone of Object.keys(copyByTone)) {
      archive.append(JSON.stringify(copyByTone[tone], null, 2), {
        name: `${root}/copy/${tone}.json`,
      });
    }

    // translations
    for (const lang of Object.keys(translationsByLang)) {
      archive.append(JSON.stringify(translationsByLang[lang], null, 2), {
        name: `${root}/translations/${lang}.json`,
      });
    }

    // assets
    for (const { filename, buffer } of pngBuffers) {
      archive.append(Readable.from(buffer), {
        name: `${root}/assets/${filename}`,
      });
    }

    // errors.json (only if something failed)
    if (Object.keys(exportErrors).length > 0) {
      archive.append(
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            planId,
            durationMs: Date.now() - startedAt,
            errors: exportErrors,
          },
          null,
          2
        ),
        { name: `${root}/errors.json` }
      );
    }

    await archive.finalize();
    const zipBuffer = await finishPromise;

    const appNameSlug = safeFilenamePart(config?.app_name || 'plan');
    const filename = `marketing-pack-${appNameSlug || planId}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('export-bundle error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    activeExportBundles--;
  }
}
