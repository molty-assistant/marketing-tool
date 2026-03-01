import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/scraper';
import { guardApiRoute } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/scrape',
    maxRequests: 10,
    windowSeconds: 600, // 10 per 10 minutes per IP
  });
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
