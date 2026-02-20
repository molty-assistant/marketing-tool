export type PlayStoreScrapeResult = {
  name: string;
  oneLiner: string;
  description: string;
  category: string;
  source: 'playstore';
  url: string;
  icon?: string;
  screenshots: string[];
  rating?: number;
  ratingCount?: number;
  pricing: string;
  developer?: string;
  features: string[];
  keywords: string[];
  whatsNew?: string;
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstMatch(re: RegExp, text: string): string | undefined {
  const m = re.exec(text);
  if (!m) return undefined;
  return m[1];
}

function safeJsonParse<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const key = s.trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function normalizePricing(price: unknown): string {
  if (price == null) return 'Unknown';
  if (typeof price === 'number') return price === 0 ? 'Free' : String(price);
  if (typeof price === 'string') {
    const p = price.trim();
    if (p === '0' || p.toLowerCase() === '0.00') return 'Free';
    if (p.toLowerCase() === 'free') return 'Free';
    return p || 'Unknown';
  }
  return 'Unknown';
}

type LdJson = Record<string, unknown>;
type SoftwareApplicationLike = {
  name?: unknown;
  author?: { name?: unknown } | unknown;
  publisher?: { name?: unknown } | unknown;
  brand?: { name?: unknown } | unknown;
  description?: unknown;
  aggregateRating?: { ratingValue?: unknown; ratingCount?: unknown; reviewCount?: unknown } | unknown;
  applicationCategory?: unknown;
  genre?: unknown;
  offers?: { price?: unknown; lowPrice?: unknown; highPrice?: unknown } | unknown;
  image?: unknown;
  screenshot?: unknown;
};

function extractLdJsonBlocks(html: string): LdJson[] {
  const blocks: LdJson[] = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    const decoded = decodeHtmlEntities(raw);
    const parsed = safeJsonParse<unknown>(decoded);
    if (!parsed) continue;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === 'object') blocks.push(item as LdJson);
      }
    } else if (parsed && typeof parsed === 'object') {
      blocks.push(parsed as LdJson);
    }
  }
  return blocks;
}

function pickSoftwareApplication(blocks: LdJson[]): LdJson | undefined {
  // Prefer SoftwareApplication / MobileApplication blocks.
  const preferred = blocks.find(
    (b) => b['@type'] === 'SoftwareApplication' || b['@type'] === 'MobileApplication'
  );
  return preferred ?? blocks[0];
}

function extractMetaContent(html: string, attr: string, value: string): string | undefined {
  // Example: <meta property="og:image" content="...">
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i'
  );
  const match = firstMatch(re, html);
  return match ? decodeHtmlEntities(match) : undefined;
}

function extractAllPlayImages(html: string): string[] {
  const matches = html.match(/https:\/\/play-lh\.googleusercontent\.com\/[^"'\s)<>]+/g) ?? [];
  const cleaned = matches.map((u) => decodeHtmlEntities(u));
  return uniq(cleaned);
}

function deriveOneLiner(description: string): string {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return sentence.length <= 140 ? sentence : `${sentence.slice(0, 137).trim()}...`;
}

export function parsePlayStoreHtml(url: string, html: string): PlayStoreScrapeResult {
  const ldBlocks = extractLdJsonBlocks(html);
  const app = (pickSoftwareApplication(ldBlocks) ?? {}) as SoftwareApplicationLike;
  const authorName =
    app.author && typeof app.author === 'object' && 'name' in app.author && typeof (app.author as { name?: unknown }).name === 'string'
      ? (app.author as { name: string }).name.trim()
      : '';
  const publisherName =
    app.publisher && typeof app.publisher === 'object' && 'name' in app.publisher && typeof (app.publisher as { name?: unknown }).name === 'string'
      ? (app.publisher as { name: string }).name.trim()
      : '';
  const brandName =
    app.brand && typeof app.brand === 'object' && 'name' in app.brand && typeof (app.brand as { name?: unknown }).name === 'string'
      ? (app.brand as { name: string }).name.trim()
      : '';
  const aggregate =
    app.aggregateRating && typeof app.aggregateRating === 'object'
      ? (app.aggregateRating as { ratingValue?: unknown; ratingCount?: unknown; reviewCount?: unknown })
      : {};
  const offersObj =
    app.offers && typeof app.offers === 'object'
      ? (app.offers as { price?: unknown; lowPrice?: unknown; highPrice?: unknown })
      : {};

  const name: string =
    (typeof app.name === 'string' && app.name.trim()) ||
    decodeHtmlEntities(firstMatch(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html) ?? '') ||
    '';

  const developer: string | undefined =
    authorName ||
    publisherName ||
    brandName ||
    extractMetaContent(html, 'name', 'author');

  const descriptionFromLd = typeof app.description === 'string' ? decodeHtmlEntities(app.description) : undefined;
  const descriptionFromMeta = extractMetaContent(html, 'name', 'description');
  const description = stripTags(decodeHtmlEntities(descriptionFromLd ?? descriptionFromMeta ?? '')).trim();

  const rating: number | undefined =
    typeof aggregate.ratingValue === 'number'
      ? aggregate.ratingValue
      : typeof aggregate.ratingValue === 'string'
        ? Number(aggregate.ratingValue)
        : undefined;

  const ratingCount: number | undefined =
    typeof aggregate.ratingCount === 'number'
      ? aggregate.ratingCount
      : typeof aggregate.ratingCount === 'string'
        ? Number(aggregate.ratingCount)
        : typeof aggregate.reviewCount === 'number'
          ? aggregate.reviewCount
          : typeof aggregate.reviewCount === 'string'
            ? Number(aggregate.reviewCount)
            : undefined;

  const category: string =
    (typeof app.applicationCategory === 'string' && app.applicationCategory.trim()) ||
    (typeof app.genre === 'string' && app.genre.trim()) ||
    (extractMetaContent(html, 'itemprop', 'genre') ?? '').trim() ||
    (extractMetaContent(html, 'property', 'og:category') ?? '').trim() ||
    'Unknown';

  // Pricing
  const price = offersObj.price ?? offersObj.lowPrice ?? offersObj.highPrice;
  const pricing = normalizePricing(price);

  // Icon
  const iconFromLd =
    typeof app.image === 'string'
      ? decodeHtmlEntities(app.image)
      : Array.isArray(app.image)
        ? (app.image.find((x: unknown): x is string => typeof x === 'string') as string | undefined)
        : undefined;
  const iconFromMeta = extractMetaContent(html, 'property', 'og:image') ?? extractMetaContent(html, 'name', 'twitter:image');
  const icon = iconFromMeta ?? iconFromLd;

  // Screenshots
  const screenshotsFromLd: string[] = Array.isArray(app.screenshot)
    ? app.screenshot.filter((x: unknown): x is string => typeof x === 'string').map((x: string) => decodeHtmlEntities(x))
    : typeof app.screenshot === 'string'
      ? [decodeHtmlEntities(app.screenshot)]
      : [];

  const allImages = extractAllPlayImages(html);
  const screenshotsFallback = allImages
    .filter((u) => !icon || u !== icon)
    // Heuristic: screenshots are often wider; keep ones with "=w" or "=s" sizing params.
    .filter((u) => /=[sw]\d+/i.test(u) || /\bw\d+\b/i.test(u))
    .slice(0, 10);

  const screenshots = uniq([...screenshotsFromLd, ...screenshotsFallback]).slice(0, 10);

  // What's new / recent changes (best-effort)
  const recentChangesRaw =
    firstMatch(/"recentChanges"\s*:\s*"([^"]+)"/i, html) ||
    firstMatch(/"whatsNew"\s*:\s*"([^"]+)"/i, html);
  const whatsNew = recentChangesRaw ? stripTags(decodeHtmlEntities(recentChangesRaw)).trim() : undefined;

  const oneLiner = deriveOneLiner(description);

  return {
    name: name || 'Unknown',
    oneLiner,
    description,
    category,
    source: 'playstore',
    url,
    icon,
    screenshots,
    rating: Number.isFinite(rating) ? rating : undefined,
    ratingCount: Number.isFinite(ratingCount) ? ratingCount : undefined,
    pricing,
    developer,
    features: [],
    keywords: [],
    ...(whatsNew ? { whatsNew } : {}),
  };
}
