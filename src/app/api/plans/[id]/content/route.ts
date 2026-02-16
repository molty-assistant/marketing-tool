import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getAllContent } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = getPlan(id);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const content = getAllContent(id);
    return NextResponse.json({ planId: id, content });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch plan content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
