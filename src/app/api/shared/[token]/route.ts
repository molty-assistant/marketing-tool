import { NextRequest, NextResponse } from 'next/server';
import { getPlanByShareToken } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const row = getPlanByShareToken(token);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    config: JSON.parse(row.config),
    generated: row.generated,
    stages: JSON.parse(row.stages),
  });
}
