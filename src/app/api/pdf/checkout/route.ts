/**
 * POST /api/pdf/checkout
 * Update the order tier and mark status as checkout_created.
 * The actual payment is handled client-side via Stripe Buy Button.
 *
 * Body: { orderId: string, tier?: 'basic' | 'pro' }
 * Returns: { tier: 'basic' | 'pro' }
 */

import { NextRequest } from 'next/server';
import { getPdfOrder, updatePdfOrder } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { orderId, tier } = body as { orderId?: string; tier?: string };

  if (!orderId || typeof orderId !== 'string') {
    return Response.json({ error: 'orderId is required' }, { status: 400 });
  }

  const order = getPdfOrder(orderId);
  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  // Only allow checkout from draft or checkout_created (re-checkout / tier change)
  if (order.status !== 'draft' && order.status !== 'checkout_created') {
    return Response.json({ error: 'This order has already been processed' }, { status: 409 });
  }

  // Allow tier change at checkout (user can switch Basic ↔ Pro before paying)
  const resolvedTier = (tier === 'basic' || tier === 'pro') ? tier : order.tier;

  if (resolvedTier !== order.tier) {
    updatePdfOrder(orderId, { tier: resolvedTier });
  }

  updatePdfOrder(orderId, { status: 'checkout_created' });

  return Response.json({ tier: resolvedTier });
}
