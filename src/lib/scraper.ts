import { ScrapedApp } from './types';
import * as cheerio from 'cheerio';

// Detect URL type
export function detectUrlType(url: string): 'appstore' | 'googleplay' | 'website' {
  if (url.includes('apps.apple.com') || url.includes('itunes.apple.com')) {
    return 'appstore';
  }

  // Only treat Google Play *app detail* URLs as googleplay sources
  // Example: https://play.google.com/store/apps/details?id=com.example.app
  if (/^https?:\/\/play\.google\.com\/store\/apps\/details\b/i.test(url) && /[?&]id=/.test(url)) {
    return 'googleplay';
  }

  return 'website';
}

// Extract App Store ID from URL
function extractAppStoreId(url: string): string | null {
  // Pattern: /id123456789 or id=123456789
  const match = url.match(/\/id(\d+)/) || url.match(/id=(\d+)/);
  return match ? match[1] : null;
}

// Extract Google Play package name from URL
function extractPlayStorePackage(url: string): string | null {
  const match = url.match(/id=([a-zA-Z0-9._]+)/);
  return match ? match[1] : null;
}

// Extract features from description text
function extractFeatures(description: string): string[] {
  const features: string[] = [];
  const lines = description.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match bullet points, dashes, or numbered items
    if (/^[-•◦▸▹●]\s+/.test(trimmed)) {
      const feature = trimmed.replace(/^[-•◦▸▹●]\s+/, '').trim();
      if (feature.length > 5 && feature.length < 200) {
        features.push(feature);
      }
    }
    // Match "✓" or "✔" prefixed items
    if (/^[✓✔☑]\s*/.test(trimmed)) {
      const feature = trimmed.replace(/^[✓✔☑]\s*/, '').trim();
      if (feature.length > 5) features.push(feature);
    }
  }

  // If no bullet features found, extract sentences that look like features
  if (features.length === 0) {
    const sentences = description.split(/[.!]\s+/);
    for (const s of sentences) {
      const trimmed = s.trim();
      if (trimmed.length > 10 && trimmed.length < 150 && !trimmed.includes('©') && !trimmed.includes('privacy')) {
        features.push(trimmed);
        if (features.length >= 6) break;
      }
    }
  }

  return features.slice(0, 10);
}

// Scrape Apple App Store via iTunes Lookup API
export async function scrapeAppStore(url: string): Promise<ScrapedApp> {
  const appId = extractAppStoreId(url);
  if (!appId) {
    throw new Error('Could not extract App Store ID from URL');
  }

  // Use iTunes Lookup API
  const apiUrl = `https://itunes.apple.com/lookup?id=${appId}&country=gb`;
  const response = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`iTunes API returned ${response.status}`);
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error('App not found in iTunes API');
  }

  const app = data.results[0];

  return {
    url,
    source: 'appstore',
    name: app.trackName || app.trackCensoredName || 'Unknown',
    icon: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60,
    description: app.description || '',
    shortDescription: app.description ? app.description.split('\n')[0].trim().substring(0, 160) : undefined,
    screenshots: [
      ...(app.screenshotUrls || []),
      ...(app.ipadScreenshotUrls || []),
    ].slice(0, 6),
    pricing: app.price === 0 ? 'Free' : `${app.formattedPrice || `$${app.price}`}`,
    rating: app.averageUserRating ? parseFloat(app.averageUserRating.toFixed(1)) : undefined,
    ratingCount: app.userRatingCount,
    category: app.primaryGenreName,
    developer: app.artistName || app.sellerName,
    features: extractFeatures(app.description || ''),
    keywords: app.genres || [],
  };
}

// Scrape Google Play Store (public HTML)
export async function scrapeGooglePlay(url: string): Promise<ScrapedApp> {
  const packageName = extractPlayStorePackage(url);
  if (!packageName) {
    throw new Error('Could not extract package name from Google Play URL');
  }

  const response = await fetch(url, {
    headers: {
      // Google Play frequently blocks requests without a real UA
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Google Play returned ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const jsonLd = extractJsonLd(html);
  const appLd = jsonLd.find((o) => o && (o['@type'] === 'SoftwareApplication' || o['@type'] === 'MobileApplication')) || {};

  const nameRaw =
    stringOrUndefined(appLd.name) ||
    extractMeta(html, 'og:title') ||
    extractMeta(html, 'twitter:title') ||
    extractTagContent(html, 'title') ||
    packageName;

  const descriptionRaw =
    stringOrUndefined(appLd.description) ||
    extractMeta(html, 'og:description') ||
    extractMeta(html, 'description') ||
    '';

  const description = stripHtml(decodeHtmlEntities(descriptionRaw)).trim();

  const icon =
    stringOrUndefined(appLd.image) ||
    extractMeta(html, 'og:image') ||
    extractMeta(html, 'twitter:image') ||
    undefined;

  const developer =
    stringOrUndefined(appLd.author?.name) ||
    stringOrUndefined(appLd.publisher?.name) ||
    stringOrUndefined(appLd.brand?.name) ||
    undefined;

  const rating = numberOrUndefined(appLd.aggregateRating?.ratingValue) ??
    (() => {
      const m = html.match(/"ratingValue"\s*:\s*"?(\d+(?:\.\d+)?)"?/);
      return m ? parseFloat(m[1]) : undefined;
    })();

  const ratingCount = numberOrUndefined(appLd.aggregateRating?.ratingCount) ??
    numberOrUndefined(appLd.aggregateRating?.reviewCount) ??
    (() => {
      const m = html.match(/"ratingCount"\s*:\s*"?(\d[\d,]*)"?/);
      return m ? parseInt(m[1].replace(/,/g, ''), 10) : undefined;
    })();

  const category =
    stringOrUndefined(appLd.applicationCategory) ||
    stringOrUndefined(appLd.genre) ||
    (() => {
      const m = html.match(/"genre"\s*:\s*"([^"]+)"/);
      return m ? m[1] : undefined;
    })();

  const { pricing, lastUpdated } = extractPlayPricingAndUpdated(appLd, html, $);

  const screenshots = extractPlayScreenshots(html, $, icon).slice(0, 6);

  const name = nameRaw.replace(' - Apps on Google Play', '').trim();

  return {
    url,
    source: 'googleplay',
    name,
    icon,
    description,
    shortDescription: description ? description.substring(0, 160) : undefined,
    screenshots,
    pricing,
    rating: typeof rating === 'number' ? parseFloat(rating.toFixed(1)) : undefined,
    ratingCount,
    category,
    developer,
    features: extractFeatures(description),
    lastUpdated,
  };
}

// Scrape generic website
export async function scrapeWebsite(url: string): Promise<ScrapedApp> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Website returned ${response.status}`);
  }

  const html = await response.text();

  const name = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTagContent(html, 'title') || new URL(url).hostname;
  const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || extractMeta(html, 'twitter:description') || '';
  const icon = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || '';

  // Extract headings for features
  const headings = extractHeadings(html);
  const features = headings.length > 0 ? headings : extractFeatures(description);

  // Try to detect pricing
  const pricingKeywords = ['free', 'pricing', 'plans', '$', '£', '€'];
  const htmlLower = html.toLowerCase();
  const hasPricing = pricingKeywords.some(kw => htmlLower.includes(kw));
  const pricing = htmlLower.includes('free') ? 'Free' : hasPricing ? 'Paid' : 'Unknown';

  // Extract category from meta keywords or content
  const keywords = extractMeta(html, 'keywords');
  const category = keywords ? keywords.split(',')[0].trim() : undefined;

  return {
    url,
    source: 'website',
    name: name.replace(/\s*[|–—]\s*.+$/, '').trim(),
    icon: icon || undefined,
    description,
    features,
    pricing,
    category,
    keywords: keywords ? keywords.split(',').map((k: string) => k.trim()) : undefined,
  };
}

// --- Google Play helpers ---
function extractJsonLd(html: string): any[] {
  const $ = cheerio.load(html);
  const objects: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).text();
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) objects.push(...parsed);
      else objects.push(parsed);
    } catch {
      // ignore
    }
  });
  return objects;
}

function stringOrUndefined(v: any): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function numberOrUndefined(v: any): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function currencyToSymbol(code?: string): string | undefined {
  if (!code) return undefined;
  const c = code.toUpperCase();
  if (c === 'USD') return '$';
  if (c === 'GBP') return '£';
  if (c === 'EUR') return '€';
  if (c === 'JPY') return '¥';
  if (c === 'INR') return '₹';
  return undefined;
}

function extractPlayPricingAndUpdated(appLd: any, html: string, $: cheerio.CheerioAPI): { pricing: string; lastUpdated?: string } {
  // Pricing
  const offer = appLd.offers;
  const price = numberOrUndefined(offer?.price);
  const currency = stringOrUndefined(offer?.priceCurrency);

  let pricing = 'Free';
  if (typeof price === 'number' && price > 0) {
    const symbol = currencyToSymbol(currency);
    pricing = symbol ? `${symbol}${price}` : currency ? `${price} ${currency}` : `${price}`;
  }

  // Many Play Store pages are free but mention IAPs
  const htmlLower = html.toLowerCase();
  if (pricing === 'Free' && htmlLower.includes('in-app purchases')) {
    pricing = 'Free with in-app purchases';
  }

  // Last updated
  let lastUpdated: string | undefined;

  // Try JSON-LD
  lastUpdated = stringOrUndefined(appLd.dateModified) || stringOrUndefined(appLd.datePublished);

  // Try DOM label (best-effort; layout changes often)
  if (!lastUpdated) {
    const updatedLabel = $('*:contains("Updated on")').filter((_, el) => $(el).children().length === 0).first();
    if (updatedLabel && updatedLabel.length) {
      const container = updatedLabel.parent();
      const text = container.text();
      const m = text.match(/Updated on\s*([A-Za-z]{3,}\s+\d{1,2},\s+\d{4}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{4}-\d{2}-\d{2})/);
      if (m) lastUpdated = m[1].trim();
    }
  }

  // Regex fallback
  if (!lastUpdated) {
    const m = html.match(/Updated on<\/div>\s*<div[^>]*>([^<]+)<\/div>/i);
    if (m) lastUpdated = decodeHtmlEntities(m[1].trim());
  }

  return { pricing, lastUpdated };
}

function extractPlayScreenshots(html: string, $: cheerio.CheerioAPI, icon?: string): string[] {
  const urls = new Set<string>();

  // DOM pass: collect image URLs (src + data-src)
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    const dataSrc = $(el).attr('data-src');
    const candidates = [src, dataSrc].filter(Boolean) as string[];
    for (const u of candidates) {
      if (u.includes('play-lh.googleusercontent.com')) urls.add(u);
    }
  });

  // Regex pass: Play renders a lot of URLs inside inline JSON
  const re = /https:\/\/play-lh\.googleusercontent\.com\/[^"\s\\]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    urls.add(match[0]);
  }

  const iconNorm = icon ? icon.split('=')[0] : undefined;

  const scored = Array.from(urls)
    .map((u) => {
      const base = u.split('=')[0];
      const dimMatch = u.match(/=w(\d+)-h(\d+)/);
      const w = dimMatch ? parseInt(dimMatch[1], 10) : 0;
      const h = dimMatch ? parseInt(dimMatch[2], 10) : 0;
      return { u, base, w, h, score: w * h };
    })
    .filter((x) => (iconNorm ? x.base !== iconNorm : true))
    // Prefer larger images (screenshots), avoid tiny icons
    .filter((x) => x.score === 0 || x.score >= 300 * 300)
    .sort((a, b) => b.score - a.score);

  const out: string[] = [];
  const bases = new Set<string>();
  for (const s of scored) {
    if (bases.has(s.base)) continue;
    bases.add(s.base);
    out.push(s.u);
    if (out.length >= 12) break;
  }

  return out;
}

// HTML parsing helpers
function extractMeta(html: string, name: string): string | undefined {
  // Try property first, then name
  const propRegex = new RegExp(`<meta[^>]*(?:property|name)=["'](?:og:|twitter:)?${escapeRegex(name)}["'][^>]*content=["']([^"']+)["']`, 'i');
  const propMatch = html.match(propRegex);
  if (propMatch) return decodeHtmlEntities(propMatch[1]);

  // Try reversed attribute order
  const revRegex = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:|twitter:)?${escapeRegex(name)}["']`, 'i');
  const revMatch = html.match(revRegex);
  if (revMatch) return decodeHtmlEntities(revMatch[1]);

  return undefined;
}

function extractTagContent(html: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const regex = /<h[2-4][^>]*>([^<]+)<\/h[2-4]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = decodeHtmlEntities(match[1].trim());
    if (text.length > 3 && text.length < 200) {
      headings.push(text);
    }
  }
  return headings.slice(0, 10);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

// Main scrape function
export async function scrapeUrl(url: string): Promise<ScrapedApp> {
  const type = detectUrlType(url);

  switch (type) {
    case 'appstore':
      return scrapeAppStore(url);
    case 'googleplay':
      return scrapeGooglePlay(url);
    case 'website':
      return scrapeWebsite(url);
  }
}
