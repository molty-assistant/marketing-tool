import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

type Review = {
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
};

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(input: string): string {
  // Minimal entity decoding (good enough for App Store content)
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseAppStoreReviewsFromHtml(html: string): {
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number | null;
} {
  const reviews: Review[] = [];

  // Attempt to parse review articles (Apple uses we-customer-review blocks)
  const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
  for (const a of articles) {
    if (!/we-customer-review/i.test(a)) continue;

    const authorMatch = a.match(/we-customer-review__user[^>]*>\s*([^<]+?)\s*</i);
    const titleMatch = a.match(/we-customer-review__title[^>]*>\s*([^<]+?)\s*</i);

    const timeMatch = a.match(/<time[^>]*datetime="([^"]+)"/i);

    // rating is frequently present as aria-label="4 out of 5"
    const ratingMatch = a.match(/aria-label="\s*([0-5])\s*out of\s*5\s*"/i);

    // body: try typical container
    let body = '';
    const bodyBlockMatch = a.match(/we-customer-review__body[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (bodyBlockMatch?.[1]) body = stripHtml(bodyBlockMatch[1]);

    // Fallback body parse
    if (!body) {
      const pMatch = a.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch?.[1]) body = stripHtml(pMatch[1]);
    }

    const author = decodeEntities((authorMatch?.[1] || '').trim());
    const title = decodeEntities((titleMatch?.[1] || '').trim());
    const date = (timeMatch?.[1] || '').trim();
    const rating = ratingMatch?.[1] ? Number(ratingMatch[1]) : NaN;

    if (!author && !title && !body) continue;

    reviews.push({
      author: author || 'Anonymous',
      rating: Number.isFinite(rating) ? rating : 0,
      title: title || '(No title)',
      body: decodeEntities(body || ''),
      date: date || '',
    });

    if (reviews.length >= 12) break;
  }

  // Average rating
  let averageRating: number | null = null;
  const avgMatch = html.match(/"averageRating"\s*:\s*([0-9]+\.?[0-9]*)/i);
  if (avgMatch?.[1]) averageRating = Number(avgMatch[1]);

  if (averageRating === null) {
    const ariaAvg = html.match(/aria-label="\s*([0-9]+\.?[0-9]*)\s*out of\s*5\s*"/i);
    if (ariaAvg?.[1]) averageRating = Number(ariaAvg[1]);
  }

  // Total ratings/reviews count
  let totalReviews: number | null = null;
  const countMatch = html.match(/"ratingCount"\s*:\s*(\d+)/i);
  if (countMatch?.[1]) totalReviews = Number(countMatch[1]);

  if (totalReviews === null) {
    const textCount = html.match(/([0-9][0-9,\.]+)\s+(?:Ratings|reviews|Reviews)/i);
    if (textCount?.[1]) {
      const n = Number(textCount[1].replace(/[,\.]/g, ''));
      if (Number.isFinite(n)) totalReviews = n;
    }
  }

  return { reviews, averageRating, totalReviews };
}

async function perplexityFallback(appStoreUrl: string): Promise<{
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number | null;
}> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const prompt = `You are gathering evidence for marketing research.

Task: Find recent user reviews for the iOS App Store listing at this URL:
${appStoreUrl}

Return ONLY valid JSON in this exact shape:
{
  "reviews": [
    {"author":"","rating":0,"title":"","body":"","date":""}
  ],
  "averageRating": 0,
  "totalReviews": 0
}

Rules:
- Provide 8-15 reviews if possible.
- rating must be an integer 1-5.
- date should be an ISO date string when possible (YYYY-MM-DD).
- If author/title unavailable, use "Anonymous" and "(No title)".
- Keep body concise but faithful (no paraphrase if you can quote).
- If you cannot find exact numbers for averageRating/totalReviews, set them to null.`;

  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a careful researcher. Output JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error('Perplexity error:', r.status, t);
    throw new Error(`Perplexity API error (${r.status})`);
  }

  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error('Unexpected Perplexity response');
  }

  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Perplexity returned invalid JSON');
    parsed = JSON.parse(m[0]);
  }

  const reviews: Review[] = Array.isArray(parsed?.reviews)
    ? parsed.reviews
        .filter(Boolean)
        .slice(0, 20)
        .map((rv: any) => ({
          author: typeof rv.author === 'string' && rv.author.trim() ? rv.author.trim() : 'Anonymous',
          rating: Number.isFinite(Number(rv.rating)) ? Math.max(1, Math.min(5, Number(rv.rating))) : 0,
          title: typeof rv.title === 'string' && rv.title.trim() ? rv.title.trim() : '(No title)',
          body: typeof rv.body === 'string' ? rv.body.trim() : '',
          date: typeof rv.date === 'string' ? rv.date.trim() : '',
        }))
    : [];

  const averageRating = typeof parsed?.averageRating === 'number' ? parsed.averageRating : null;
  const totalReviews = typeof parsed?.totalReviews === 'number' ? parsed.totalReviews : null;

  return { reviews, averageRating, totalReviews };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const appStoreUrl = typeof body.appStoreUrl === 'string' ? body.appStoreUrl : '';

    if (!planId) return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    if (!appStoreUrl) return NextResponse.json({ error: 'Missing "appStoreUrl"' }, { status: 400 });

    const row = getPlan(planId);
    if (!row) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const url = appStoreUrl;

    let html = '';
    try {
      const r = await fetch(url, {
        headers: {
          // App Store is picky; a UA helps
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
      });

      if (r.ok) html = await r.text();
      else console.warn('App Store fetch failed:', r.status);
    } catch (e) {
      console.warn('App Store fetch error:', e);
    }

    let parsed = html ? parseAppStoreReviewsFromHtml(html) : { reviews: [], averageRating: null, totalReviews: null };

    // If parsing produced nothing useful, fall back to Perplexity research
    if (!parsed.reviews?.length) {
      parsed = await perplexityFallback(appStoreUrl);
    }

    const reviews = (parsed.reviews || []).map((r) => ({
      author: r.author || 'Anonymous',
      rating: Number.isFinite(r.rating) ? r.rating : 0,
      title: r.title || '(No title)',
      body: r.body || '',
      date: r.date || '',
    }));

    const avgFromReviews = reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
      : 0;

    const averageRating = typeof parsed.averageRating === 'number' ? parsed.averageRating : avgFromReviews;
    const totalReviews = typeof parsed.totalReviews === 'number' ? parsed.totalReviews : reviews.length;

    return NextResponse.json({ reviews, averageRating, totalReviews });
  } catch (err) {
    console.error('scrape-reviews error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
