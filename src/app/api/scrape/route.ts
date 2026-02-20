import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/scraper';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/scrape', bucket: 'public', maxRequests: 20, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalise URL — prepend https:// if no protocol given (e.g. www.lightscout.ai)
    const normalizedUrl = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const result = await scrapeUrl(normalizedUrl);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scrape URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
