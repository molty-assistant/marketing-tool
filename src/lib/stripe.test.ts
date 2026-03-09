import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { verifyAndParseWebhook, STRIPE_PUBLISHABLE_KEY, STRIPE_BUY_BUTTON_IDS } from './stripe';

const TEST_SECRET = 'whsec_test_secret';

function makeSignature(body: string, timestamp?: number, secret?: string): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${body}`;
  const sig = createHmac('sha256', secret ?? TEST_SECRET)
    .update(signedPayload, 'utf8')
    .digest('hex');
  return `t=${ts},v1=${sig}`;
}

const sampleEvent = {
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_123',
      client_reference_id: 'order-abc',
      customer_email: 'test@example.com',
      payment_intent: 'pi_test_456',
      amount_total: 2900,
      currency: 'usd',
      metadata: { tier: 'pro' },
    },
  },
};

describe('verifyAndParseWebhook', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', TEST_SECRET);
  });

  it('parses event with valid signature', () => {
    const body = JSON.stringify(sampleEvent);
    const sig = makeSignature(body);
    const result = verifyAndParseWebhook(body, sig);
    expect(result.type).toBe('checkout.session.completed');
    expect(result.data.object.id).toBe('cs_test_123');
    expect(result.data.object.customer_email).toBe('test@example.com');
  });

  it('throws on invalid signature', () => {
    const body = JSON.stringify(sampleEvent);
    const sig = makeSignature(body, undefined, 'wrong-secret');
    expect(() => verifyAndParseWebhook(body, sig)).toThrow('signature verification failed');
  });

  it('throws on tampered body', () => {
    const body = JSON.stringify(sampleEvent);
    const sig = makeSignature(body);
    const tampered = body.replace('cs_test_123', 'cs_evil_999');
    expect(() => verifyAndParseWebhook(tampered, sig)).toThrow('signature verification failed');
  });

  it('throws when timestamp is too old (>5 min)', () => {
    const body = JSON.stringify(sampleEvent);
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 6+ minutes ago
    const sig = makeSignature(body, oldTimestamp);
    expect(() => verifyAndParseWebhook(body, sig)).toThrow('timestamp out of tolerance');
  });

  it('throws when timestamp is in the future (>5 min)', () => {
    const body = JSON.stringify(sampleEvent);
    const futureTimestamp = Math.floor(Date.now() / 1000) + 400;
    const sig = makeSignature(body, futureTimestamp);
    expect(() => verifyAndParseWebhook(body, sig)).toThrow('timestamp out of tolerance');
  });

  it('throws when STRIPE_WEBHOOK_SECRET is not set', () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const body = JSON.stringify(sampleEvent);
    expect(() => verifyAndParseWebhook(body, 't=123,v1=abc')).toThrow('STRIPE_WEBHOOK_SECRET is not set');
  });

  it('throws on malformed signature header (missing t=)', () => {
    const body = JSON.stringify(sampleEvent);
    expect(() => verifyAndParseWebhook(body, 'v1=abc123')).toThrow('Invalid Stripe-Signature header');
  });

  it('throws on malformed signature header (missing v1=)', () => {
    const body = JSON.stringify(sampleEvent);
    expect(() => verifyAndParseWebhook(body, 't=123456')).toThrow('Invalid Stripe-Signature header');
  });
});

describe('Stripe constants', () => {
  it('exports a publishable key', () => {
    expect(STRIPE_PUBLISHABLE_KEY).toMatch(/^pk_/);
  });

  it('exports buy button IDs for basic and pro', () => {
    expect(STRIPE_BUY_BUTTON_IDS.basic).toBeDefined();
    expect(STRIPE_BUY_BUTTON_IDS.pro).toBeDefined();
  });
});
