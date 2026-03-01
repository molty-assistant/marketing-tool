'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface OrderData {
  id: string;
  status: string;
  tier: 'basic' | 'pro';
  email: string; // masked: t***@example.com
  productUrl: string;
  createdAt: string;
}

export default function DeliveryPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  /** Mint a download token for the given email. Returns true on success. */
  const mintToken = useCallback(async (emailToUse: string): Promise<boolean> => {
    setMinting(true);
    setError('');
    try {
      const tokenRes = await fetch(`/api/pdf/orders/${orderId}/download-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });
      const data = await tokenRes.json() as { token?: string; error?: string };
      if (!tokenRes.ok) {
        setError(data.error ?? 'Could not prepare your download. Please try again.');
        return false;
      }
      // Cache token so refresh doesn't re-mint
      sessionStorage.setItem(`pdf-token-${orderId}`, data.token!);
      setToken(data.token!);
      setNeedsEmail(false);
      return true;
    } catch {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setMinting(false);
    }
  }, [orderId]);

  useEffect(() => {
    async function load() {
      try {
        const orderRes = await fetch(`/api/pdf/orders/${orderId}`);
        if (!orderRes.ok) { setError('Order not found.'); return; }
        const orderData = await orderRes.json() as OrderData;
        setOrder(orderData);

        if (orderData.status !== 'ready') {
          setError('Your PDF is not ready yet. Please wait on the status page.');
          return;
        }

        // Use cached token — prevents re-minting on every page refresh
        const cachedToken = sessionStorage.getItem(`pdf-token-${orderId}`);
        if (cachedToken) {
          setToken(cachedToken);
          return;
        }

        // Auto-mint using email cached by /start page (same browser session)
        const cachedEmail = sessionStorage.getItem(`pdf-email-${orderId}`);
        if (cachedEmail) {
          await mintToken(cachedEmail);
        } else {
          // Different session/device — ask for email
          setNeedsEmail(true);
        }
      } catch {
        setError('Something went wrong. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId, mintToken]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = emailInput.trim().toLowerCase();
    if (!normalized) return;
    const ok = await mintToken(normalized);
    if (ok) {
      sessionStorage.setItem(`pdf-email-${orderId}`, normalized);
    }
  }

  async function handleDownload() {
    if (!token) return;
    setDownloading(true);

    try {
      const res = await fetch(`/api/pdf/download/${token}`);
      if (!res.ok) {
        setError('Download failed. Please refresh and try again.');
        setDownloading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marketing-plan-${orderId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full">
        <section className="rounded-3xl border border-slate-200 bg-white p-10 dark:border-slate-800 dark:bg-[#0d1117]">
          <p className="text-center text-slate-500 animate-pulse">Preparing your download…</p>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-lg text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Your plan is ready</h1>
          <p className="text-slate-500 mb-8">
            {order?.tier === 'basic' ? 'Basic' : 'Pro'} Marketing Plan for{' '}
            <span className="font-medium">{order?.productUrl}</span>
          </p>

          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}

          {/* Email confirmation — shown when no sessionStorage email is available */}
          {needsEmail && (
            <form onSubmit={handleEmailSubmit} className="mb-6 text-left rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Confirm your email to download
              </p>
              <p className="text-xs text-slate-400 mb-3">
                Enter the email you used at checkout.
                {order?.email && (
                  <> Your address starts with <span className="font-mono">{order.email}</span></>
                )}
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <Button
                  type="submit"
                  disabled={minting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 text-sm"
                >
                  {minting ? '…' : 'Confirm'}
                </Button>
              </div>
            </form>
          )}

          {minting && !needsEmail && (
            <p className="text-slate-400 text-sm animate-pulse mb-4">Preparing your download…</p>
          )}

          {token && (
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-base mb-4 w-full sm:w-auto"
            >
              {downloading ? 'Downloading…' : '⬇ Download your PDF'}
            </Button>
          )}

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900 text-left">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Order details</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Plan</dt>
                <dd className="font-medium text-slate-900 dark:text-white capitalize">{order?.tier}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Generated for</dt>
                <dd className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]">{order?.productUrl}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Order ID</dt>
                <dd className="font-mono text-xs text-slate-400">{order?.id.slice(0, 8)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-xs text-slate-400">
              This link is valid for 30 days and up to 10 downloads.
            </p>
            <p className="text-xs text-slate-400">
              <Link href="/start" className="underline">Generate another plan</Link>
              {' · '}
              <Link href="/my-pdfs" className="underline">View all your orders</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
