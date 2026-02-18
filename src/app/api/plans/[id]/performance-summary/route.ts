import { NextRequest, NextResponse } from 'next/server';
import { getScheduleItemsForPlan } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const items = getScheduleItemsForPlan(id);

    const rated = items.filter((i) => i.performance_rating);
    const unrated = items.filter((i) => !i.performance_rating);

    const dist = { great: 0, good: 0, ok: 0, poor: 0 };
    for (const item of rated) {
      if (item.performance_rating && item.performance_rating in dist) {
        dist[item.performance_rating as keyof typeof dist]++;
      }
    }

    const platformGreat: Record<string, number> = {};
    for (const item of rated.filter((i) => i.performance_rating === 'great')) {
      platformGreat[item.platform] = (platformGreat[item.platform] || 0) + 1;
    }

    const bestPlatform =
      Object.entries(platformGreat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        rated: rated.length,
        unrated: unrated.length,
        distribution: dist,
        bestPlatform,
      },
    });
  } catch (err) {
    console.error('performance-summary GET error:', err);
    return NextResponse.json(
      { error: 'Failed to load performance summary' },
      { status: 500 }
    );
  }
}
