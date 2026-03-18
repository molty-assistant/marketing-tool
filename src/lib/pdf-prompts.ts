/**
 * Gemini prompts for the pay-once PDF generation pipeline.
 *
 * - generatePdfPositioning: Step 2 — brand positioning from scraped + intake
 * - generatePdfCopy: Step 3 — all copy sections (tier-aware)
 *   Pro tier makes two separate Gemini calls to stay within safe token budgets
 *   and avoid malformed JSON from overly large single responses.
 */

import { jsonrepair } from 'jsonrepair';
import type { PdfTier } from '@/lib/db';

// ─── Gemini helpers ───────────────────────────────────────────────────────────

function getApiKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error('GEMINI_API_KEY is not set');
  return k;
}

function geminiUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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

  // Fast path — well-formed response
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // jsonrepair handles: unescaped quotes, literal newlines in strings,
  // JS-style comments, trailing commas, missing quotes, truncated JSON
  try { return JSON.parse(jsonrepair(cleaned)); } catch { /* fall through */ }

  // Last resort: extract the outermost JSON object from the raw text and repair
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Model returned invalid JSON');
  try {
    return JSON.parse(jsonrepair(jsonMatch[0]));
  } catch (e) {
    throw new Error(`Model returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Retryable HTTP status codes from Gemini (transient overload / rate limit)
const RETRYABLE_STATUSES = new Set([429, 503, 502, 504]);
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 2_000; // 2s, 4s, 8s, 16s

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(params: {
  apiKey: string;
  systemPrompt: string;
  userContent: string;
  temperature: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }

    const res = await fetch(geminiUrl(params.apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(params.timeoutMs ?? 90_000),
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
      const msg = `Gemini API error (${res.status}): ${errorText.slice(0, 300)}`;
      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
        lastError = new Error(msg);
        continue;
      }
      throw new Error(msg);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') {
      throw new Error('Unexpected Gemini response shape');
    }

    return parseGeminiJson(text);
  }

  throw lastError ?? new Error('Gemini API failed after retries');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfPositioning {
  executiveSummary: {
    sentence: string;
    idealUser: string;
    coreMetric: string;
  };
  statement: string;
  icp: { who: string; pain: string; goal: string };
  valueProposition: string;
  supportingBullets: [string, string, string];
  whyNow: string;
}

export interface PdfBasicCopy {
  competitors: Array<{ name: string; emphasis: string; gap: string; angle: string }>;
  sayThisNotThat: Array<{ sayThis: string; notThat: string }>;
  landingPage: {
    headlines: Array<{ text: string; visualAssignment: string }>;
    subheadlines: string[];
    featureBullets: string[];
    shortCTAs: string[];
    longCTAs: Array<{ button: string; supporting: string }>;
    sectionOrder: string[];
  };
  socialPosts: {
    twitter: string[];
    linkedin: string[];
  };
}

export interface PdfProCopy extends PdfBasicCopy {
  opportunityGaps: [string, string];
  socialProofSuggestions: [string, string];
  betaTesterScript: string;
  visualDirection: {
    colorPalette: string;
    imageryStyle: string;
  };
  communityStrategy: {
    subreddits: string[];
    discordFacebook: string[];
    postScript: string;
  };
  emails: Array<{
    type: 'launch' | 'value' | 'urgency';
    subjectA: string;
    subjectB: string;
    previewText: string;
    body: string;
    ctaLabel: string;
  }>;
  contentPlan: {
    weeklySprints: Array<{
      week: number;
      theme: string;
      posts: Array<{
        title: string;
        postType: string;
        channel: string;
        intent: string;
      }>;
    }>;
  };
  adCopy: Array<{ angle: string; emotion: string; headline: string; body: string; cta: string }>;
  appStoreCopy: {
    subtitles: string[];
    shortDescriptions: string[];
    longDescription: string;
    keywords: string[];
  };
  toneOfVoice: {
    summary: string;
    dos: string[];
    donts: string[];
    sampleParagraph: string;
  };
}

// ─── Step 2: Positioning ──────────────────────────────────────────────────────

export async function generatePdfPositioning(
  scraped: Record<string, unknown>,
  intake: Record<string, unknown>
): Promise<PdfPositioning> {
  const apiKey = getApiKey();

  const systemPrompt = `You are a startup positioning strategist trained in April Dunford's "Obviously Awesome" methodology.

Your job: analyse the scraped product page and the founder's intake answers, then return a precise JSON positioning object.

Rules:
- Be specific to THIS product — no generic statements
- Do not just say the app is "AI-powered". You must explain the specific, tangible outcome the AI provides (e.g., instead of "AI location scout", say "Predicts golden hour lighting down to the minute")
- Positioning statement format: "[Product] is a [category] for [who] who [need], unlike [alternative] we [key differentiator]"
- ICP must name a specific person type, not "small businesses"
- All 3 supporting bullets must be concrete benefit statements (not features)
- Why now must connect to a real market shift, not just "the market is ready"
- Write in the founder's tone (energetic but credible)

Return ONLY this JSON object — no markdown, no comments:
{
  "executiveSummary": {
    "sentence": "Your App in 1 Sentence",
    "idealUser": "Your Ideal User",
    "coreMetric": "Core Metric to Track"
  },
  "statement": "one sentence positioning statement",
  "icp": {
    "who": "specific job title or persona",
    "pain": "the specific frustration they feel",
    "goal": "what they are actually trying to achieve"
  },
  "valueProposition": "one clear sentence on what makes this valuable",
  "supportingBullets": ["concrete benefit 1", "concrete benefit 2", "concrete benefit 3"],
  "whyNow": "one to two sentences on timing and market context"
}`;

  const userContent = `PRODUCT URL: ${scraped.url ?? 'unknown'}
PRODUCT NAME: ${scraped.name ?? 'unknown'}
PRODUCT DESCRIPTION: ${scraped.description ?? 'none'}
CATEGORY: ${scraped.category ?? 'unknown'}
PRICING: ${scraped.pricing ?? 'unknown'}
EXISTING FEATURES: ${JSON.stringify(scraped.features ?? [])}
EXISTING KEYWORDS: ${JSON.stringify(scraped.keywords ?? [])}

INTAKE ANSWERS:
${JSON.stringify(intake, null, 2)}`;

  const result = await callGemini({
    apiKey,
    systemPrompt,
    userContent,
    temperature: 0.4,
    maxOutputTokens: 2048,
    timeoutMs: 60_000,
  });

  return result as PdfPositioning;
}

// ─── Step 3: Copy sections ────────────────────────────────────────────────────
//
// Pro tier is split into TWO calls to stay within safe token budgets:
//   Call A — core copy (same sections as Basic, with higher counts)
//   Call B — Pro-only sections (emails, calendar, ads, app store, tone)
// This keeps each response under ~8000 tokens, avoiding malformed JSON.

const productContext = (scraped: Record<string, unknown>, intake: Record<string, unknown>) => `
PRODUCT URL: ${scraped.url ?? 'unknown'}
PRODUCT NAME: ${scraped.name ?? 'unknown'}
PRODUCT DESCRIPTION: ${scraped.description ?? 'none'}
CATEGORY: ${scraped.category ?? 'unknown'}
PRICING: ${scraped.pricing ?? 'unknown'}
FEATURES: ${JSON.stringify(scraped.features ?? [])}

INTAKE ANSWERS:
${JSON.stringify(intake, null, 2)}`;

async function generateCoreCopy(
  scraped: Record<string, unknown>,
  intake: Record<string, unknown>,
  positioning: PdfPositioning,
  isPro: boolean
): Promise<PdfBasicCopy> {
  const apiKey = getApiKey();

  const systemPrompt = `You are a world-class direct-response copywriter.

Generate the core copy package for this product as a single JSON object.
Use the positioning below as your creative foundation.

POSITIONING:
${JSON.stringify(positioning, null, 2)}

Output exactly this JSON structure — no markdown, no comments:
{
  "competitors": [{ "name": "string", "emphasis": "what they lead with", "gap": "their weakness", "angle": "your counter-angle" }],
  "sayThisNotThat": [{ "sayThis": "string", "notThat": "string" }],
  "landingPage": {
    "headlines": [{ "text": "string", "visualAssignment": "Visual suggestion for background or layout" }],
    "subheadlines": ["s1", "s2", "s3"],
    "featureBullets": ["Benefit — how it delivers"],
    "shortCTAs": ["string"],
    "longCTAs": [{ "button": "string", "supporting": "string" }],
    "sectionOrder": ["section name"]
  },
  "socialPosts": {
    "twitter": ["post text"],
    "linkedin": ["post text"]
  }
}

Exact counts required:
- competitors: ${isPro ? '3' : '2 or 3'}
- sayThisNotThat: ${isPro ? '5' : '3'} pairs (Make the 'Not That' sound boring, corporate, or overly technical to force a stark contrast)
- headlines: exactly 5 (most direct first)
- subheadlines: exactly 3
- featureBullets: ${isPro ? '12' : '8 to 10'} (format: "Concrete Benefit — how the product delivers it")
- shortCTAs: ${isPro ? '4' : '3'}
- longCTAs: ${isPro ? '3' : '2'}
- twitter posts: ${isPro ? '10' : '5'} (each under 280 chars, hook on first line, no placeholder links)
- linkedin posts: ${isPro ? '5' : '2'} (each 100 to 150 words, first-person founder voice)`;

  const result = await callGemini({
    apiKey,
    systemPrompt,
    userContent: productContext(scraped, intake),
    temperature: 0.6,
    maxOutputTokens: 8192,
    timeoutMs: 90_000,
  });

  return result as PdfBasicCopy;
}

async function generateProExtensions(
  scraped: Record<string, unknown>,
  intake: Record<string, unknown>,
  positioning: PdfPositioning
): Promise<Omit<PdfProCopy, keyof PdfBasicCopy>> {
  const apiKey = getApiKey();

  const systemPrompt = `You are a world-class direct-response copywriter and brand strategist.

Generate the Pro-tier extended copy package for this product as a single JSON object.
Use the positioning below as your creative foundation.

POSITIONING:
${JSON.stringify(positioning, null, 2)}

Output exactly this JSON structure — no markdown, no comments:
{
  "opportunityGaps": ["gap 1", "gap 2"],
  "socialProofSuggestions": ["suggestion 1", "suggestion 2"],
  "betaTesterScript": "3-line email template to request testimonials/quotes from users",
  "visualDirection": {
    "colorPalette": "description of the color vibe (e.g. Moody and high-contrast)",
    "imageryStyle": "how should the imagery/photos look"
  },
  "communityStrategy": {
    "subreddits": ["r/specific1", "r/specific2"],
    "discordFacebook": ["Specific group name 1", "Specific group name 2"],
    "postScript": "script on how to post in these communities without sounding like a spammy ad"
  },
  "emails": [
    { "type": "launch", "subjectA": "string", "subjectB": "string", "previewText": "string", "body": "string", "ctaLabel": "string" },
    { "type": "value", "subjectA": "string", "subjectB": "string", "previewText": "string", "body": "string", "ctaLabel": "string" },
    { "type": "urgency", "subjectA": "string", "subjectB": "string", "previewText": "string", "body": "string", "ctaLabel": "string" }
  ],
  "contentPlan": {
    "weeklySprints": [
      { "week": 1, "theme": "string", "posts": [{ "title": "string", "postType": "launch", "channel": "X", "intent": "one sentence" }] }
    ]
  },
  "adCopy": [
    { "angle": "angle name", "emotion": "curiosity", "headline": "string", "body": "string", "cta": "string" }
  ],
  "appStoreCopy": {
    "subtitles": ["string", "string", "string"],
    "shortDescriptions": ["string", "string"],
    "longDescription": "string",
    "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8"]
  },
  "toneOfVoice": {
    "summary": "one sentence tone description",
    "dos": ["do 1", "do 2", "do 3", "do 4", "do 5"],
    "donts": ["dont 1", "dont 2", "dont 3", "dont 4", "dont 5"],
    "sampleParagraph": "string"
  }
}

Exact counts required:
- opportunityGaps: exactly 2 (things competitors ignore that you can own)
- socialProofSuggestions: exactly 2 (specific types of proof to collect)
- emails: exactly 3 in order: launch, value, urgency. Write complete paste-ready bodies. Use [First Name] for personalisation.
- contentPlan.weeklySprints: exactly 4 sprints (Week 1: Introduction & Problem, Week 2: Deep Dives, Week 3: Proof, Week 4: Growth Hacks). Each sprint must have 3 to 5 posts.
- adCopy: exactly 5 angles. headline under 40 chars, body under 125 chars, cta under 20 chars
- appStoreCopy.subtitles: exactly 3. HARD LIMIT: each must be ≤30 characters including spaces and punctuation. Count every character before writing. If a draft is 31+ chars, shorten it — no exceptions.
- appStoreCopy.shortDescriptions: exactly 2. HARD LIMIT: each must be ≤80 characters including spaces and punctuation. Count every character before writing. If a draft is 81+ chars, shorten it — no exceptions.
- appStoreCopy.keywords: 8 to 10 keywords
- toneOfVoice.dos: exactly 5
- toneOfVoice.donts: exactly 5`;

  const result = await callGemini({
    apiKey,
    systemPrompt,
    userContent: productContext(scraped, intake),
    temperature: 0.6,
    maxOutputTokens: 12288,
    timeoutMs: 120_000,
  });

  return result as Omit<PdfProCopy, keyof PdfBasicCopy>;
}

export async function generatePdfCopy(
  scraped: Record<string, unknown>,
  intake: Record<string, unknown>,
  positioning: PdfPositioning,
  tier: PdfTier
): Promise<PdfBasicCopy | PdfProCopy> {
  const isPro = tier === 'pro';

  // Call A: core copy (runs for both tiers)
  const coreCopy = await generateCoreCopy(scraped, intake, positioning, isPro);

  if (!isPro) return coreCopy;

  // Call B: Pro-only extensions (separate call to keep each response manageable)
  const proExtensions = await generateProExtensions(scraped, intake, positioning);

  return { ...coreCopy, ...proExtensions } as PdfProCopy;
}
