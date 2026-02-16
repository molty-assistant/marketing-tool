'use client';

import { useEffect, useState, use } from 'react';
import PlanNav from '@/components/PlanNav';
import { PageSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import Link from 'next/link';
import { MarketingPlan } from '@/lib/types';

type CompetitorIntel = {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  pricing: string;
};

export default function CompetitorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [competitors, setCompetitors] = useState<CompetitorIntel[]>([]);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [intelError, setIntelError] = useState('');

  useEffect(() => {
    // Load plan (same pattern as other plan pages)
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        const planData = JSON.parse(stored);
        setPlan(planData);
        setLoadingPlan(false);
      } catch {
        loadFromDb();
      }
    } else {
      loadFromDb();
    }

    // Load cached competitor intel (best-effort)
    const cachedIntel = sessionStorage.getItem(`competitors-${id}`);
    if (cachedIntel) {
      try {
        const parsed = JSON.parse(cachedIntel);
        if (Array.isArray(parsed)) {
          setCompetitors(parsed);
        }
      } catch {
        // ignore
      }
    }
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

      const list = data?.competitors;
      if (!Array.isArray(list)) {
        throw new Error('Unexpected response shape');
      }

      setCompetitors(list);
      sessionStorage.setItem(`competitors-${id}`, JSON.stringify(list));
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
              Competitors: {plan.config.app_name}
            </h1>
            <p className="text-slate-400 break-words">
              Generate a quick competitor snapshot (strengths, weaknesses, pricing).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={generateIntel}
            disabled={loadingIntel}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${
              loadingIntel
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {loadingIntel ? 'Generating…' : competitors.length ? 'Regenerate' : 'Generate competitor intel'}
          </button>

          {competitors.length > 0 && (
            <button
              onClick={() => {
                setCompetitors([]);
                sessionStorage.removeItem(`competitors-${id}`);
              }}
              className="text-sm px-4 py-2 rounded-lg transition-colors font-medium bg-slate-800/50 border border-slate-700 text-slate-200 hover:bg-slate-700/50"
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

        <div className="mt-5 bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <span className="text-xl">🧭</span>
            <div className="space-y-1">
              <p className="font-medium text-slate-100">What this does</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300/90">
                <li>Finds 5 direct competitors based on your category + one-liner</li>
                <li>Summarises strengths/weaknesses and pricing model (high-level)</li>
                <li>Useful for positioning and differentiator testing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {competitors.length === 0 ? (
        <div className="text-slate-400 text-sm">
          No competitor intel yet. Click <span className="text-slate-200 font-medium">Generate</span>.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {competitors.map((c) => (
            <div
              key={c.name}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-lg font-semibold text-white break-words">
                  {c.name}
                </h2>
                {c.pricing && (
                  <span className="text-xs bg-slate-700/60 border border-slate-600 text-slate-200 px-2 py-1 rounded-full">
                    {c.pricing}
                  </span>
                )}
              </div>

              {c.description && (
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                  {c.description}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-200 mb-2">Strengths</div>
                  <ul className="text-sm text-slate-300 list-disc list-inside space-y-1">
                    {(c.strengths || []).slice(0, 6).map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 mb-2">Weaknesses</div>
                  <ul className="text-sm text-slate-300 list-disc list-inside space-y-1">
                    {(c.weaknesses || []).slice(0, 6).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 text-center">
        <div className="inline-flex gap-3">
          <a
            href={`/plan/${id}`}
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
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
