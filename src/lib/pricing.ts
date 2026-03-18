/**
 * Single source of truth for all pricing, tier names, features, and Stripe IDs.
 * Import this everywhere pricing is referenced to avoid drift.
 */

export const TIERS = {
  entry: {
    id: 'entry' as const,
    name: 'Entry',
    price: '£39',
    priceAmount: 39,
    pageCount: '10+',
    description: 'Sharp positioning and landing page copy — everything you need to start shipping.',
    shortDescription: 'Positioning, copy & social posts — typically 10+ pages',
    stripeBuyButtonId: 'buy_btn_1T6ATgPUEJhRRSPivmUqs75M',
    features: [
      'Positioning Snapshot (2 pages)',
      'Competitor Angles + Say This Not That',
      'Landing Page Copy — 5 headlines, 8–10 bullets, CTAs',
      '5 X/Twitter + 2 LinkedIn launch posts',
    ],
    shortFeatures: [
      'Positioning Snapshot',
      'Competitor Angles + Say This Not That',
      '5 headline options + feature bullets',
      'Short + long CTA options',
      '5 X/Twitter + 2 LinkedIn launch posts',
    ],
  },
  pro: {
    id: 'pro' as const,
    name: 'Pro',
    price: '£99',
    priceAmount: 99,
    pageCount: '20+',
    description: 'Everything in Entry plus the full launch toolkit — the complete package.',
    shortDescription: 'Everything + emails, ads & 30-day calendar — typically 20+ pages',
    stripeBuyButtonId: 'buy_btn_1T6AUTPUEJhRRSPiG6YUbZZw',
    features: [
      'Everything in Entry',
      'Email Sequence (3 emails + A/B subjects)',
      '30-Day Content Calendar',
      'Ad Copy Angles for Meta/X',
      'App Store / Listing Copy',
      'Tone-of-Voice Cheat Sheet',
      '10 X/Twitter + 5 LinkedIn posts',
    ],
    shortFeatures: [
      'Everything in Entry',
      'Email Sequence (3 emails + A/B subjects)',
      '30-Day Content Calendar',
      'Ad Copy Angles for Meta/X',
      'App Store / Listing Copy',
      'Tone-of-Voice Cheat Sheet',
    ],
  },
} as const;

export type TierId = keyof typeof TIERS;

export const TIER_IDS = Object.keys(TIERS) as TierId[];

export const STRIPE_PUBLISHABLE_KEY =
  'pk_live_51T4QVYPUEJhRRSPi3jKOPAR3dwOgcnujKX8A5yM7u8svDIazrqFo3ZU9sYVIUVa0t12s8ycgJiACyYBvO3JiWdoc007PM4ioGe';

/** Map old tier names to new ones (for backward compatibility with existing DB records) */
export function normalizeTierId(raw: string | null): TierId {
  if (raw === 'basic' || raw === 'entry') return 'entry';
  if (raw === 'pro') return 'pro';
  return 'entry';
}

export const SAMPLE_PACK_URL = '/shared/6e540e90-748f-4be4-a139-e42f36e923cd';
