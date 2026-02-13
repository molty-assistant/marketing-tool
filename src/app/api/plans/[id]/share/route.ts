import { NextRequest, NextResponse } from 'next/server';
import { createShareToken, removeShareToken, getPlan } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const token = createShareToken(id);
  return NextResponse.json({ shareUrl: `/shared/${token}`, token });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  removeShareToken(id);
  return NextResponse.json({ ok: true });
}
