'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MarketingPlan } from '@/lib/types';
import { useToast } from '@/components/Toast';

type DigestKey =
  | 'key_metrics_summary'
  | 'content_performance_highlights'
  | 'recommended_next_actions'
  | 'trending_keywords'
  | 'competitive_movements'
  | 'markdown';

type Digest = Record<DigestKey, string>;

const SECTION_OPTIONS: {
  key: Exclude<DigestKey, 'markdown'>;
  label: string;
  help: string;
}[] = [
  {
    key: 'key_metrics_summary',
    label: 'Key metrics summary',
    help: 'A quick skim of the week — what changed and what to watch.',
  },
  {
    key: 'content_performance_highlights',
    label: 'Content performance highlights',
    help: 'What content worked, what didn’t, and why.',
  },
  {
    key: 'recommended_next_actions',
    label: 'Recommended next actions',
    help: 'A prioritized 7-day action plan.',
  },
  {
    key: 'trending_keywords',
    label: 'Trending keywords',
    help: 'Keyword ideas in the category with intent cues.',
  },
  {
    key: 'competitive_movements',
    label: 'Competitive movements',
    help: 'Notable changes from competitors and the market.',
  },
];

function buildMarkdown(digest: Partial<Digest>): string {
  const parts = SECTION_OPTIONS.map((s) => {
    const v = digest[s.key] || '';
    return `## ${s.label}\n\n${v}\n`;
  });
  return parts.join('\n');
}

export default function DigestPage() {
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [planId, setPlanId] = useState('');
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');

  const [digest, setDigest] = useState<Partial<Digest>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    setPlansLoading(true);
    setPlansError('');

    fetch('/api/plans')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plans');
        return res.json();
      })
      .then((data) => {
        setPlans(Array.isArray(data) ? (data as MarketingPlan[]) : []);
      })
      .catch((err) => {
        setPlansError(err instanceof Error ? err.message : 'Failed to load plans');
      })
      .finally(() => setPlansLoading(false));
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId) || null,
    [plans, planId]
  );

  const handleGenerate = async () => {
    if (!planId) {
      setError('Please select a plan.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate digest');

      setDigest((data?.digest || {}) as Partial<Digest>);
      toastSuccess('Digest generated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate digest';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const markdown = useMemo(() => {
    if (typeof digest.markdown === 'string' && digest.markdown.trim().length > 0) {
      return digest.markdown;
    }
    return buildMarkdown(digest);
  }, [digest]);

  const handleCopyMarkdown = async () => {
    if (!markdown.trim()) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">🗞️ Weekly Marketing Digest</h1>
          <p className="text-slate-400">
            Generate a weekly recap for a plan — metrics, highlights, next actions, keywords, and competitor moves.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCopyMarkdown}
            disabled={!markdown.trim()}
            className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy as Markdown'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !planId}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Generating…' : '✨ Generate Digest'}
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-white mb-2">Select a plan</label>
            <select
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                setDigest({});
                setError('');
              }}
              disabled={plansLoading}
              className="w-full bg-slate-950/40 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="">{plansLoading ? 'Loading plans…' : 'Choose a plan…'}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.config?.app_name || 'Untitled plan') +
                    (p.createdAt ? ` — ${new Date(p.createdAt).toLocaleDateString()}` : '')}
                </option>
              ))}
            </select>
            {plansError && <div className="text-xs text-red-400 mt-2">{plansError}</div>}
          </div>
          <div>
            <div className="text-xs text-slate-500">
              {selectedPlan ? (
                <>
                  <div className="text-slate-300 font-medium truncate">
                    {selectedPlan.config?.app_name || 'Selected plan'}
                  </div>
                  <div className="truncate">Category: {selectedPlan.config?.category || '—'}</div>
                </>
              ) : (
                'Pick a plan to generate a digest.'
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {SECTION_OPTIONS.map((s) => {
          const value = (digest[s.key] || '').toString();
          const hasValue = value.trim().length > 0;

          return (
            <div
              key={s.key}
              className={`rounded-2xl overflow-hidden border ${
                hasValue
                  ? 'bg-slate-800/30 border-slate-700/60'
                  : 'bg-slate-900/20 border-slate-700/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/40">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{s.label}</div>
                  <div className="text-xs text-slate-500">{s.help}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={async () => {
                      if (!hasValue) return;
                      await navigator.clipboard.writeText(value);
                      toastSuccess(`Copied: ${s.label}`);
                    }}
                    disabled={!hasValue}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    title="Copy section"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div className="p-4">
                <textarea
                  value={value}
                  onChange={(e) =>
                    setDigest((prev) => ({
                      ...prev,
                      [s.key]: e.target.value,
                    }))
                  }
                  placeholder="Not generated yet…"
                  className="w-full min-h-[140px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>
          );
        })}

        <div className="rounded-2xl overflow-hidden border bg-slate-900/20 border-slate-700/30">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/40">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Full report (Markdown)</div>
              <div className="text-xs text-slate-500">Copy/paste into email, Notion, or Slack.</div>
            </div>
          </div>
          <div className="p-4">
            <textarea
              value={markdown}
              readOnly
              className="w-full min-h-[220px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Digests are guidance — validate with your analytics and release notes.
      </div>
    </div>
  );
}
