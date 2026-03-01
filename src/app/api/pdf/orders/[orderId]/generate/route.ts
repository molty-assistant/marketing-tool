/**
 * POST /api/pdf/orders/[orderId]/generate
 * Trigger (or re-trigger) PDF generation for a paid order.
 * Idempotent — safe to call multiple times.
 *
 * Requires: Authorization: Bearer <ADMIN_API_KEY>
 * Set ADMIN_API_KEY in Railway env vars.
 */

import { NextRequest } from 'next/server';
import { getPdfOrder, updatePdfOrder } from '@/lib/db';
import { runPdfPipeline } from '@/lib/pdf-pipeline';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

function checkAdminAuth(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false; // fail-safe: no key configured = no access

  const authHeader = req.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!authHeader.startsWith(prefix)) return false;

  const provided = authHeader.slice(prefix.length);
  try {
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(adminKey);
    if (providedBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!process.env.ADMIN_API_KEY) {
    return Response.json({ error: 'Admin access not configured' }, { status: 503 });
  }

  if (!checkAdminAuth(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;

  const order = getPdfOrder(orderId);
  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'draft' || order.status === 'checkout_created') {
    // Allow admin to force-bypass payment check (useful for testing)
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }
    if (!body.force_paid) {
      return Response.json({ error: 'Order has not been paid yet' }, { status: 402 });
    }
    updatePdfOrder(orderId, { status: 'paid' });
  }

  if (order.status === 'ready') {
    return Response.json({ status: 'ready', message: 'PDF already generated' });
  }

  if (order.status === 'generating') {
    return Response.json({ status: 'generating', message: 'Generation already in progress' });
  }

  // status is 'paid' or 'failed' — run the pipeline
  const result = await runPdfPipeline(orderId);

  return Response.json({
    runId: result.runId,
    status: result.status,
    steps: result.steps,
    lastError: result.lastError,
  });
}
