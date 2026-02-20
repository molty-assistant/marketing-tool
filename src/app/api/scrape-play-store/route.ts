import { NextRequest, NextResponse } from 'next/server';
import { parsePlayStoreHtml } from './parser';
import { enforceRateLimit } from '@/lib/rate-limit';

function isValidPlayStoreUrl(input: string): boolean {
  try {
    const u = new URL(input);
    if (u.hostname !== 'play.google.com') return false;
    if (!u.pathname.startsWith('/store/apps/details')) return false;
    const id = u.searchParams.get('id');
    return !!id && /^[a-zA-Z0-9._]+$/.test(id);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/scrape-play-store', bucket: 'public', maxRequests: 20, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { url } = (await request.json()) as { url?: unknown };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isValidPlayStoreUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid Google Play Store URL. Expected https://play.google.com/store/apps/details?id=...' },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      // Play Store can be picky; send a browser-ish UA.
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Play Store page (HTTP ${res.status})` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const parsed = parsePlayStoreHtml(url, html);

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scrape Play Store URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
