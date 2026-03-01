/**
 * POST /api/pdf/orders/[orderId]/download-token
 * Mint a secure download token for a ready order.
 * Requires the caller's email to match the order's email (ownership proof).
 * Returns the token (unhashed) — caller appends it to the download URL.
 */

import { NextRequest } from 'next/server';
import { getPdfOrder, createPdfDownloadToken, consumeApiRateLimit } from '@/lib/db';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

const TOKEN_TTL_DAYS = 30;
const MAX_DOWNLOADS = 10;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  // Rate limit: 5 requests per 5 minutes per IP
  const ip = getClientIp(req);
  const rl = consumeApiRateLimit({
    endpoint: 'pdf-download-token',
    actorType: 'ip',
    actorKey: ip,
    windowSeconds: 300,
    maxRequests: 5,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email } = body as { email?: string };

  if (!email || typeof email !== 'string') {
    return Response.json({ error: 'Email is required to verify order ownership' }, { status: 400 });
  }

  const { orderId } = await params;

  const order = getPdfOrder(orderId);
  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'ready') {
    return Response.json({ error: 'PDF is not ready yet' }, { status: 409 });
  }

  // Verify email ownership with timing-safe comparison
  const normalizedInput = email.toLowerCase().trim();
  const normalizedOrder = order.email; // already normalized on creation

  let emailMatch = false;
  try {
    const inputBuf = Buffer.from(normalizedInput);
    const orderBuf = Buffer.from(normalizedOrder);
    // timingSafeEqual requires same-length buffers — length mismatch = no match
    if (inputBuf.length === orderBuf.length) {
      emailMatch = timingSafeEqual(inputBuf, orderBuf);
    }
  } catch {
    emailMatch = false;
  }

  if (!emailMatch) {
    return Response.json({ error: 'Email does not match this order' }, { status: 403 });
  }

  // Generate a cryptographically random token
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  createPdfDownloadToken({
    orderId,
    tokenHash,
    expiresAt,
    maxDownloads: MAX_DOWNLOADS,
  });

  return Response.json({
    token: rawToken,
    expiresAt,
    maxDownloads: MAX_DOWNLOADS,
  });
}
