'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTestPage() {
  const router = useRouter();
  const [productUrl, setProductUrl] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<'basic' | 'pro'>('basic');
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('running');
    setMessage('Creating order and running pipeline… this may take a minute.');

    try {
      const res = await fetch('/api/pdf/test-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl, email, tier }),
      });

      const data = await res.json() as {
        orderId?: string;
        pipelineStatus?: string;
        lastError?: string;
        statusUrl?: string;
        deliveryUrl?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        setStatus('error');
        setMessage(data.error ?? 'Request failed');
        return;
      }

      setStatus('done');
      setMessage(`Pipeline: ${data.pipelineStatus ?? 'unknown'}${data.lastError ? ` — ${data.lastError}` : ''}`);

      if (data.pipelineStatus === 'ready' && data.deliveryUrl) {
        router.push(data.deliveryUrl);
      } else if (data.statusUrl) {
        router.push(data.statusUrl);
      }
    } catch {
      setStatus('error');
      setMessage('Network error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold mb-1">Test Order Generator</h1>
        <p className="text-sm text-gray-400 mb-6">Bypasses Stripe — generates a real pack.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Product URL</label>
            <input
              type="text"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="yourproduct.com"
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Tier</label>
            <div className="flex gap-3">
              {(['basic', 'pro'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    tier === t
                      ? 'border-indigo-500 bg-indigo-950 text-indigo-300'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {t === 'basic' ? 'Entry (£39)' : 'Pro (£99)'}
                </button>
              ))}
            </div>
          </div>

          {message && (
            <p className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'running'}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 text-sm font-semibold transition-colors"
          >
            {status === 'running' ? 'Generating…' : 'Create & Generate →'}
          </button>
        </form>
      </div>
    </div>
  );
}
