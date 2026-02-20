import { ScrapedApp } from './types';

// Detect URL type
export function detectUrlType(url: string): 'appstore' | 'googleplay' | 'website' {
  if (url.includes('apps.apple.com') || url.includes('itunes.apple.com')) {
    return 'appstore';
  }
  if (url.includes('play.google.com')) {
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

// Scrape Google Play Store
export async function scrapeGooglePlay(url: string): Promise<ScrapedApp> {
  const packageName = extractPlayStorePackage(url);
  if (!packageName) {
    throw new Error('Could not extract package name from Google Play URL');
  }

  // Fetch the Google Play page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Google Play returned ${response.status}`);
  }

  const html = await response.text();

  // Extract data from meta tags and structured data
  const name = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTagContent(html, 'title') || packageName;
  const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || '';
  const icon = extractMeta(html, 'og:image') || '';

  // Try to extract rating
  const ratingMatch = html.match(/(\d+\.\d+)\s*star/i) || html.match(/"ratingValue":\s*"?(\d+\.?\d*)"?/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

  // Try to extract category
  const categoryMatch = html.match(/"genre":\s*"([^"]+)"/) || html.match(/itemprop="genre"[^>]*content="([^"]+)"/);
  const category = categoryMatch ? categoryMatch[1] : undefined;

  return {
    url,
    source: 'googleplay',
    name: name.replace(' - Apps on Google Play', '').trim(),
    icon: icon || undefined,
    description,
    shortDescription: description.substring(0, 160),
    screenshots: [],
    pricing: html.toLowerCase().includes('in-app purchases') ? 'Free with in-app purchases' : 'Free',
    rating,
    category,
    developer: undefined,
    features: extractFeatures(description),
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
