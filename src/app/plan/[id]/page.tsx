'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  Megaphone,
  Package,
  PenLine,
  Search,
} from 'lucide-react';

import type { MarketingPlan } from '@/lib/types';

type OverviewApi = {
  sections: Record<string, { hasContent: boolean; preview: string }>;
  socialPostsCount: number;
  scheduleCount: number;
  wordCount: number;
};

/* ─── Action Card (top tier — large, prominent) ─── */

const ACTION_CARDS = [
  {
    title: 'Brief',
    description: 'Generate and refine your marketing brief with clear positioning and strategy.',
    href: '/strategy/brief',
    icon: FileText,
    gradient: 'from-indigo-500 to-blue-500',
    iconBg: 'bg-indigo-400/25',
  },
  {
    title: 'Copy Draft',
    description: 'Create app store, landing page, and release copy from your brief.',
    href: '/draft',
    icon: PenLine,
    gradient: 'from-emerald-500 to-cyan-500',
    iconBg: 'bg-emerald-400/25',
  },
] as const;

function ActionCard({
  card,
  planId,
}: {
  card: (typeof ACTION_CARDS)[number];
  planId: string;
}) {
  const Icon = card.icon;
  return (
    <Link
      href={`/plan/${planId}${card.href}`}
      className="group relative overflow-hidden rounded-2xl border border-white/10 p-6 transition-all hover:scale-[1.02] hover:shadow-lg"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90 transition-opacity group-hover:opacity-100`}
      />
      <div className="relative z-10">
        <div className={`mb-4 inline-flex rounded-xl p-2.5 ${card.iconBg}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">{card.title}</h3>
        <p className="mt-1 text-sm text-white/80">{card.description}</p>
        <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white/90 transition-colors group-hover:text-white">
          Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/* ─── Suite Card (bottom tier — small, muted) ─── */

const SUITE_ITEMS = [
  { label: 'Brief', href: '/strategy/brief', icon: FileText },
  { label: 'Competitors', href: '/competitors', icon: Search },
  { label: 'Copy Draft', href: '/draft', icon: PenLine },
  { label: 'Keywords', href: '/keywords', icon: Search },
  { label: 'Tone Compare', href: '/tone-compare', icon: PenLine },
  { label: 'SERP Preview', href: '/serp', icon: Search },
  { label: 'Emails', href: '/emails', icon: Megaphone },
  { label: 'Templates', href: '/templates', icon: FileText },
  { label: 'Translations', href: '/translate', icon: PenLine },
  { label: 'Schedule', href: '/schedule', icon: Megaphone },
  { label: 'Calendar', href: '/calendar', icon: Megaphone },
  { label: 'Export', href: '/export', icon: Package },
] as const;

function SuiteCard({
  item,
  planId,
}: {
  item: (typeof SUITE_ITEMS)[number];
  planId: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={`/plan/${planId}${item.href}`}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-white/[0.06] dark:bg-slate-900/40 dark:hover:border-indigo-500/25 dark:hover:bg-indigo-950/20"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.06]">
        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      </div>
      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">
        {item.label}
      </span>
      <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-indigo-500 dark:text-slate-600 dark:group-hover:text-indigo-400" />
    </Link>
  );
}

/* ─── Page ─── */

export default function PlanOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [overview, setOverview] = useState<OverviewApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');

      Promise.all([
        fetch(`/api/plans/${id}`).then((r) => {
          if (!r.ok) throw new Error('Failed to load plan');
          return r.json() as Promise<MarketingPlan>;
        }),
        fetch(`/api/plans/${id}/overview`).then((r) => {
          if (!r.ok) throw new Error('Failed to load overview');
          return r.json() as Promise<OverviewApi>;
        }),
      ])
        .then(([p, o]) => {
          if (cancelled) return;
          setPlan(p);
          setOverview(o);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : 'Failed to load plan');
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id]);

  const computed = useMemo(() => {
    if (!plan) return null;

    const appName = plan.config?.app_name || 'Untitled plan';
    const oneLiner = plan.config?.one_liner || plan.scraped?.description || '';
    const icon = plan.scraped?.icon || plan.config?.icon;

    const wordCount = overview?.wordCount ?? 0;

    return { appName, oneLiner, icon, wordCount };
  }, [plan, overview]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="mb-6 h-28 rounded-2xl border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-slate-900/50" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-slate-900/40"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !plan || !computed) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="mb-4 text-slate-500 dark:text-slate-400">{error || 'Plan not found'}</div>
        <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-slate-900/40">
        <div className="flex items-start gap-4">
          {computed.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={computed.icon} alt="" className="w-14 h-14 rounded-2xl" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 break-words dark:text-white">
              {computed.appName}
            </h1>
            {computed.oneLiner && (
              <p className="mt-1 line-clamp-2 break-words text-sm text-slate-600 dark:text-slate-400">
                {computed.oneLiner}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
              {plan?.createdAt && (
                <span suppressHydrationWarning>
                  Created {new Date(plan.createdAt).toLocaleDateString()}
                </span>
              )}
              {computed.wordCount > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span>{computed.wordCount.toLocaleString()} words generated</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action cards — top tier */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Start Here
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ACTION_CARDS.map((card) => (
            <ActionCard key={card.href} card={card} planId={id} />
          ))}
        </div>
      </div>

      {/* Marketing Suite — bottom tier */}
      <div className="mb-10">
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Marketing Suite
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SUITE_ITEMS.map((item) => (
            <SuiteCard key={item.href} item={item} planId={id} />
          ))}
        </div>
      </div>
    </div>
  );
}
