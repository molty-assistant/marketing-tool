/**
 * POST /api/pdf/test-generate
 * Dev/admin shortcut: create an order, mark it paid, and kick off generation in one call.
 * Open by default. Set ADMIN_API_KEY to require auth.
 *
 * Body: { productUrl, email, tier: 'basic'|'pro', intake? }
 * Returns: { orderId, statusUrl, deliveryUrl }
 */

import { NextRequest } from 'next/server';
import { createPdfOrder, updatePdfOrder } from '@/lib/db';
import { runPdfPipeline } from '@/lib/pdf-pipeline';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

function isAuthorized(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return true; // open mode — no key configured

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return false;

  const provided = authHeader.slice('Bearer '.length);
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(adminKey);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { productUrl, email, tier, intake } = body as {
    productUrl?: string;
    email?: string;
    tier?: string;
    intake?: Record<string, unknown>;
  };

  if (!productUrl || typeof productUrl !== 'string') {
    return Response.json({ error: 'productUrl is required' }, { status: 400 });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return Response.json({ error: 'Valid email is required' }, { status: 400 });
  }
  const resolvedTier = tier === 'pro' ? 'pro' : 'basic';

  let normalizedUrl: string;
  try {
    const u = new URL(productUrl.startsWith('http') ? productUrl : `https://${productUrl}`);
    normalizedUrl = u.toString();
  } catch {
    return Response.json({ error: 'Invalid productUrl' }, { status: 400 });
  }

  const order = createPdfOrder({
    email: email.toLowerCase().trim(),
    productUrl: normalizedUrl,
    tier: resolvedTier,
    intakeJson: JSON.stringify(intake ?? {}),
  });

  updatePdfOrder(order.id, { status: 'paid' });

  const origin =
    process.env.PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${req.headers.get('x-forwarded-proto') ?? 'https'}://${req.headers.get('x-forwarded-host') ?? req.nextUrl.host}`;
  const result = await runPdfPipeline(order.id);

  return Response.json({
    orderId: order.id,
    pipelineStatus: result.status,
    lastError: result.lastError ?? null,
    statusUrl: `${origin}/status/${order.id}`,
    deliveryUrl: `${origin}/delivery/${order.id}`,
  });
}
