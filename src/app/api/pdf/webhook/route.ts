/**
 * POST /api/pdf/webhook
 * Stripe webhook handler.
 *
 * Handles:
 *   checkout.session.completed → mark order paid, kick off generation
 *   checkout.session.expired   → mark order failed (optional: notify user)
 *
 * Must be registered in Stripe dashboard with the endpoint URL:
 *   https://YOUR-DOMAIN/api/pdf/webhook
 */

import { NextRequest } from 'next/server';
import { getPdfOrderByStripeSession, updatePdfOrder } from '@/lib/db';
import { verifyAndParseWebhook } from '@/lib/stripe';

export const runtime = 'nodejs';

// Stripe sends raw body — we need it unparsed for signature verification
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = verifyAndParseWebhook(rawBody, signature);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook verification failed';
    console.error('[pdf/webhook] Signature error:', msg);
    return Response.json({ error: 'Webhook verification failed' }, { status: 400 });
  }

  const session = event.data.object;

  if (event.type === 'checkout.session.completed') {
    // client_reference_id is the orderId we set when building the payment link
    const orderId = session.client_reference_id;
    if (!orderId) {
      console.error('[pdf/webhook] checkout.session.completed missing client_reference_id', session.id);
      return Response.json({ received: true });
    }

    // Find order — if somehow the session ID was stored, use that; otherwise use orderId directly
    let order = getPdfOrderByStripeSession(session.id);
    if (!order) {
      // Fall back to client_reference_id as orderId
      const { getPdfOrder } = await import('@/lib/db');
      order = getPdfOrder(orderId);
    }

    if (!order) {
      console.error('[pdf/webhook] Order not found for session', session.id, 'orderId', orderId);
      return Response.json({ received: true });
    }

    if (order.status === 'paid' || order.status === 'generating' || order.status === 'ready') {
      // Already processed (duplicate event)
      return Response.json({ received: true });
    }

    // Store Stripe session reference and mark as paid
    updatePdfOrder(order.id, {
      status: 'paid',
      stripeSessionId: session.id,
      stripePaymentIntent: session.payment_intent,
    });

    // Kick off generation asynchronously — don't await (webhook must respond quickly)
    void triggerGeneration(order.id);

    return Response.json({ received: true });
  }

  if (event.type === 'checkout.session.expired') {
    const orderId = session.client_reference_id;
    if (orderId) {
      const { getPdfOrder } = await import('@/lib/db');
      const order = getPdfOrder(orderId);
      if (order && order.status === 'checkout_created') {
        updatePdfOrder(orderId, { status: 'draft' }); // Reset to draft so user can retry
      }
    }
    return Response.json({ received: true });
  }

  // All other events acknowledged but not processed
  return Response.json({ received: true });
}

async function triggerGeneration(orderId: string) {
  try {
    const { runPdfPipeline } = await import('@/lib/pdf-pipeline');
    const result = await runPdfPipeline(orderId);
    if (result.status === 'failed') {
      console.error('[pdf/webhook] Pipeline failed for order', orderId, result.lastError);
    }
  } catch (err) {
    console.error('[pdf/webhook] Unexpected pipeline error for order', orderId, err);
  }
}
