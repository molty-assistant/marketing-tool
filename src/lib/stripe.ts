/**
 * Stripe integration — Buy Buttons + webhook verification. No SDK needed.
 *
 * Env vars required:
 *   STRIPE_WEBHOOK_SECRET  — whsec_... from Stripe dashboard webhook settings
 *
 * Buy Button IDs and publishable key are hardcoded below — they are client-side
 * safe and not secrets.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { PdfTier } from '@/lib/db';

// ─── Buy Button config (public — safe to commit) ──────────────────────────────

export const STRIPE_PUBLISHABLE_KEY =
  'pk_live_51T4QVYPUEJhRRSPi3jKOPAR3dwOgcnujKX8A5yM7u8svDIazrqFo3ZU9sYVIUVa0t12s8ycgJiACyYBvO3JiWdoc007PM4ioGe';

export const STRIPE_BUY_BUTTON_IDS: Record<PdfTier, string> = {
  basic: 'buy_btn_1T6ATgPUEJhRRSPivmUqs75M',
  pro:   'buy_btn_1T6AUTPUEJhRRSPiG6YUbZZw',
};

// ─── Webhook ──────────────────────────────────────────────────────────────────

/**
 * Stripe webhook event shape (minimal — only fields we use).
 */
export interface StripeWebhookEvent {
  type: string;
  data: {
    object: {
      id: string;
      client_reference_id: string | null;
      customer_email: string | null;
      payment_intent: string | null;
      amount_total: number | null;
      currency: string | null;
      metadata: Record<string, string>;
    };
  };
}

/**
 * Verify a Stripe webhook signature and parse the event body.
 * Uses Node's built-in crypto — no Stripe SDK needed.
 *
 * Throws if the signature is invalid or the timestamp is out of tolerance (±5 min).
 */
export function verifyAndParseWebhook(body: string, signatureHeader: string): StripeWebhookEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');

  // Stripe-Signature: t=1234567890,v1=abc123
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(',')) {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }

  const timestamp = parts['t'];
  const v1Sig = parts['v1'];
  if (!timestamp || !v1Sig) throw new Error('Invalid Stripe-Signature header');

  // Reject webhooks older than 5 minutes or with future timestamps (replay/clock-skew protection)
  const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (isNaN(ageSeconds) || Math.abs(ageSeconds) > 300) {
    throw new Error('Stripe webhook timestamp out of tolerance');
  }

  const signedPayload = `${timestamp}.${body}`;
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

  let sigOk: boolean;
  try {
    sigOk = timingSafeEqual(Buffer.from(v1Sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    sigOk = false;
  }

  if (!sigOk) throw new Error('Stripe webhook signature verification failed');

  return JSON.parse(body) as StripeWebhookEvent;
}
