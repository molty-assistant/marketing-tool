/**
 * GET /api/pdf/orders/[orderId]
 * Returns the order status and latest generation run step progress.
 * Used by the /status page to poll for completion.
 */

import { NextRequest } from 'next/server';
import { getPdfOrder, getLatestPdfGenerationRun, consumeApiRateLimit } from '@/lib/db';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Mask email for public display: "tom@example.com" → "t***@example.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
}

/** Strip internal file paths and sensitive details before sending to the browser */
function sanitizeError(msg: string | null): string | null {
  if (!msg) return null;
  if (/\/Users\/|\/home\/|C:\\|data\/|node_modules\/|\.ts\b|\.js\b/.test(msg)) {
    return 'Generation failed. Please contact support for a refund.';
  }
  return msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  // Rate limit: 120 req/min/IP — generous enough for 5s polling
  const ip = getClientIp(req);
  const rl = consumeApiRateLimit({
    endpoint: 'pdf-order-status',
    actorType: 'ip',
    actorKey: ip,
    windowSeconds: 60,
    maxRequests: 120,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  const { orderId } = await params;

  const order = getPdfOrder(orderId);
  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  const run = getLatestPdfGenerationRun(orderId);
  const steps = run ? JSON.parse(run.steps_json) : [];

  return Response.json({
    id: order.id,
    status: order.status,
    tier: order.tier,
    email: maskEmail(order.email),
    productUrl: order.product_url,
    createdAt: order.created_at,
    generation: run
      ? {
          runId: run.id,
          status: run.status,
          currentStep: run.current_step,
          steps,
          lastError: sanitizeError(run.last_error),
        }
      : null,
  });
}
