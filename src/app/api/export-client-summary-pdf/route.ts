import { NextRequest, NextResponse } from 'next/server';
import { chromium, type Browser } from 'playwright';
import { getContent, getPlan, getPlanContent } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ClientSummaryPdfRequest {
  planId?: string;
  tone?: string;
  channel?: string;
  channels?: string[];
}

type JsonRecord = Record<string, unknown>;

interface ExamplePost {
  channel: string;
  text: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  reddit: 'Reddit',
  hackernews: 'Hacker News',
  hn: 'Hacker News',
  twitter: 'X/Twitter',
  x: 'X/Twitter',
  linkedin: 'LinkedIn',
  producthunt: 'Product Hunt',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  email: 'Email',
  youtube: 'YouTube',
  facebook: 'Facebook',
  appstore: 'App Store',
  googleplay: 'Google Play',
  web: 'Website',
};

const CHANNEL_TEXT_MATCHERS: Array<{ key: string; pattern: RegExp }> = [
  { key: 'reddit', pattern: /\breddit\b/i },
  { key: 'hackernews', pattern: /\b(hacker\s*news|hn)\b/i },
  { key: 'twitter', pattern: /\b(twitter|x\/twitter|x)\b/i },
  { key: 'linkedin', pattern: /\blinkedin\b/i },
  { key: 'producthunt', pattern: /\bproduct\s*hunt\b/i },
  { key: 'instagram', pattern: /\binstagram\b/i },
  { key: 'tiktok', pattern: /\btik\s*tok|tiktok\b/i },
  { key: 'email', pattern: /\bemail\b/i },
  { key: 'youtube', pattern: /\byoutube\b/i },
  { key: 'facebook', pattern: /\bfacebook\b/i },
  { key: 'appstore', pattern: /\bapp\s*store\b/i },
  { key: 'googleplay', pattern: /\bgoogle\s*play\b/i },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

function getFilename(planName: string) {
  const safe = slugify(planName || 'plan');
  return `client-summary-${safe}.pdf`;
}

function safeParseObject(raw: string | null | undefined): JsonRecord {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as JsonRecord) : {};
  } catch {
    return {};
  }
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function clip(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function normalizeMarkdownInline(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~]/g, '')
      .replace(/^#+\s+/g, '')
  );
}

function extractMarkdownBullets(markdown: string, limit: number): string[] {
  if (!markdown) return [];
  const out: string[] = [];
  const lines = markdown.split('\n');
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (/^-\s+\[[ xX]\]/.test(trimmed)) continue;

    let candidate = '';
    if (/^[-*]\s+/.test(trimmed)) {
      candidate = trimmed.replace(/^[-*]\s+/, '');
    } else if (/^\d+\.\s+/.test(trimmed)) {
      candidate = trimmed.replace(/^\d+\.\s+/, '');
    } else if (/^>\s+/.test(trimmed)) {
      candidate = trimmed.replace(/^>\s+/, '');
    } else {
      continue;
    }

    const normalized = normalizeMarkdownInline(candidate);
    if (normalized.length < 8) continue;
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function splitSentences(text: string, limit: number): string[] {
  const sentences = normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return sentences.slice(0, limit);
}

function dedupeStrings(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeChannelKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function channelLabel(value: string): string {
  const key = normalizeChannelKey(value);
  if (CHANNEL_LABELS[key]) return CHANNEL_LABELS[key];
  const fallback = value.replace(/[-_]+/g, ' ').trim();
  if (!fallback) return 'Channel';
  return fallback
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function extractChannelsFromText(text: string): string[] {
  const out: string[] = [];
  for (const matcher of CHANNEL_TEXT_MATCHERS) {
    if (matcher.pattern.test(text)) {
      out.push(channelLabel(matcher.key));
    }
  }
  return out;
}

function extractAudience(config: JsonRecord, scraped: JsonRecord, generated: string): string {
  const direct = safeString(config.target_audience);
  if (direct) return direct;

  const fromGenerated = generated.match(/target audience[:\s-]+([^\n]+)/i)?.[1];
  if (fromGenerated) return clip(normalizeMarkdownInline(fromGenerated), 140);

  const category = safeString(scraped.category);
  if (category) return `People looking for ${category} solutions`;

  return 'Teams and users in your core category';
}

function extractPrimaryBenefits(config: JsonRecord, scraped: JsonRecord, foundation: string): string[] {
  const candidates: string[] = [];
  candidates.push(...safeStringArray(config.differentiators));
  candidates.push(...safeStringArray(scraped.features));

  const oneLiner = safeString(config.one_liner);
  if (oneLiner) candidates.push(oneLiner);

  const foundationBullets = extractMarkdownBullets(foundation, 8).filter((line) =>
    /(faster|simpl|speed|save|less|more|better|easy|quick|automate|private|secure|reliable|focus)/i.test(
      line
    )
  );
  candidates.push(...foundationBullets);

  return dedupeStrings(
    candidates.map((line) => clip(normalizeMarkdownInline(line), 150)),
    5
  );
}

function extractKeyMessages({
  config,
  stages,
  generated,
  positioning,
  brandVoice,
}: {
  config: JsonRecord;
  stages: JsonRecord;
  generated: string;
  positioning: unknown;
  brandVoice: unknown;
}): string[] {
  const candidates: string[] = [];
  const oneLiner = safeString(config.one_liner);
  if (oneLiner) candidates.push(oneLiner);

  const positioningObj = toRecord(positioning);
  if (positioningObj) {
    const recommendedPrimary = safeString(positioningObj.recommendedPrimary);
    if (recommendedPrimary) {
      candidates.push(`Primary angle: ${recommendedPrimary}`);
    }

    const angles = Array.isArray(positioningObj.angles) ? positioningObj.angles : [];
    for (const angle of angles) {
      const angleObj = toRecord(angle);
      if (!angleObj) continue;
      const name = safeString(angleObj.name);
      const hook = safeString(angleObj.hook);
      if (name && hook) candidates.push(`${name}: ${hook}`);
      else if (hook) candidates.push(hook);
      if (candidates.length >= 8) break;
    }

    const anti = toRecord(positioningObj.antiPositioning);
    if (anti) {
      for (const item of safeStringArray(anti.whatWeAreNot).slice(0, 2)) {
        const normalized = item.replace(/^not\s+/i, '').trim();
        if (normalized) candidates.push(`Not ${normalized}`);
      }
    }
  }

  const brandVoiceObj = toRecord(brandVoice);
  if (brandVoiceObj) {
    const voiceSummary = safeString(brandVoiceObj.voiceSummary);
    if (voiceSummary) candidates.push(...splitSentences(voiceSummary, 2));

    const traits = Array.isArray(brandVoiceObj.personalityTraits)
      ? brandVoiceObj.personalityTraits
      : [];
    for (const trait of traits.slice(0, 2)) {
      const traitObj = toRecord(trait);
      if (!traitObj) continue;
      const name = safeString(traitObj.trait);
      const description = safeString(traitObj.description);
      if (name && description) {
        candidates.push(`${name}: ${description}`);
      }
    }
  }

  const foundation = safeString(stages.foundation);
  candidates.push(...extractMarkdownBullets(foundation, 5));

  if (candidates.length < 3) {
    candidates.push(...extractMarkdownBullets(generated, 6));
  }

  if (candidates.length < 3 && oneLiner) {
    candidates.push(oneLiner);
  }

  return dedupeStrings(
    candidates.map((line) => clip(normalizeMarkdownInline(line), 170)),
    6
  );
}

function extractRecommendedChannels({
  config,
  stages,
  generated,
  atoms,
  requestedChannels,
}: {
  config: JsonRecord;
  stages: JsonRecord;
  generated: string;
  atoms: unknown;
  requestedChannels: string[];
}): string[] {
  const candidates: string[] = [];
  candidates.push(...requestedChannels.map((channel) => channelLabel(channel)));
  candidates.push(...safeStringArray(config.distribution_channels).map((channel) => channelLabel(channel)));

  const distributionText = safeString(stages.distribution);
  if (distributionText) {
    candidates.push(...extractChannelsFromText(distributionText));
  }

  if (generated) {
    candidates.push(...extractChannelsFromText(generated));
  }

  const atomsObj = toRecord(atoms);
  if (atomsObj && Array.isArray(atomsObj.atoms)) {
    for (const atom of atomsObj.atoms) {
      const atomObj = toRecord(atom);
      if (!atomObj) continue;
      const platform = safeString(atomObj.platform);
      if (platform) candidates.push(channelLabel(platform));
    }
  }

  const output = dedupeStrings(candidates, 8);
  if (output.length > 0) return output;
  return ['LinkedIn', 'X/Twitter', 'Reddit'];
}

function atomEntries(payload: unknown): Array<{ platform: string; content: string }> {
  const obj = toRecord(payload);
  if (!obj || !Array.isArray(obj.atoms)) return [];

  const entries: Array<{ platform: string; content: string }> = [];
  for (const rawAtom of obj.atoms) {
    const atom = toRecord(rawAtom);
    if (!atom) continue;
    const content = safeString(atom.content);
    if (!content) continue;
    const platform = safeString(atom.platform) || 'social';
    entries.push({ platform, content: normalizeWhitespace(content) });
  }
  return entries;
}

function draftFallbackPosts({
  appName,
  oneLiner,
  appUrl,
  audience,
  benefits,
  keyMessages,
  channels,
}: {
  appName: string;
  oneLiner: string;
  appUrl: string;
  audience: string;
  benefits: string[];
  keyMessages: string[];
  channels: string[];
}): ExamplePost[] {
  const urlSuffix = appUrl ? ` ${appUrl}` : '';
  const benefitA = benefits[0] || oneLiner || 'get faster results';
  const benefitB = benefits[1] || keyMessages[0] || oneLiner || 'ship clearer messaging';
  const benefitC = benefits[2] || keyMessages[1] || oneLiner || 'focus on what matters';
  const channelA = channels[0] || 'LinkedIn';
  const channelB = channels[1] || 'X/Twitter';
  const channelC = channels[2] || 'Reddit';

  return [
    {
      channel: channelA,
      text: clip(`${appName}: ${oneLiner || benefitA}.${urlSuffix}`, 240),
    },
    {
      channel: channelB,
      text: clip(`Built for ${audience}. ${appName} helps you ${benefitB.toLowerCase()}.${urlSuffix}`, 240),
    },
    {
      channel: channelC,
      text: clip(`${benefitC}. If this sounds useful, check out ${appName}.${urlSuffix}`, 240),
    },
  ];
}

function extractExamplePosts({
  atoms,
  legacyAtoms,
  requestedChannels,
  appName,
  oneLiner,
  appUrl,
  audience,
  benefits,
  keyMessages,
  channels,
}: {
  atoms: unknown;
  legacyAtoms: unknown;
  requestedChannels: string[];
  appName: string;
  oneLiner: string;
  appUrl: string;
  audience: string;
  benefits: string[];
  keyMessages: string[];
  channels: string[];
}): ExamplePost[] {
  const preferredKeys = new Set(requestedChannels.map((value) => normalizeChannelKey(value)));
  const allEntries = [...atomEntries(atoms), ...atomEntries(legacyAtoms)];
  const seen = new Set<string>();
  const picked: ExamplePost[] = [];

  const tryAdd = (entry: { platform: string; content: string }, preferredOnly: boolean) => {
    const key = normalizeWhitespace(entry.content).toLowerCase();
    if (!key || seen.has(key)) return;
    const platformKey = normalizeChannelKey(entry.platform);
    if (preferredOnly && preferredKeys.size > 0 && !preferredKeys.has(platformKey)) return;
    seen.add(key);
    picked.push({
      channel: channelLabel(entry.platform),
      text: clip(entry.content, 240),
    });
  };

  for (const entry of allEntries) {
    tryAdd(entry, true);
    if (picked.length >= 3) return picked;
  }
  for (const entry of allEntries) {
    tryAdd(entry, false);
    if (picked.length >= 3) return picked;
  }

  const fallback = draftFallbackPosts({
    appName,
    oneLiner,
    appUrl,
    audience,
    benefits,
    keyMessages,
    channels,
  });

  for (const post of fallback) {
    if (picked.length >= 3) break;
    picked.push(post);
  }
  return picked.slice(0, 3);
}

function buildHtml(params: {
  appName: string;
  oneLiner: string;
  appUrl: string;
  audience: string;
  benefits: string[];
  keyMessages: string[];
  channels: string[];
  posts: ExamplePost[];
  tone: string;
}) {
  const {
    appName,
    oneLiner,
    appUrl,
    audience,
    benefits,
    keyMessages,
    channels,
    posts,
    tone,
  } = params;
  const generatedDate = new Date().toISOString().slice(0, 10);

  const keyMessagesHtml = keyMessages
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const benefitsHtml = benefits
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const channelsHtml = channels
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const postsHtml = posts
    .map(
      (post, index) => `
        <article class="post">
          <div class="post-label">Post ${index + 1} · ${escapeHtml(post.channel)}</div>
          <p>${escapeHtml(post.text)}</p>
        </article>
      `
    )
    .join('');

  const safeUrl = escapeHtml(appUrl || 'Not provided');
  const safeTone = tone ? escapeHtml(tone) : 'default';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(appName)} - Client Summary</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #0f172a;
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 12px;
        line-height: 1.45;
        background: #ffffff;
      }
      .sheet { width: 100%; }
      .hero {
        border: 1px solid #dbe2f0;
        border-radius: 12px;
        padding: 16px;
        background: linear-gradient(140deg, #eff6ff 0%, #eefbf6 100%);
      }
      .badge {
        display: inline-block;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #0b4f79;
        font-weight: 700;
      }
      h1 {
        margin: 6px 0 4px;
        font-size: 28px;
        line-height: 1.15;
        letter-spacing: -0.01em;
      }
      .one-liner {
        margin: 0;
        font-size: 14px;
        color: #0f172a;
      }
      .meta {
        margin-top: 8px;
        color: #475569;
        font-size: 11px;
      }
      .section {
        margin-top: 14px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px;
        background: #ffffff;
      }
      .section h2 {
        margin: 0 0 8px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #0f172a;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      ul {
        margin: 0;
        padding-left: 18px;
      }
      li {
        margin: 0 0 6px;
      }
      .audience {
        font-size: 13px;
        color: #0f172a;
        font-weight: 600;
      }
      .post {
        border: 1px solid #dbe2f0;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 8px;
        break-inside: avoid;
        background: #f8fafc;
      }
      .post:last-child { margin-bottom: 0; }
      .post-label {
        font-size: 10px;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .post p {
        margin: 0;
        color: #0f172a;
      }
      .footer {
        margin-top: 10px;
        color: #64748b;
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="hero">
        <div class="badge">Client Summary PDF</div>
        <h1>${escapeHtml(appName)}</h1>
        <p class="one-liner">${escapeHtml(oneLiner)}</p>
        <div class="meta">URL: ${safeUrl} · Tone: ${safeTone} · Generated: ${generatedDate}</div>
      </section>

      <section class="section">
        <h2>Positioning / Key Message</h2>
        <ul>${keyMessagesHtml}</ul>
      </section>

      <section class="grid">
        <article class="section">
          <h2>Target Audience</h2>
          <p class="audience">${escapeHtml(audience)}</p>
        </article>
        <article class="section">
          <h2>Primary Benefits</h2>
          <ul>${benefitsHtml}</ul>
        </article>
      </section>

      <section class="section">
        <h2>Recommended Channels</h2>
        <ul>${channelsHtml}</ul>
      </section>

      <section class="section">
        <h2>Example Social Posts</h2>
        ${postsHtml}
      </section>

      <div class="footer">Generated from your saved plan content (no new model generation).</div>
    </main>
  </body>
</html>`;
}

export async function POST(request: NextRequest) {
  let body: ClientSummaryPdfRequest;
  try {
    body = (await request.json()) as ClientSummaryPdfRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const planId = safeString(body.planId);
  if (!planId) {
    return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
  }

  const row = getPlan(planId);
  if (!row) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const config = safeParseObject(row.config);
  const scraped = safeParseObject(row.scraped);
  const stages = safeParseObject(row.stages);
  const generated = safeString(row.generated);

  const legacyContent = getPlanContent(planId);
  const positioningRaw = getContent(planId, 'positioning', null) ?? legacyContent.positioning ?? null;
  const brandVoiceRaw = getContent(planId, 'brand-voice', null) ?? legacyContent.brandVoice ?? null;
  const atomsRaw = getContent(planId, 'atoms', null) ?? null;
  const legacyAtomsRaw = legacyContent.atoms ?? null;

  const requestedChannels = dedupeStrings(
    [...safeStringArray(body.channels), safeString(body.channel)].filter(Boolean),
    8
  );

  const appName = safeString(config.app_name, 'Your App');
  const oneLiner = safeString(config.one_liner, 'Marketing strategy summary');
  const appUrl = safeString(config.app_url) || safeString(config.repo_url);
  const tone = safeString(body.tone, 'default');

  const keyMessages = extractKeyMessages({
    config,
    stages,
    generated,
    positioning: positioningRaw,
    brandVoice: brandVoiceRaw,
  });

  const audience = extractAudience(config, scraped, generated);
  const benefits = extractPrimaryBenefits(config, scraped, safeString(stages.foundation));
  const channels = extractRecommendedChannels({
    config,
    stages,
    generated,
    atoms: atomsRaw ?? legacyAtomsRaw,
    requestedChannels,
  });
  const posts = extractExamplePosts({
    atoms: atomsRaw,
    legacyAtoms: legacyAtomsRaw,
    requestedChannels,
    appName,
    oneLiner,
    appUrl,
    audience,
    benefits,
    keyMessages,
    channels,
  });

  const html = buildHtml({
    appName,
    oneLiner,
    appUrl,
    audience,
    benefits: benefits.length > 0 ? benefits : [oneLiner],
    keyMessages: keyMessages.length > 0 ? keyMessages : [oneLiner],
    channels,
    posts,
    tone,
  });

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      viewport: { width: 1200, height: 1600 },
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(120);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      preferCSSPageSize: true,
    });

    await context.close();

    const filename = getFilename(appName);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate client summary PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try {
      await browser?.close();
    } catch {
      // ignore close errors
    }
  }
}
