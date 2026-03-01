'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface OrderSummary {
  id: string;
  status: string;
  tier: 'basic' | 'pro';
  productUrl: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ready: { label: 'Ready', color: 'bg-emerald-100 text-emerald-700' },
  generating: { label: 'Generating…', color: 'bg-indigo-100 text-indigo-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  paid: { label: 'Processing', color: 'bg-amber-100 text-amber-700' },
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-500' },
  checkout_created: { label: 'Awaiting payment', color: 'bg-slate-100 text-slate-500' },
};

export default function MyPdfsPage() {
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setOrders(null);

    try {
      const res = await fetch('/api/pdf/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { orders?: OrderSummary[]; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
      } else {
        setOrders(data.orders ?? []);
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-xl">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your plans</h1>
          <p className="text-sm text-slate-500 mb-8">
            Enter the email you used at checkout to see your orders.
          </p>

          <form onSubmit={handleLookup} className="flex gap-3 mb-8">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5"
            >
              {loading ? '…' : 'Look up'}
            </Button>
          </form>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {submitted && orders !== null && (
            orders.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm">No orders found for this email.</p>
                <Link href="/start" className="mt-4 inline-block text-sm text-indigo-500 underline">
                  Create your first plan
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-slate-100 text-slate-500' };
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {order.productUrl}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {order.tier === 'basic' ? 'Basic' : 'Pro'} plan ·{' '}
                            {new Date(order.createdAt).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>

                      {order.status === 'ready' && (
                        <Link
                          href={`/delivery/${order.id}`}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                        >
                          ⬇ Download PDF
                        </Link>
                      )}
                      {(order.status === 'generating' || order.status === 'paid') && (
                        <Link
                          href={`/status/${order.id}`}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                        >
                          View progress →
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            <Link href="/start" className="underline">Create a new plan</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
