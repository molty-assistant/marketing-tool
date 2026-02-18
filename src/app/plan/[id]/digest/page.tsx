'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import PlanNav from '@/components/PlanNav';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';

type Priority = 'high' | 'medium' | 'low';

interface WeeklyDigest {
  summary: string;
  contentCreated: Array<{ type: string; key: string | null; description: string; updatedAt?: string }>;
  recommendations: Array<{ title: string; detail: string }>;
  nextActions: Array<{ action: string; why: string; priority: Priority }>;
  generatedAt: string;
  competitiveLandscape?: string;
}

function SkeletonLine({ w = 'w-full' }: { w?: string }) {
  return <div className={`h-4 ${w} rounded bg-zinc-800/70 animate-pulse`} />;
}

function priorityBadge(p: Priority): string {
  switch (p) {
    case 'high':
      return 'bg-red-500/15 border-red-500/40 text-red-200';
    case 'low':
      return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200';
    default:
      return 'bg-amber-500/15 border-amber-500/40 text-amber-200';
  }
}

export default function DigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');

  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPlan = () => {
    setPlanLoading(true);
    setPlanError('');

    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
      } catch {
        /* ignore */
      }
    }

    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((p) => {
        setPlan(p);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(p));
      })
      .catch((err) => setPlanError(err instanceof Error ? err.message : 'Failed to load plan'))
      .finally(() => setPlanLoading(false));
  };

  const loadSavedDigestFromDb = async () => {
    try {
      const res = await fetch(`/api/plans/${id}/content`);
      if (!res.ok) return;
      const json = await res.json();
      const items =
        (json?.content as Array<{ contentType: string; contentKey: string | null; content: unknown }>) || [];
      const found = items.find((x) => x.contentType === 'weekly-digest');
      if (found && found.content && typeof found.content === 'object') {
        setDigest(found.content as WeeklyDigest);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPlan();
    loadSavedDigestFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/weekly-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to generate digest');

      setDigest(json?.digest as WeeklyDigest);
      toastSuccess('Digest generated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate digest';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20">
        <div className="text-zinc-400">Loading…</div>
      </div>
    );
  }

  if (planError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-zinc-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      <div className="mb-6 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Get a weekly performance digest with content insights, AI recommendations, and prioritised next actions to keep your marketing momentum going.
      </div>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Weekly Digest</h1>
          <p className="text-zinc-400">{plan.config.app_name} — Summary & next steps for the week</p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          {loading ? 'Generating…' : '✨ Generate Digest'}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/40 text-red-200 rounded-2xl p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      {loading && !digest ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <SkeletonLine w="w-2/3" />
            <SkeletonLine />
            <SkeletonLine w="w-5/6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-2xl p-4 space-y-2">
              <SkeletonLine w="w-1/2" />
              <SkeletonLine />
              <SkeletonLine w="w-5/6" />
            </div>
            <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-2xl p-4 space-y-2">
              <SkeletonLine w="w-1/2" />
              <SkeletonLine />
              <SkeletonLine w="w-4/6" />
            </div>
          </div>
        </div>
      ) : !digest ? (
        <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-2xl p-10 text-center">
          <div className="text-zinc-200 font-medium mb-2">No digest yet</div>
          <div className="text-zinc-500 text-sm">Click “Generate Digest” to summarise the last 7 days of work.</div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-white font-semibold">Summary</h2>
              <div className="text-xs text-zinc-500">Generated: {new Date(digest.generatedAt).toLocaleString()}</div>
            </div>
            <div className="text-zinc-200 mt-3 whitespace-pre-wrap">{digest.summary}</div>
          </div>

          {digest.competitiveLandscape && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold">Competitive landscape</h2>
              <div className="text-zinc-200 mt-3 whitespace-pre-wrap">{digest.competitiveLandscape}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold">Content created</h2>
              <div className="text-xs text-zinc-500 mt-1">From the last 7 days of saved artefacts</div>

              {digest.contentCreated.length === 0 ? (
                <div className="text-zinc-400 text-sm mt-4">No recent saved content found.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {digest.contentCreated.map((item, idx) => (
                    <div key={idx} className="bg-zinc-950/30 border border-zinc-800/60 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm text-white font-medium">
                          {item.type}
                          {item.key ? <span className="text-zinc-400 font-normal"> • {item.key}</span> : null}
                        </div>
                        {item.updatedAt ? (
                          <div className="text-[11px] text-zinc-500">{new Date(item.updatedAt).toLocaleDateString()}</div>
                        ) : null}
                      </div>
                      <div className="text-sm text-zinc-200 mt-2 whitespace-pre-wrap">{item.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold">Recommendations</h2>
              {digest.recommendations.length === 0 ? (
                <div className="text-zinc-400 text-sm mt-4">No recommendations returned.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {digest.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-zinc-950/30 border border-zinc-800/60 rounded-xl p-4">
                      <div className="text-sm text-white font-semibold">{rec.title}</div>
                      <div className="text-sm text-zinc-200 mt-2 whitespace-pre-wrap">{rec.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold">Next actions</h2>
            {digest.nextActions.length === 0 ? (
              <div className="text-zinc-400 text-sm mt-4">No next actions returned.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {digest.nextActions.map((a, idx) => (
                  <div key={idx} className="bg-zinc-950/30 border border-zinc-800/60 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="text-sm text-white font-semibold">{a.action}</div>
                      <div className={`text-[11px] px-2 py-1 rounded-lg border ${priorityBadge(a.priority)}`}>
                        {a.priority.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-200 mt-2 whitespace-pre-wrap">{a.why}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
