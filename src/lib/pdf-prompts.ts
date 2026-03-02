/**
 * Gemini prompts for the pay-once PDF generation pipeline.
 *
 * Two functions:
 *  - generatePdfPositioning: Step 2 — brand positioning from scraped + intake
 *  - generatePdfCopy: Step 3 — all copy sections (tier-aware), uses positioning output
 *
 * Follows the callGemini pattern from src/lib/pipeline.ts.
 */

import type { PdfTier } from '@/lib/db';

// ─── Gemini helpers (inline copies — avoids coupling to pipeline.ts) ──────────

function getApiKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error('GEMINI_API_KEY is not set');
  return k;
}

function geminiUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
}

// Strip // comments outside string values (Gemini sometimes adds them)
function stripJsonComments(s: string): string {
  return s.replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*/g, (m, str) => str ?? '');
}

// Replace literal newlines/tabs inside JSON string values with escape sequences
function fixJsonNewlines(s: string): string {
  return s.replace(/"(?:[^"\\]|\\.)*"/g, (m) =>
    m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  );
}

// Remove trailing commas before ] or }
function fixTrailingCommas(s: string): string {
  return s.replace(/,(\s*[}\]])/g, '$1');
}

function parseGeminiJson(text: string): unknown {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    cleaned = '{' + cleaned + '}';
  }

  // Fast path — well-formed response
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // Repair: strip comments + fix newlines in strings + trailing commas
  const repaired = fixTrailingCommas(fixJsonNewlines(stripJsonComments(cleaned)));
  try { return JSON.parse(repaired); } catch { /* fall through */ }

  // Last resort: extract the outermost JSON object and repair that
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Model returned invalid JSON');
  try {
    return JSON.parse(fixTrailingCommas(fixJsonNewlines(stripJsonComments(jsonMatch[0]))));
  } catch (e) {
    throw new Error(`Model returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function callGemini(params: {
  apiKey: string;
  systemPrompt: string;
  userContent: string;
  temperature: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<unknown> {
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
    throw new Error(`Gemini API error (${res.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Unexpected Gemini response shape');
  }

  return parseGeminiJson(text);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfPositioning {
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
    headlines: string[];
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
  emails: Array<{
    type: 'launch' | 'value' | 'urgency';
    subjectA: string;
    subjectB: string;
    previewText: string;
    body: string;
    ctaLabel: string;
  }>;
  contentPlan: {
    weeklyThemes: [string, string, string, string];
    calendar: Array<{
      day: number;
      title: string;
      postType: string;
      channel: string;
      intent: string;
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
- The positioning statement must follow April Dunford's format: "[Product] is a [category] for [who] who [need], unlike [alternative] we [key differentiator]"
- ICP must name a specific person type, not "small businesses"
- All 3 supporting bullets must be concrete benefit statements (not features)
- "Why now" must connect to a real market shift or trend, not just "the market is ready"
- Write in the founder's tone (energetic but credible)
- Return ONLY a JSON object — no markdown fences, no // comments, no trailing commas
- All string values must be on a single line — no literal newline characters inside strings

Return ONLY valid JSON matching this exact schema:
{
  "statement": "string — one sentence positioning statement",
  "icp": {
    "who": "string — specific job title or persona",
    "pain": "string — the specific frustration they feel",
    "goal": "string — what they're actually trying to achieve"
  },
  "valueProposition": "string — one clear sentence on what makes this valuable",
  "supportingBullets": ["benefit 1", "benefit 2", "benefit 3"],
  "whyNow": "string — one paragraph on timing and market context"
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
  });

  return result as PdfPositioning;
}

// ─── Step 3: Copy sections ────────────────────────────────────────────────────

export async function generatePdfCopy(
  scraped: Record<string, unknown>,
  intake: Record<string, unknown>,
  positioning: PdfPositioning,
  tier: PdfTier
): Promise<PdfBasicCopy | PdfProCopy> {
  const apiKey = getApiKey();
  const isPro = tier === 'pro';

  const competitorCount = isPro ? 'exactly 3' : '2 or 3';
  const sayThisCount = isPro ? '5' : '3';
  const bulletCount = isPro ? 'exactly 12' : '8 to 10';
  const shortCtaCount = isPro ? '4' : '3';
  const longCtaCount = isPro ? '3' : '2';
  const twitterCount = isPro ? '10' : '5';
  const linkedinCount = isPro ? '5' : '2';

  const basicSchema = `{
  "competitors": [
    {
      "name": "string",
      "emphasis": "string — what they lead with",
      "gap": "string — their weakness or blind spot",
      "angle": "string — the specific angle to use against them"
    }
  ],
  "sayThisNotThat": [
    { "sayThis": "string", "notThat": "string" }
  ],
  "landingPage": {
    "headlines": ["string", "string", "string", "string", "string"],
    "subheadlines": ["string", "string", "string"],
    "featureBullets": ["Concrete Benefit — how the product delivers it"],
    "shortCTAs": ["string"],
    "longCTAs": [{ "button": "string", "supporting": "string" }],
    "sectionOrder": ["string"]
  },
  "socialPosts": {
    "twitter": ["string"],
    "linkedin": ["string"]
  }
}

Counts (floor = ceiling — generate EXACTLY these quantities):
- competitors: ${competitorCount}
- sayThisNotThat pairs: ${sayThisCount}
- headlines: exactly 5 (most direct first)
- subheadlines: exactly 3
- featureBullets: ${bulletCount} (format: "[Concrete Benefit] — [how it delivers]")
- shortCTAs: ${shortCtaCount}
- longCTAs: ${longCtaCount}
- twitter posts: ${twitterCount} (each <=280 chars, hook on first line)
- linkedin posts: ${linkedinCount} (each 100-150 words, no [link] placeholders)`;

  const proExtensions = `

PRO ONLY — also include these top-level keys in the same JSON object:
  "opportunityGaps": ["string", "string"],
  "socialProofSuggestions": ["string", "string"],
  "emails": [
    {
      "type": "launch",
      "subjectA": "string",
      "subjectB": "string",
      "previewText": "string",
      "body": "string",
      "ctaLabel": "string"
    },
    { "type": "value", "subjectA": "string", "subjectB": "string", "previewText": "string", "body": "string", "ctaLabel": "string" },
    { "type": "urgency", "subjectA": "string", "subjectB": "string", "previewText": "string", "body": "string", "ctaLabel": "string" }
  ],
  "contentPlan": {
    "weeklyThemes": ["Week 1 theme", "Week 2 theme", "Week 3 theme", "Week 4 theme"],
    "calendar": [
      { "day": 1, "title": "string", "postType": "launch|value|build-in-public|social-proof|engagement", "channel": "X|LinkedIn|both", "intent": "string" }
    ]
  },
  "adCopy": [
    { "angle": "string", "emotion": "curiosity|FOMO|aspiration|pain|social-proof", "headline": "string", "body": "string", "cta": "string" }
  ],
  "appStoreCopy": {
    "subtitles": ["string", "string", "string"],
    "shortDescriptions": ["string", "string"],
    "longDescription": "string",
    "keywords": ["string", "string", "string", "string", "string", "string", "string", "string"]
  },
  "toneOfVoice": {
    "summary": "string",
    "dos": ["string", "string", "string", "string", "string"],
    "donts": ["string", "string", "string", "string", "string"],
    "sampleParagraph": "string"
  }

Pro counts (floor = ceiling):
- opportunityGaps: exactly 2
- socialProofSuggestions: exactly 2
- emails: exactly 3 in order — launch, value, urgency. Write complete paste-ready bodies using [First Name] for personalisation.
- contentPlan.calendar: exactly 30 rows for days 1-30
- adCopy: exactly 5 angles (headline <=40 chars, body <=125 chars, cta <=20 chars)
- appStoreCopy.subtitles: exactly 3 (each <=30 chars)
- appStoreCopy.shortDescriptions: exactly 2 (each <=80 chars)
- appStoreCopy.keywords: 8-10 keywords
- toneOfVoice.dos: exactly 5
- toneOfVoice.donts: exactly 5`;

  const systemPrompt = `You are a world-class direct-response copywriter and brand strategist.

Your job: using the product info, positioning, and intake answers provided, generate ${isPro ? 'a comprehensive Pro-tier' : 'a focused Basic-tier'} copy package as JSON.

POSITIONING ALREADY ESTABLISHED (use this as your creative foundation):
${JSON.stringify(positioning, null, 2)}

Rules:
- Every headline must be specific to this product — no generic hooks
- Feature bullets format: "[Concrete Benefit] — [how the product delivers it]"
- CTAs must be action-oriented and specific, not just "Get Started"
- X/Twitter posts: hook on line 1, <=280 chars total, no [link] placeholders
- LinkedIn posts: 100-150 words, first-person founder voice
${isPro ? `- Emails: write complete, paste-ready email bodies. Where personalisation is needed write [First Name] — never use {{ }} template syntax.
- 30-day calendar: be specific with post titles/hooks — not just "Post about feature X"
- Ad copy: tight character counts are HARD LIMITS
- App store copy: optimise for the actual app store keyword algorithm` : ''}
- Artefact counts are both a floor AND a ceiling — generate EXACTLY the specified quantities
- Return ONLY a JSON object — no markdown fences, no // comments, no trailing commas
- All string values must be on a single line — no literal newline characters inside strings (use \\n if needed)

Return ONLY valid JSON. Schema:
${basicSchema}
${isPro ? proExtensions : ''}`;

  const userContent = `PRODUCT URL: ${scraped.url ?? 'unknown'}
PRODUCT NAME: ${scraped.name ?? 'unknown'}
PRODUCT DESCRIPTION: ${scraped.description ?? 'none'}
CATEGORY: ${scraped.category ?? 'unknown'}
PRICING: ${scraped.pricing ?? 'unknown'}
FEATURES: ${JSON.stringify(scraped.features ?? [])}

INTAKE ANSWERS:
${JSON.stringify(intake, null, 2)}`;

  const result = await callGemini({
    apiKey,
    systemPrompt,
    userContent,
    temperature: 0.6,
    maxOutputTokens: isPro ? 16384 : 8192,
    timeoutMs: isPro ? 180_000 : 90_000, // Pro generates ~16k tokens — give it 3 minutes
  });

  return result as PdfBasicCopy | PdfProCopy;
}
