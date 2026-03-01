'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';

// Stripe Buy Button public config (not secrets — safe to commit)
const STRIPE_PUBLISHABLE_KEY =
  'pk_live_51T4QVYPUEJhRRSPi3jKOPAR3dwOgcnujKX8A5yM7u8svDIazrqFo3ZU9sYVIUVa0t12s8ycgJiACyYBvO3JiWdoc007PM4ioGe';

const STRIPE_BUY_BUTTON_IDS: Record<'basic' | 'pro', string> = {
  basic: 'buy_btn_1T6ATgPUEJhRRSPivmUqs75M',
  pro:   'buy_btn_1T6AUTPUEJhRRSPiG6YUbZZw',
};

// Typed wrapper for the Stripe Buy Button web component (avoids JSX namespace issues in React 19)
function StripeBuyButton(props: {
  'buy-button-id': string;
  'publishable-key': string;
  'client-reference-id'?: string;
  'success-url'?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const El = 'stripe-buy-button' as any;
  return <El {...props} />;
}

interface OrderData {
  id: string;
  status: string;
  tier: 'basic' | 'pro';
  email: string;
  productUrl: string;
}

const TIER_FEATURES = {
  basic: [
    'Positioning Snapshot (2 pages)',
    'Competitor Angles + Say This Not That',
    'Landing Page Copy — 5 headlines, 8–10 bullets, CTAs',
    '5 X/Twitter + 2 LinkedIn launch posts',
    '9–11 pages total',
  ],
  pro: [
    'Everything in Basic',
    'Email Sequence (3 emails + A/B subjects)',
    '30-Day Content Calendar (30 rows)',
    'Ad Copy Angles (5 angles for Meta/X)',
    'App Store / Listing Copy',
    'Tone-of-Voice Cheat Sheet',
    '19–25 pages total',
  ],
} as const;

const TIER_PRICE = { basic: '£39.99', pro: '£99' };

function CheckoutContent({ scriptReady }: { scriptReady: boolean }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [selectedTier, setSelectedTier] = useState<'basic' | 'pro'>('basic');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  // Fetch order on mount
  useEffect(() => {
    if (!orderId) { setLoading(false); return; }

    fetch(`/api/pdf/orders/${orderId}`)
      .then((r) => r.json())
      .then((data: OrderData) => {
        setOrder(data);
        setSelectedTier(data.tier);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load your order. Please go back and try again.');
        setLoading(false);
      });
  }, [orderId]);

  // Sync selected tier to DB (fires on initial order load and on tier change)
  useEffect(() => {
    if (!orderId || !order) return;

    setSyncing(true);
    setError('');

    fetch('/api/pdf/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, tier: selectedTier }),
    })
      .then((r) => r.json())
      .then((data: { tier?: string; error?: string }) => {
        if (data.error) setError(data.error);
      })
      .catch(() => setError('Could not update your plan. Please try again.'))
      .finally(() => setSyncing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, order, selectedTier]);

  if (!orderId) {
    return (
      <p className="text-slate-600 dark:text-slate-300">
        No order found. <Link href="/start" className="text-indigo-500 underline">Start here</Link>.
      </p>
    );
  }

  if (loading) {
    return <p className="text-slate-500 animate-pulse">Loading your order…</p>;
  }

  if (error && !order) {
    return <p className="text-red-600">{error}</p>;
  }

  const showButton = scriptReady && !syncing && !!orderId;

  return (
    <div className="space-y-6">
      {/* Order summary */}
      {order && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 mb-1">Generating a plan for</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{order.productUrl}</p>
          <p className="text-xs text-slate-400 mt-1">{order.email}</p>
        </div>
      )}

      {/* Tier toggle */}
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Choose your plan</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['basic', 'pro'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              disabled={syncing}
              className={`text-left rounded-2xl border-2 p-4 transition-colors disabled:opacity-60 ${
                selectedTier === t
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">{t}</span>
                <span className="text-sm font-bold text-indigo-600">{TIER_PRICE[t]}</span>
              </div>
              <ul className="space-y-1">
                {TIER_FEATURES[t].map((f) => (
                  <li key={f} className="text-xs text-slate-500 flex gap-1.5">
                    <span className="text-indigo-500 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Stripe Buy Button — remounts on tier change via key prop */}
      <div className="flex justify-center min-h-[52px] items-center">
        {syncing && (
          <p className="text-slate-400 text-sm animate-pulse">Updating plan…</p>
        )}
        {!scriptReady && !syncing && (
          <p className="text-slate-400 text-sm animate-pulse">Loading payment…</p>
        )}
        {showButton && (
          <StripeBuyButton
            key={selectedTier}
            buy-button-id={STRIPE_BUY_BUTTON_IDS[selectedTier]}
            publishable-key={STRIPE_PUBLISHABLE_KEY}
            client-reference-id={orderId}
            success-url={`${typeof window !== 'undefined' ? window.location.origin : ''}/status/${orderId}`}
          />
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        Secure payment via Stripe · PDF delivered within minutes · No refunds after generation
      </p>

      <p className="text-center text-xs text-slate-400">
        <Link href="/start" className="underline">← Back and change answers</Link>
      </p>
    </div>
  );
}

export default function CheckoutPage() {
  const [scriptReady, setScriptReady] = useState(false);

  return (
    <div className="w-full">
      <Script
        src="https://js.stripe.com/v3/buy-button.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Review & pay
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            You can still switch plans before paying.
          </p>
          <Suspense fallback={<p className="text-slate-500 animate-pulse">Loading…</p>}>
            <CheckoutContent scriptReady={scriptReady} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
