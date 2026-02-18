import { NextRequest, NextResponse } from 'next/server';
import { updateSchedulePerformance } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { rating, notes, metrics } = body;

    const validRatings = ['great', 'good', 'ok', 'poor', null];
    if (rating !== undefined && !validRatings.includes(rating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    updateSchedulePerformance(
      id,
      rating ?? null,
      notes ?? null,
      metrics ? JSON.stringify(metrics) : null
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('performance PUT error:', err);
    return NextResponse.json({ error: 'Failed to update performance' }, { status: 500 });
  }
}
