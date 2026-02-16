'use client';

import { useEffect, useState, use } from 'react';
import PlanNav from '@/components/PlanNav';
import { PageSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import Link from 'next/link';
import { MarketingPlan } from '@/lib/types';

type CompetitorIntel = {
  name: string;
  oneLiner: string;
  strengths: string[];
  weaknesses: string[];
  pricing: string;
};

type IntelResult = {
  competitors: CompetitorIntel[];
  opportunities: string[];
  marketGaps: string[];
};

function IntelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="h-5 w-36 bg-zinc-800 rounded" />
              <div className="h-5 w-20 bg-zinc-800 rounded-full" />
            </div>
            <div className="h-4 w-full bg-zinc-800 rounded" />
            <div className="h-4 w-3/4 bg-zinc-800 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-3 w-full bg-zinc-800 rounded" />
                ))}
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-3 w-full bg-zinc-800 rounded" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="h-5 w-32 bg-zinc-800 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-full bg-zinc-800 rounded" />
          ))}
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="h-5 w-32 bg-zinc-800 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-full bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CompetitorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [intel, setIntel] = useState<IntelResult>({ competitors: [], opportunities: [], marketGaps: [] });
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [intelError, setIntelError] = useState('');

  useEffect(() => {
    // Load plan
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setLoadingPlan(false);
      } catch {
        loadFromDb();
      }
    } else {
      loadFromDb();
    }

    // Load saved intel from DB
    fetch(`/api/competitive-intel?planId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.competitors?.length) {
          setIntel({
            competitors: data.competitors || [],
            opportunities: data.opportunities || [],
            marketGaps: data.marketGaps || [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSaved(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadFromDb = () => {
    setLoadingPlan(true);
    setFetchError('');
    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((data) => {
        setPlan(data);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setLoadingPlan(false));
  };

  const generateIntel = async () => {
    setLoadingIntel(true);
    setIntelError('');

    try {
      const res = await fetch('/api/competitive-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to generate competitor intel');
      }

      if (!Array.isArray(data?.competitors)) {
        throw new Error('Unexpected response shape');
      }

      setIntel({
        competitors: data.competitors,
        opportunities: data.opportunities || [],
        marketGaps: data.marketGaps || [],
      });
    } catch (err) {
      setIntelError(err instanceof Error ? err.message : 'Failed to generate competitor intel');
    } finally {
      setLoadingIntel(false);
    }
  };

  if (loadingPlan) {
    return <PageSkeleton />;
  }

  if (fetchError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={fetchError} onRetry={loadFromDb} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <p className="text-sm text-slate-500 mb-4">
          This plan may have been deleted or doesn&apos;t exist.
        </p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  const hasResults = intel.competitors.length > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 min-w-0 mb-2">
          {plan.config.icon && (
            <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white break-words">
              🏆 Competitors: {plan.config.app_name}
            </h1>
            <p className="text-slate-400 break-words">
              Competitive landscape — strengths, weaknesses, pricing, opportunities &amp; market gaps.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={generateIntel}
            disabled={loadingIntel}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${
              loadingIntel
                ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {loadingIntel ? 'Analyzing competitors…' : hasResults ? 'Re-analyze Competitors' : 'Analyze Competitors'}
          </button>

          {hasResults && (
            <button
              onClick={() => setIntel({ competitors: [], opportunities: [], marketGaps: [] })}
              className="text-sm px-4 py-2 rounded-lg transition-colors font-medium bg-zinc-900/50 border border-zinc-700 text-zinc-200 hover:bg-zinc-800/50"
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
      </div>

      {/* Loading skeleton */}
      {(loadingIntel || loadingSaved) && !hasResults && <IntelSkeleton />}

      {/* Results */}
      {hasResults && (
        <div className="space-y-8">
          {/* Competitor Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {intel.competitors.map((c) => (
              <div
                key={c.name}
                className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-white break-words">
                    {c.name}
                  </h2>
                  {c.pricing && (
                    <span className="shrink-0 text-xs bg-blue-900/40 border border-blue-800/60 text-blue-200 px-2.5 py-1 rounded-full">
                      {c.pricing}
                    </span>
                  )}
                </div>

                {c.oneLiner && (
                  <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
                    {c.oneLiner}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-green-400 mb-2 uppercase tracking-wide">
                      Strengths
                    </div>
                    <ul className="text-sm text-zinc-300 space-y-1.5">
                      {(c.strengths || []).slice(0, 6).map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5 shrink-0">+</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
                      Weaknesses
                    </div>
                    <ul className="text-sm text-zinc-300 space-y-1.5">
                      {(c.weaknesses || []).slice(0, 6).map((w, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5 shrink-0">−</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Opportunities & Market Gaps */}
          {(intel.opportunities.length > 0 || intel.marketGaps.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {intel.opportunities.length > 0 && (
                <div className="bg-zinc-900/60 border border-indigo-900/40 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide mb-3">
                    💡 Positioning Opportunities
                  </h3>
                  <ul className="space-y-2">
                    {intel.opportunities.map((o, idx) => (
                      <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {intel.marketGaps.length > 0 && (
                <div className="bg-zinc-900/60 border border-blue-900/40 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wide mb-3">
                    🔍 Market Gaps
                  </h3>
                  <ul className="space-y-2">
                    {intel.marketGaps.map((g, idx) => (
                      <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5 shrink-0">◇</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasResults && !loadingIntel && !loadingSaved && (
        <div className="text-center py-12 text-zinc-500">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-sm">No competitive intel yet. Click <span className="text-zinc-300 font-medium">Analyze Competitors</span> to get started.</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 text-center">
        <div className="inline-flex gap-3">
          <a
            href={`/plan/${id}`}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            ← Back to Plan
          </a>
          <a
            href={`/plan/${id}/serp`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            SERP Preview →
          </a>
        </div>
      </div>
    </div>
  );
}
