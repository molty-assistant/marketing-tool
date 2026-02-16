'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import PlanNav from '@/components/PlanNav';
import { PageSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import { MarketingPlan } from '@/lib/types';

type Competitor = {
  name: string;
  oneLiner: string;
  strengths: string[];
  weaknesses: string[];
  pricing: string;
};

type CompetitiveIntel = {
  competitors: Competitor[];
  opportunities: string[];
  marketGaps: string[];
};

function SkeletonCard() {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="h-5 w-44 bg-zinc-800 rounded" />
        <div className="h-5 w-24 bg-zinc-800 rounded-full" />
      </div>
      <div className="space-y-2 mb-5">
        <div className="h-3 w-full bg-zinc-800 rounded" />
        <div className="h-3 w-5/6 bg-zinc-800 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-zinc-800 rounded" />
          <div className="h-3 w-full bg-zinc-800 rounded" />
          <div className="h-3 w-5/6 bg-zinc-800 rounded" />
          <div className="h-3 w-4/6 bg-zinc-800 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 bg-zinc-800 rounded" />
          <div className="h-3 w-full bg-zinc-800 rounded" />
          <div className="h-3 w-5/6 bg-zinc-800 rounded" />
          <div className="h-3 w-4/6 bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function CompetitorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [intel, setIntel] = useState<CompetitiveIntel | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [intelError, setIntelError] = useState('');

  const hasIntel = useMemo(() => !!intel?.competitors?.length, [intel]);

  useEffect(() => {
    const loadPlan = async () => {
      setLoadingPlan(true);
      setFetchError('');

      const stored = sessionStorage.getItem(`plan-${id}`);
      if (stored) {
        try {
          const planData = JSON.parse(stored);
          setPlan(planData);
          setLoadingPlan(false);
        } catch {
          // fall through
        }
      }

      try {
        const res = await fetch(`/api/plans/${id}`);
        if (!res.ok) throw new Error('Failed to load plan');
        const data = await res.json();
        setPlan(data);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoadingPlan(false);
      }
    };

    const loadIntel = async () => {
      try {
        const res = await fetch(`/api/plans/${id}/content`);
        if (!res.ok) return;
        const data = await res.json();
        const all: unknown[] = Array.isArray(data?.content) ? (data.content as unknown[]) : [];

        const entry = all.find((c) => {
          if (!c || typeof c !== 'object') return false;
          const obj = c as Record<string, unknown>;
          const type = obj.contentType;
          const key = obj.contentKey;
          return type === 'competitive-intel' && (key === null || key === '' || typeof key === 'undefined');
        });

        if (entry && typeof entry === 'object') {
          const obj = entry as Record<string, unknown>;
          const content = obj.content;
          if (content && typeof content === 'object') {
            const parsed = content as CompetitiveIntel;
            if (Array.isArray(parsed.competitors)) setIntel(parsed);
          }
        }
      } catch {
        // best-effort
      }
    };

    loadPlan();
    loadIntel();
  }, [id]);

  const analyze = async () => {
    if (!plan) return;

    setLoadingIntel(true);
    setIntelError('');

    try {
      const res = await fetch('/api/competitive-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          appName: plan.config.app_name,
          category: plan.config.category,
          oneLiner: plan.config.one_liner,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to analyze competitors');

      const next: CompetitiveIntel = {
        competitors: Array.isArray(data?.competitors) ? data.competitors : [],
        opportunities: Array.isArray(data?.opportunities) ? data.opportunities : [],
        marketGaps: Array.isArray(data?.marketGaps) ? data.marketGaps : [],
      };

      if (!next.competitors.length) throw new Error('Unexpected response shape');

      setIntel(next);
    } catch (err) {
      setIntelError(err instanceof Error ? err.message : 'Failed to analyze competitors');
    } finally {
      setLoadingIntel(false);
    }
  };

  if (loadingPlan) return <PageSkeleton />;

  if (fetchError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={fetchError} onRetry={() => location.reload()} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-zinc-400 mb-4">Plan not found</div>
        <p className="text-sm text-zinc-500 mb-4">
          This plan may have been deleted or doesn&apos;t exist.
        </p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      <div className="mb-8">
        <div className="flex items-center gap-4 min-w-0 mb-2">
          {plan.config.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white break-words">Competitor Intelligence</h1>
            <p className="text-zinc-400 break-words">
              Top competitors, pricing models, and positioning opportunities.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={analyze}
            disabled={loadingIntel}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${
              loadingIntel
                ? 'bg-zinc-800 text-zinc-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {loadingIntel ? 'Analyzing…' : hasIntel ? 'Re-analyze competitors' : 'Analyze Competitors'}
          </button>

          {hasIntel && (
            <button
              onClick={() => setIntel(null)}
              className="text-sm px-4 py-2 rounded-lg transition-colors font-medium bg-zinc-950 border border-zinc-800 text-zinc-200 hover:bg-zinc-900"
            >
              Clear
            </button>
          )}
        </div>

        {intelError && (
          <div className="mt-4 bg-red-950/30 border border-red-900/60 rounded-xl p-4 text-sm text-red-200">
            {intelError}
          </div>
        )}

        <div className="mt-5 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300">
          <div className="flex items-start gap-3">
            <span className="text-xl">🏆</span>
            <div className="space-y-1">
              <p className="font-medium text-zinc-100">What you get</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-300/90">
                <li>Top 5 competitors for your category + positioning</li>
                <li>Strengths/weaknesses and pricing model (best-effort)</li>
                <li>Market gaps + marketing opportunities to exploit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {loadingIntel ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : !hasIntel ? (
        <div className="text-zinc-400 text-sm">
          No competitive intel yet. Click{' '}
          <span className="text-zinc-200 font-medium">Analyze Competitors</span>.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(intel?.competitors || []).slice(0, 5).map((c) => (
              <div key={c.name} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-white break-words">{c.name}</h2>
                  {c.pricing && (
                    <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-1 rounded-full">
                      {c.pricing}
                    </span>
                  )}
                </div>

                {c.oneLiner && (
                  <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{c.oneLiner}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200 mb-2">Strengths</div>
                    <ul className="text-sm text-zinc-300 list-disc list-inside space-y-1">
                      {(c.strengths || []).slice(0, 6).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200 mb-2">Weaknesses</div>
                    <ul className="text-sm text-zinc-300 list-disc list-inside space-y-1">
                      {(c.weaknesses || []).slice(0, 6).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Opportunities</h3>
              <ul className="text-sm text-zinc-300 list-disc list-inside space-y-1">
                {(intel?.opportunities || []).slice(0, 10).map((o, idx) => (
                  <li key={idx}>{o}</li>
                ))}
              </ul>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Market gaps</h3>
              <ul className="text-sm text-zinc-300 list-disc list-inside space-y-1">
                {(intel?.marketGaps || []).slice(0, 10).map((g, idx) => (
                  <li key={idx}>{g}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <div className="inline-flex gap-3">
          <a
            href={`/plan/${id}`}
            className="bg-zinc-900 hover:bg-zinc-800 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            ← Back to Plan
          </a>
          <a
            href={`/plan/${id}/serp`}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            SERP Preview →
          </a>
        </div>
      </div>
    </div>
  );
}
