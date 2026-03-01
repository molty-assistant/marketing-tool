/**
 * POST /api/pdf/orders
 * Create a draft PDF order from the intake form submission.
 */

import { NextRequest } from 'next/server';
import { createPdfOrder } from '@/lib/db';
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
  // Rate limit: 10 orders per hour per IP
  const ip = getClientIp(req);
  const rl = consumeApiRateLimit({
    endpoint: 'pdf-orders',
    actorType: 'ip',
    actorKey: ip,
    windowSeconds: 3600,
    maxRequests: 10,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, productUrl, tier, intake, honeypot } = body as {
    email?: string;
    productUrl?: string;
    tier?: string;
    intake?: Record<string, unknown>;
    honeypot?: string;
  };

  // Honeypot — bots fill this field, humans don't
  if (honeypot) {
    return Response.json({ error: 'Invalid submission' }, { status: 400 });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return Response.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (!productUrl || typeof productUrl !== 'string') {
    return Response.json({ error: 'Product URL is required' }, { status: 400 });
  }
  if (tier !== 'basic' && tier !== 'pro') {
    return Response.json({ error: 'Tier must be basic or pro' }, { status: 400 });
  }

  // Normalise URL — only allow http/https schemes
  let normalizedUrl: string;
  try {
    const u = new URL(productUrl.startsWith('http') ? productUrl : `https://${productUrl}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return Response.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 });
    }
    normalizedUrl = u.toString();
  } catch {
    return Response.json({ error: 'Invalid product URL' }, { status: 400 });
  }

  const order = createPdfOrder({
    email: email.toLowerCase().trim(),
    productUrl: normalizedUrl,
    tier,
    intakeJson: JSON.stringify(intake ?? {}),
  });

  return Response.json({ orderId: order.id, status: order.status }, { status: 201 });
}
