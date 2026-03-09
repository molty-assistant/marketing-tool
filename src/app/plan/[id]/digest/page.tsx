'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';
import { PageSkeleton } from '@/components/Skeleton';
import DismissableTip from '@/components/DismissableTip';
import { Button } from '@/components/ui/button';

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
  return <div className={`h-4 ${w} rounded bg-muted animate-pulse`} />;
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

  const { plan, loading: planLoading, error: planError, reload: loadPlan } = usePlan(id);

  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


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
    void loadSavedDigestFromDb();
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
    return <PageSkeleton />;
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
        <div className="text-muted-foreground mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <DismissableTip id="digest-tip">Get a weekly performance digest with content insights, AI recommendations, and prioritised next actions to keep your marketing momentum going.</DismissableTip>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📊 Weekly Digest</h1>
          <p className="text-muted-foreground">{plan.config.app_name} — Summary & next steps for the week</p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="text-sm px-5 py-2.5 rounded-xl"
        >
          {loading ? 'Generating…' : '✨ Generate Digest'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/40 text-red-200 rounded-2xl p-4 mb-8 text-sm">
          {error}
        </div>
      )}

      {loading && !digest ? (
        <div className="bg-muted border border-border rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <SkeletonLine w="w-2/3" />
            <SkeletonLine />
            <SkeletonLine w="w-5/6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted border border-border rounded-2xl p-4 space-y-2">
              <SkeletonLine w="w-1/2" />
              <SkeletonLine />
              <SkeletonLine w="w-5/6" />
            </div>
            <div className="bg-muted border border-border rounded-2xl p-4 space-y-2">
              <SkeletonLine w="w-1/2" />
              <SkeletonLine />
              <SkeletonLine w="w-4/6" />
            </div>
          </div>
        </div>
      ) : !digest ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <div className="text-muted-foreground font-medium mb-2">No digest yet</div>
          <div className="text-muted-foreground text-sm">Click “Generate Digest” to summarise the last 7 days of work.</div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-muted border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-foreground font-semibold">Summary</h2>
              <div className="text-xs text-muted-foreground">Generated: {new Date(digest.generatedAt).toLocaleString()}</div>
            </div>
            <div className="text-muted-foreground mt-3 whitespace-pre-wrap">{digest.summary}</div>
          </div>

          {digest.competitiveLandscape && (
            <div className="bg-muted border border-border rounded-2xl p-6">
              <h2 className="text-foreground font-semibold">Competitive landscape</h2>
              <div className="text-muted-foreground mt-3 whitespace-pre-wrap">{digest.competitiveLandscape}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-muted border border-border rounded-2xl p-6">
              <h2 className="text-foreground font-semibold">Content created</h2>
              <div className="text-xs text-muted-foreground mt-1">From the last 7 days of saved artefacts</div>

              {digest.contentCreated.length === 0 ? (
                <div className="text-muted-foreground text-sm mt-4">No recent saved content found.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {digest.contentCreated.map((item, idx) => (
                    <div key={idx} className="bg-muted border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm text-foreground font-medium">
                          {item.type}
                          {item.key ? <span className="text-muted-foreground font-normal"> • {item.key}</span> : null}
                        </div>
                        {item.updatedAt ? (
                          <div className="text-[11px] text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</div>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{item.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-muted border border-border rounded-2xl p-6">
              <h2 className="text-foreground font-semibold">Recommendations</h2>
              {digest.recommendations.length === 0 ? (
                <div className="text-muted-foreground text-sm mt-4">No recommendations returned.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {digest.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-muted border border-border rounded-xl p-4">
                      <div className="text-sm text-foreground font-semibold">{rec.title}</div>
                      <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{rec.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-muted border border-border rounded-2xl p-6">
            <h2 className="text-foreground font-semibold">Next actions</h2>
            {digest.nextActions.length === 0 ? (
              <div className="text-muted-foreground text-sm mt-4">No next actions returned.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {digest.nextActions.map((a, idx) => (
                  <div key={idx} className="bg-muted border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="text-sm text-foreground font-semibold">{a.action}</div>
                      <div className={`text-[11px] px-2 py-1 rounded-lg border ${priorityBadge(a.priority)}`}>
                        {a.priority.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{a.why}</div>
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
