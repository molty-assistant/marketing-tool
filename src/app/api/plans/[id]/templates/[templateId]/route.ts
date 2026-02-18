import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const { id, templateId } = await params;
    const plan = getPlan(id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | { content?: unknown }
      | null;

    const content = typeof body?.content === 'string' ? body.content : null;
    if (!content) {
      return NextResponse.json({ error: 'Missing template content' }, { status: 400 });
    }

    // Persist in plan_content so templates survive refresh + share links.
    saveContent(id, 'templates', templateId, content);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
