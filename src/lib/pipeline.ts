/**
 * Pipeline helper functions — extracted from API routes for reuse by generate-all.
 * Each function takes a planId (and optional params), calls Gemini, returns parsed data.
 */

import { getPlan } from '@/lib/db';

// ─── Shared ──────────────────────────────────────────

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
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Model returned invalid JSON');
    return JSON.parse(jsonMatch[0]);
  }
}

function getApiKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error('GEMINI_API_KEY is not set');
  return k;
}

function geminiUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
}

function buildAppContext(config: Record<string, unknown>) {
  return {
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
}

function loadPlan(planId: string) {
  const row = getPlan(planId);
  if (!row) throw new Error('Plan not found');
  const config = JSON.parse(row.config || '{}');
  const scraped = JSON.parse(row.scraped || '{}');
  const stages = JSON.parse(row.stages || '{}');
  return { row, config, scraped, stages, appContext: buildAppContext(config) };
}

async function callGemini(params: {
  apiKey: string;
  systemPrompt: string;
  userContent: string;
  temperature: number;
  maxOutputTokens?: number;
}): Promise<{ parsed: unknown; tokens: number | null }> {
  const res = await fetch(geminiUrl(params.apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ parts: [{ text: params.userContent }] }],
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxOutputTokens ?? 8192,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText.slice(0, 300)}`);
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

  return { parsed, tokens };
}

function userContentFor(p: ReturnType<typeof loadPlan>) {
  return `APP CONTEXT:\n${JSON.stringify(p.appContext)}\n\nSCRAPED INFO:\n${JSON.stringify(p.scraped)}\n\nPLAN STAGES:\n${JSON.stringify(p.stages)}\n\nFULL PLAN:\n${p.row.generated}`;
}

// ─── Brand Voice ──────────────────────────────────────

export async function generateBrandVoice(planId: string): Promise<unknown> {
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  const systemPrompt = `You are a brand strategist and copy chief trained in David Ogilvy's research-first methods.

Your job: extract the TRUE voice of this specific product from evidence in the input — the scraped app description, feature lists, existing marketing copy, and the marketing plan. Do NOT invent or project; distil what is already there.

Output MUST be valid JSON matching this exact shape:
{
  "voiceSummary": "2-3 sentences describing this product's unique voice",
  "personalityTraits": [
    { "trait": "trait name", "description": "what it means for THIS product", "example": "an example sentence in this voice" }
  ],
  "vocabularyGuide": {
    "wordsToUse": ["word1", "word2"],
    "wordsToAvoid": ["word1", "word2"],
    "phrasesToUse": ["phrase1"],
    "phrasesToAvoid": ["phrase1"]
  },
  "toneSpectrum": { "formal": 0, "playful": 0, "technical": 0, "emotional": 0 }
}

Constraints:
- voiceSummary: 2-3 sentences, specific to THIS product.
- personalityTraits: 5-8 traits.
- vocabularyGuide: 8-15 items per list where evidence supports it.
- toneSpectrum: integers 0-10.
- Do NOT output generic traits without concrete product-specific meaning.
- Do NOT fabricate product facts not present in the inputs.`;

  const { parsed } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: userContentFor(p),
    temperature: 0.5,
  });

  return parsed;
}

// ─── Positioning Angles ───────────────────────────────

export async function generatePositioningAngles(planId: string): Promise<unknown> {
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  const systemPrompt = `You are a direct-response positioning strategist.

Generate 3-5 positioning angles for THIS product.

Output MUST be valid JSON matching this exact shape:
{
  "angles": [
    {
      "name": "The [X] Angle",
      "hook": "one-liner hook",
      "psychology": "why this works",
      "headlineDirections": ["headline 1", "headline 2", "headline 3"],
      "bestFor": "where to use"
    }
  ],
  "antiPositioning": {
    "whatWeAreNot": ["not X", "not Y"],
    "whyItMatters": "explanation"
  },
  "recommendedPrimary": "angle name"
}

Constraints:
- 3-5 angles, each meaningfully different.
- 3 headlineDirections per angle.
- recommendedPrimary must exactly match one angle name.
- Avoid unverifiable claims.`;

  const { parsed } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: userContentFor(p),
    temperature: 0.7,
  });

  return parsed;
}

// ─── Competitive Analysis ─────────────────────────────

export async function generateCompetitiveAnalysis(
  planId: string
): Promise<{ competitive: unknown; perplexityUsed: boolean }> {
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  // Perplexity best-effort
  let competitorResearch = '';
  let perplexityUsed = false;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (perplexityKey) {
    try {
      const desc =
        (typeof p.scraped.description === 'string' ? p.scraped.description : '') ||
        (typeof p.scraped.appDescription === 'string' ? p.scraped.appDescription : '') ||
        (p.row.generated ? p.row.generated.slice(0, 800) : '');
      const resp = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${perplexityKey}` },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'system', content: 'You are a meticulous market researcher.' },
            {
              role: 'user',
              content: `Find 5-8 direct competitors for: ${p.config.app_name || 'Unknown'} (${p.config.category || 'Unknown'}). URL: ${p.config.app_url || 'N/A'}. Desc: ${desc.slice(0, 500)}. Return JSON: [{name,url,positioning,pricing}]`,
            },
          ],
          temperature: 0.2,
        }),
      });
      if (resp.ok) {
        const d = await resp.json();
        const c = d?.choices?.[0]?.message?.content;
        if (typeof c === 'string') {
          competitorResearch = c;
          perplexityUsed = true;
        }
      }
    } catch (e) {
      console.warn('Perplexity failed, Gemini-only:', e);
    }
  }

  const systemPrompt = `You are a sharp competitive intelligence analyst.

Build a competitive analysis for the given product.

Output MUST be valid JSON matching:
{
  "competitors": [
    { "name": "...", "url": "...", "positioning": "...", "pricing": "...",
      "strengths": ["..."], "weaknesses": ["..."], "keyMessaging": ["..."] }
  ],
  "gaps": ["..."], "opportunities": ["..."], "keywordGaps": ["..."]
}

4-8 competitors. 3-6 items per strengths/weaknesses/keyMessaging. 4-10 gaps/opportunities/keywordGaps.`;

  const uc = `${userContentFor(p)}\n\nCOMPETITOR RESEARCH (Perplexity):\n${competitorResearch || '(none)'}`;

  const { parsed } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: uc,
    temperature: 0.6,
  });

  return { competitive: parsed, perplexityUsed };
}

// ─── Generate Draft ───────────────────────────────────

type DraftSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets'
  | 'landing_page_hero';

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

function sectionLabel(section: DraftSection): string {
  const labels: Record<DraftSection, string> = {
    app_store_description: 'App Store description',
    short_description: 'Short description',
    keywords: 'Keywords',
    whats_new: "What's New",
    feature_bullets: 'Feature bullets',
    landing_page_hero: 'Landing page hero copy',
  };
  return labels[section];
}

export async function generateDraft(params: {
  planId: string;
  sections: DraftSection[];
  tone: Tone;
}): Promise<{ draft: Record<string, string>; tokens: number | null; tone: Tone }> {
  const { planId, sections, tone } = params;
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  const systemPrompt = `You are an expert app store copywriter.

Write a complete first-draft of app listing / landing page copy.
Tone: ${tone}.

Output MUST be valid JSON only. The JSON must be an object where each key is one of the requested sections, and the value is a string.

Sections requested:
${sections.map((s) => `- ${s}: ${sectionLabel(s)}`).join('\n')}

Writing requirements by section:
- app_store_description: 800-2000 characters. Short paragraphs, benefits-first, light CTA.
- short_description: 60-80 characters (store-friendly). No quotes.
- keywords: comma-separated keywords (15-30), no hashtags.
- whats_new: 2-4 short bullet lines (plausible).
- feature_bullets: 5-8 bullets, each max ~12 words.
- landing_page_hero: 1 headline + 1 subheadline + 1 primary CTA label, separated by newlines.

Avoid unverifiable claims.`;

  const { parsed, tokens } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: userContentFor(p),
    temperature: 0.7,
    maxOutputTokens: 4096,
  });

  const draft: Record<string, string> = {};
  if (parsed && typeof parsed === 'object') {
    for (const s of sections) {
      const val = (parsed as Record<string, unknown>)[s];
      if (typeof val === 'string') draft[s] = val.trim();
    }
  }

  if (Object.keys(draft).length === 0) {
    throw new Error('Model did not return the requested sections.');
  }

  return { draft, tokens, tone };
}

// ─── Generate Emails ──────────────────────────────────

type SequenceType = 'welcome' | 'launch' | 'nurture';

export async function generateEmailsSequence(params: {
  planId: string;
  sequenceType?: SequenceType;
  emailCount?: number;
}): Promise<unknown> {
  const p = loadPlan(params.planId);
  const apiKey = getApiKey();
  const sequenceType = params.sequenceType || 'welcome';
  const emailCount = Math.max(1, Math.min(20, params.emailCount || 7));

  const systemPrompt = `You are a direct-response email marketer.

Write a ${sequenceType} email sequence (${emailCount} emails).

Rules:
- Output MUST be valid JSON only.
- Benefit-led, specific, grounded. No hype. Each email body in Markdown.
- Include CTA: { text, action }. Include sendDelay.

Return JSON shape:
{
  "sequence": {
    "type": "${sequenceType}",
    "description": "...",
    "emails": [
      { "number": 1, "purpose": "...", "subjectLine": "...", "previewText": "...",
        "body": "...", "cta": { "text": "...", "action": "..." }, "sendDelay": "..." }
    ]
  }
}`;

  const uc = `${userContentFor(p)}\n\nREQUEST: sequenceType=${sequenceType}, emailCount=${emailCount}`;

  const { parsed, tokens } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: uc,
    temperature: 0.7,
  });

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    obj.metadata = { model: 'gemini-2.5-flash', tokens, sequenceType };
  }

  // Validate
  let emails: unknown = null;
  if (parsed && typeof parsed === 'object') {
    const seq = (parsed as Record<string, unknown>).sequence;
    if (seq && typeof seq === 'object') {
      emails = (seq as Record<string, unknown>).emails;
    }
  }
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error('Model did not return an email sequence.');
  }

  return parsed;
}

// ─── Atomize Content ──────────────────────────────────

export async function atomizeContent(params: {
  planId: string;
  sourceContent?: string;
  platforms?: string[];
}): Promise<unknown> {
  const p = loadPlan(params.planId);
  const apiKey = getApiKey();
  const platforms = params.platforms?.length ? params.platforms : ['linkedin', 'twitter', 'instagram', 'reddit', 'email'];
  const sourceContent = params.sourceContent?.trim() || '';

  const systemPrompt = `You are a content strategist and social copywriter.

Atomize ONE core piece of content into platform-native pieces.

Rules:
- Output MUST be valid JSON only.
- Generate 12-15+ content atoms across the requested platforms.
- If sourceContent is empty, create a corePiece first.

Return JSON shape:
{
  "corePiece": { "title": "...", "content": "..." },
  "atoms": [
    { "platform": "...", "format": "...", "content": "...",
      "hashtags": ["#tag"], "subreddits": ["/r/..."],
      "characterCount": 123, "notes": "..." }
  ]
}`;

  const uc = `${userContentFor(p)}\n\nplatforms=${JSON.stringify(platforms)}\nSOURCE CONTENT:\n${sourceContent || '(none)'}`;

  const { parsed, tokens } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: uc,
    temperature: 0.7,
  });

  // Fix up character counts + metadata
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const atoms = Array.isArray(obj.atoms) ? obj.atoms : [];
    for (const atom of atoms) {
      if (atom && typeof atom === 'object') {
        const a = atom as Record<string, unknown>;
        const c = typeof a.content === 'string' ? a.content : '';
        a.characterCount = c.length;
      }
    }
    obj.metadata = { model: 'gemini-2.5-flash', tokens, atomCount: atoms.length };
  }

  return parsed;
}

// ─── Generate Translations ────────────────────────────

type TranslationSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets';

export const SUPPORTED_LANGUAGES = [
  'es', 'fr', 'de', 'ja', 'ko', 'pt-BR', 'it', 'zh-Hans', 'nl', 'ar',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function languageLabel(code: string): string {
  const labels: Record<string, string> = {
    es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese',
    ko: 'Korean', 'pt-BR': 'Portuguese (Brazil)', it: 'Italian',
    'zh-Hans': 'Chinese (Simplified)', nl: 'Dutch', ar: 'Arabic',
  };
  return labels[code] || code;
}

export async function generateTranslations(params: {
  planId: string;
  targetLanguages: SupportedLanguage[];
  sections: TranslationSection[];
}): Promise<Record<string, Record<string, string>>> {
  const { planId, targetLanguages, sections } = params;
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  const systemPrompt = `You are an expert app store localisation copywriter.

Produce LOCALISED app store copy (not literal translation) for the requested languages.

Output MUST be valid JSON only.
The JSON MUST be an object with a top-level key "translations".
translations[language_code][section] = string.

Languages: ${targetLanguages.map((l) => `${l} (${languageLabel(l)})`).join(', ')}
Sections: ${sections.join(', ')}

Avoid unverifiable claims. Keep brand/product names in original form.`;

  const { parsed } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: userContentFor(p),
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
    throw new Error('Model did not return requested translations.');
  }

  return translations;
}
