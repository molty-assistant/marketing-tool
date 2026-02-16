'use client';

import { useEffect, useMemo, useState, use, type ReactNode } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import PlanNav from '@/components/PlanNav';
import ErrorRetry from '@/components/ErrorRetry';
import { DraftSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

type DigestAction = {
  task: string;
  why?: string;
  successCriteria?: string;
};

type DigestCalendarItem = {
  day: string;
  channel: string;
  postIdea: string;
  assetNeeded?: string;
};

type WeeklyDigest = {
  executiveSummary: string;
  keyMetricsToTrack: string[];
  recommendedActions: DigestAction[];
  contentCalendarSuggestions: DigestCalendarItem[];
  competitiveMovesToWatch: string[];
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 mb-6">
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function DigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [plan, setPlan] = useState<(MarketingPlan & { content?: any }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loadingDigest, setLoadingDigest] = useState(false);

  const [done, setDone] = useState<Record<string, boolean>>({});

  const { success: toastOk, error: toastErr } = useToast();

  const loadPlan = () => {
    setLoading(true);
    setError('');

    const cached = sessionStorage.getItem(`plan-${id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setPlan(parsed);
        setLoading(false);
      } catch {
        // ignore
      }
    }

    fetch(`/api/plans/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load plan');
        return r.json();
      })
      .then((d) => {
        setPlan(d);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(d));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load plan'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!plan) return;
    const d = plan?.content?.digest as WeeklyDigest | undefined;
    const t = plan?.content?.digestGeneratedAt as string | undefined;
    if (d) setDigest(d);
    if (t) setGeneratedAt(t);
  }, [plan]);

  const regenerate = async () => {
    setLoadingDigest(true);
    try {
      const r = await fetch('/api/generate-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed to generate digest');

      setDigest(data.digest as WeeklyDigest);
      setGeneratedAt(data?.metadata?.generatedAt || null);

      setPlan((p) => {
        if (!p) return p;
        const next = { ...(p as any) };
        next.content = {
          ...(next.content || {}),
          digest: data.digest,
          digestGeneratedAt: data?.metadata?.generatedAt,
        };
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(next));
        return next;
      });

      setDone({});
      toastOk('Weekly digest generated');
    } catch (e) {
      toastErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoadingDigest(false);
    }
  };

  const actionItems = useMemo(() => digest?.recommendedActions || [], [digest]);

  if (loading) return <DraftSkeleton />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={error} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">🗓️ Weekly Digest</h1>
          <p className="text-slate-400">
            A weekly, action-oriented marketing brief for {plan.config.app_name}.
          </p>
          {generatedAt && (
            <p className="text-xs text-slate-500 mt-1">
              Last generated: {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <button
          onClick={regenerate}
          disabled={loadingDigest}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          {loadingDigest ? 'Generating…' : digest ? '🔄 Regenerate' : '✨ Generate'}
        </button>
      </div>

      {!digest ? (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 text-slate-400">
          Not generated yet. Click{' '}
          <span className="text-white font-semibold">Generate</span> to create this
          week’s digest.
        </div>
      ) : (
        <div>
          <Card title="Executive summary">
            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {digest.executiveSummary}
            </div>
          </Card>

          <Card title="Key metrics to track">
            {!digest.keyMetricsToTrack?.length ? (
              <div className="text-slate-500 text-sm">—</div>
            ) : (
              <ul className="space-y-2">
                {digest.keyMetricsToTrack.map((m, i) => (
                  <li key={i} className="text-sm text-slate-200 flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="This week’s recommended actions">
            {!actionItems.length ? (
              <div className="text-slate-500 text-sm">—</div>
            ) : (
              <div className="space-y-3">
                {actionItems.map((a, i) => {
                  const key = `${i}-${a.task}`;
                  const checked = !!done[key];
                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-900/40 border-slate-700/40 hover:bg-slate-900/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={(e) =>
                          setDone((d) => ({ ...d, [key]: e.target.checked }))
                        }
                      />
                      <div className="min-w-0">
                        <div className="text-white font-semibold text-sm break-words">
                          {a.task}
                        </div>
                        {(a.why || a.successCriteria) && (
                          <div className="mt-1 text-xs text-slate-400 space-y-1">
                            {a.why && (
                              <div>
                                <span className="text-slate-500">Why:</span>{' '}
                                {a.why}
                              </div>
                            )}
                            {a.successCriteria && (
                              <div>
                                <span className="text-slate-500">Success:</span>{' '}
                                {a.successCriteria}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Content calendar suggestions (next 7 days)">
            {!digest.contentCalendarSuggestions?.length ? (
              <div className="text-slate-500 text-sm">—</div>
            ) : (
              <div className="space-y-3">
                {digest.contentCalendarSuggestions.map((c, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-white text-sm font-semibold">
                        {c.day} · {c.channel}
                      </div>
                      {c.assetNeeded && (
                        <div className="text-xs text-slate-400">
                          Asset: {c.assetNeeded}
                        </div>
                      )}
                    </div>
                    <div className="text-slate-200 text-sm mt-2 whitespace-pre-wrap">
                      {c.postIdea}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Competitive moves to watch">
            {!digest.competitiveMovesToWatch?.length ? (
              <div className="text-slate-500 text-sm">—</div>
            ) : (
              <ul className="space-y-2">
                {digest.competitiveMovesToWatch.map((m, i) => (
                  <li key={i} className="text-sm text-slate-200 flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
