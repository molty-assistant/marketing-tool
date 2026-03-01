/**
 * POST /api/pdf/magic-link
 * Returns past orders for an email address.
 * In production, this would send a 1-hour magic link via email (Resend).
 * For now it returns the orders directly (to be gated by email verification in production).
 *
 * Body: { email: string }
 */

import { NextRequest } from 'next/server';
import { getPdfOrdersByEmail } from '@/lib/db';
import { consumeApiRateLimit } from '@/lib/db';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 requests per 10 minutes per IP (prevent email enumeration)
  const ip = getClientIp(req);
  const rl = consumeApiRateLimit({
    endpoint: 'pdf-magic-link',
    actorType: 'ip',
    actorKey: ip,
    windowSeconds: 600,
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

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return Response.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const orders = getPdfOrdersByEmail(normalizedEmail);

  // Return only safe fields (no Stripe session IDs, no intake data)
  const safeOrders = orders.map((o) => ({
    id: o.id,
    status: o.status,
    tier: o.tier,
    productUrl: o.product_url,
    createdAt: o.created_at,
  }));

  // Always return 200 to prevent email enumeration (empty array if no orders)
  return Response.json({ orders: safeOrders });
}
