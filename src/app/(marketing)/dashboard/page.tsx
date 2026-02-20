'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import type { MarketingPlan } from '@/lib/types';

function PlanCard({ plan }: { plan: MarketingPlan }) {
  const appName = plan.config?.app_name || plan.scraped?.name || 'Untitled';
  const url = plan.config?.app_url || plan.scraped?.url;
  const created = plan.createdAt ? new Date(plan.createdAt) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 flex flex-col gap-3 dark:border-white/[0.06] dark:bg-slate-900/40">
      <div className="flex items-start gap-4">
        {(plan.scraped?.icon || plan.config?.icon) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plan.scraped?.icon || plan.config?.icon}
            alt=""
            className="w-12 h-12 rounded-2xl"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 truncate dark:text-white">{appName}</div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block mt-0.5 truncate text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {url}
            </a>
          )}
          {created && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Created {created.toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-600 line-clamp-1 dark:text-slate-500">
          {plan.config?.one_liner || plan.scraped?.shortDescription || plan.scraped?.description}
        </div>
        <Link
          href={`/plan/${plan.id}`}
          className="shrink-0 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:border-indigo-500/35 hover:text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:text-indigo-200"
        >
          Open →
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPlans = useCallback(() => {
    setLoading(true);
    setError('');
    fetch('/api/plans')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plans');
        return res.json() as Promise<MarketingPlan[]>;
      })
      .then((data) => setPlans(data || []))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load plans')
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPlans();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPlans]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            All your generated marketing plans in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/compare"
            className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:border-indigo-500/35 hover:text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            Compare plans
          </Link>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            ← Home
          </Link>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-slate-200 bg-white/90 dark:border-white/[0.06] dark:bg-slate-900/40"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-700/40 bg-red-50 p-5 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && plans.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 text-center dark:border-white/[0.06] dark:bg-slate-900/40">
          <div className="font-semibold text-slate-900 dark:text-slate-200">No plans yet</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Generate your first marketing plan to see it here.
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:border-indigo-500/35 hover:text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              Generate a plan →
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && plans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}
    </div>
  );
}
