'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { TIERS, STRIPE_PUBLISHABLE_KEY, normalizeTierId, type TierId } from '@/lib/pricing';

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
  tier: string;
  email: string;
  productUrl: string;
}

function CheckoutContent({ scriptReady }: { scriptReady: boolean }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierId>('entry');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  // Fetch order on mount
  useEffect(() => {
    if (!orderId) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    fetch(`/api/pdf/orders/${orderId}`)
      .then((r) => r.json())
      .then((data: OrderData) => {
        setOrder(data);
        setSelectedTier(normalizeTierId(data.tier));
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load your order. Please go back and try again.');
        setLoading(false);
      });
  }, [orderId]);

  // Sync selected tier to DB (fires on tier change only, not initial load)
  useEffect(() => {
    if (!orderId || !order) return;

    // Map 'entry' back to 'basic' for API compatibility with existing DB records
    const apiTier = selectedTier === 'entry' ? 'basic' : selectedTier;

    queueMicrotask(() => {
      setSyncing(true);
      setError('');
    });

    fetch('/api/pdf/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, tier: apiTier }),
    })
      .then((r) => r.json())
      .then((data: { tier?: string; error?: string }) => {
        if (data.error) setError(data.error);
      })
      .catch(() => setError('Could not update your plan. Please try again.'))
      .finally(() => setSyncing(false));
  }, [orderId, order, selectedTier]);

  if (!orderId) {
    return (
      <p className="text-muted-foreground">
        No order found. <Link href="/start" className="text-indigo-500 underline">Start here</Link>.
      </p>
    );
  }

  if (loading) {
    return <p className="text-muted-foreground animate-pulse">Loading your order…</p>;
  }

  if (error && !order) {
    return <p className="text-destructive">{error}</p>;
  }

  const tier = TIERS[selectedTier];
  const showButton = scriptReady && !syncing && !!orderId;

  return (
    <div className="space-y-6">
      {/* Order summary */}
      {order && (
        <div className="rounded-2xl border border-border bg-muted p-5">
          <p className="text-xs text-muted-foreground mb-1">Generating a plan for</p>
          <p className="text-sm font-semibold text-foreground truncate">{order.productUrl}</p>
          <p className="text-xs text-muted-foreground mt-1">{order.email}</p>
        </div>
      )}

      {/* Tier toggle */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Choose your plan</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['entry', 'pro'] as const).map((t) => {
            const tierData = TIERS[t];
            return (
              <button
                key={t}
                onClick={() => setSelectedTier(t)}
                disabled={syncing}
                className={`text-left rounded-2xl border-2 p-4 transition-colors disabled:opacity-60 ${
                  selectedTier === t
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-border bg-card hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-foreground">{tierData.name}</span>
                  <span className="text-sm font-bold text-indigo-500">{tierData.price}</span>
                </div>
                <ul className="space-y-1">
                  {tierData.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-indigo-500 flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stripe Buy Button — remounts on tier change via key prop */}
      <div className="flex justify-center min-h-[52px] items-center">
        {syncing && (
          <p className="text-muted-foreground text-sm animate-pulse">Updating plan…</p>
        )}
        {!scriptReady && !syncing && (
          <p className="text-muted-foreground text-sm animate-pulse">Loading payment…</p>
        )}
        {showButton && (
          <StripeBuyButton
            key={selectedTier}
            buy-button-id={tier.stripeBuyButtonId}
            publishable-key={STRIPE_PUBLISHABLE_KEY}
            client-reference-id={orderId}
            success-url={`${typeof window !== 'undefined' ? window.location.origin : ''}/status/${orderId}`}
          />
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Secure payment via Stripe · PDF delivered within minutes · No refunds after generation
      </p>

      <p className="text-center text-xs text-muted-foreground">
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
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            Review & pay
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            You can still switch plans before paying.
          </p>
          <Suspense fallback={<p className="text-muted-foreground animate-pulse">Loading…</p>}>
            <CheckoutContent scriptReady={scriptReady} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
