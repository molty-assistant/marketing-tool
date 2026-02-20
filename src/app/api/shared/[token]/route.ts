import { NextRequest, NextResponse } from 'next/server';
import { getPlanByShareToken } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const rateLimitResponse = enforceRateLimit(_request, { endpoint: '/api/shared/[token]', bucket: 'public', maxRequests: 60, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

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
