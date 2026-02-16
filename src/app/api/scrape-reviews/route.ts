import { NextRequest, NextResponse } from 'next/server';

type ScrapedReview = {
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
};

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const appId = typeof body?.appId === 'string' ? body.appId.trim() : '';

    if (!appId) {
      return NextResponse.json({ error: 'Missing "appId"' }, { status: 400 });
    }

    if (!/^[0-9]+$/.test(appId)) {
      return NextResponse.json({ error: 'Invalid "appId" (expected numeric iTunes app id)' }, { status: 400 });
    }

    const url = `https://itunes.apple.com/gb/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'marketing-tool/1.0 (+https://github.com/molty-assistant/marketing-tool)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('iTunes RSS error:', res.status, errorText.slice(0, 500));
      return NextResponse.json({ error: `Failed to fetch reviews (${res.status}).` }, { status: 502 });
    }

    const data = await res.json();
    const entries: unknown = data?.feed?.entry;
    const arr: unknown[] = Array.isArray(entries) ? entries : [];

    const getLabel = (node: unknown): string => {
      if (!node || typeof node !== 'object') return '';
      const label = (node as Record<string, unknown>).label;
      return typeof label === 'string' ? label : '';
    };

    const getNestedLabel = (obj: unknown, path: string[]): string => {
      let cur: unknown = obj;
      for (const key of path) {
        if (!cur || typeof cur !== 'object') return '';
        cur = (cur as Record<string, unknown>)[key];
      }
      return getLabel(cur);
    };

    // First entry is often app metadata; review entries have "im:rating"
    const reviews: ScrapedReview[] = arr
      .filter((e) => {
        if (!e || typeof e !== 'object') return false;
        const rec = e as Record<string, unknown>;
        return typeof rec['im:rating'] === 'object' && typeof rec.content === 'object';
      })
      .map((e) => {
        const rec = e as Record<string, unknown>;
        const author = getNestedLabel(rec, ['author', 'name']);
        const rating = toNumber(getNestedLabel(rec, ['im:rating']));
        const title = getNestedLabel(rec, ['title']);
        const content = getNestedLabel(rec, ['content']);
        const date = getNestedLabel(rec, ['updated']) || getNestedLabel(rec, ['published']);
        return { author, rating, title, content, date };
      })
      .filter((r) => r.content && r.title);

    return NextResponse.json({ reviews, metadata: { source: 'itunes-rss', url } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scrape reviews';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
