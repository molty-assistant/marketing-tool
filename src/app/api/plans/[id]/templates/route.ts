import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getContent } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = getPlan(id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const rows = getContent(id, 'templates') as Array<{ contentKey: string | null; content: unknown }>;
    const templates: Record<string, string> = {};

    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (typeof r?.contentKey !== 'string') continue;
        if (typeof r?.content !== 'string') continue;
        templates[r.contentKey] = r.content;
      }
    }

    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
