import { NextRequest, NextResponse } from 'next/server';
import { getPlan, updatePlanContent } from '@/lib/db';

function extractAppId(url: string): string | null {
  const m = url.match(/id(\d{6,})/i);
  return m?.[1] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body?.planId === 'string' ? body.planId : '';
    const appStoreUrl = typeof body?.appStoreUrl === 'string' ? body.appStoreUrl : '';

    if (!planId) return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    if (!appStoreUrl) return NextResponse.json({ error: 'Missing "appStoreUrl"' }, { status: 400 });

    const row = getPlan(planId);
    if (!row) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const appId = extractAppId(appStoreUrl);
    if (!appId) {
      return NextResponse.json(
        { error: 'Could not extract app id from URL (expected .../id1234567890)' },
        { status: 400 }
      );
    }

    const feedUrl = `https://itunes.apple.com/gb/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`;

    const res = await fetch(feedUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('iTunes RSS error:', res.status, (await res.text()).slice(0, 500));
      return NextResponse.json({ error: `iTunes RSS feed error (${res.status})` }, { status: 502 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any;
    const entries: unknown[] = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviews = entries.filter((e: any) => e?.['im:rating']?.label).map((e: any) => ({
      author: e?.author?.name?.label ?? 'Unknown',
      rating: Number(e?.['im:rating']?.label ?? 0),
      title: e?.title?.label ?? '',
      body: e?.content?.label ?? '',
      date: e?.updated?.label ?? new Date().toISOString(),
    })).filter(r => r.rating >= 1 && r.rating <= 5);

    const payload = {
      source: 'appstore',
      appStoreUrl,
      appId,
      feedUrl,
      fetchedAt: new Date().toISOString(),
      items: reviews,
    };

    updatePlanContent(planId, { reviews: payload });

    return NextResponse.json({ reviews: payload });
  } catch (err) {
    console.error('scrape-reviews error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
