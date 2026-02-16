import { NextRequest, NextResponse } from 'next/server';
import { getPlan, deletePlan } from '@/lib/db';

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
    const plan = {
      id: row.id,
      config: JSON.parse(row.config),
      scraped: JSON.parse(row.scraped),
      generated: row.generated,
      stages: JSON.parse(row.stages),
      content: (() => {
        try {
          return row.content ? JSON.parse(row.content) : {};
        } catch {
          return {};
        }
      })(),
      createdAt: row.created_at,
      shareToken: row.share_token || null,
    };
    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deletePlan(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
