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
import { StatusBadge, type Status } from '@/components/StatusBadge';

type OverviewApi = {
  sections: Record<string, { hasContent: boolean; preview: string }>;
  socialPostsCount: number;
  scheduleCount: number;
  wordCount: number;
};

function safeCount(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (typeof v === 'string') return v.trim() ? 1 : 0;
  if (v && typeof v === 'object') return Object.keys(v as object).length;
  return 0;
}

function hubStatus({ ready }: { ready: boolean }): Status {
  return ready ? 'ready' : 'pending';
}

function HubCard({
  title,
  description,
  href,
  icon: Icon,
  status,
  cta,
  highlight,
  preview,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status: Status;
  cta?: string;
  highlight?: boolean;
  preview?: string;
}) {
  return (
    <Link
      href={href}
      className={
        'group relative flex items-start justify-between gap-4 p-5 rounded-2xl border transition-colors ' +
        (highlight
          ? 'bg-indigo-950/25 border-indigo-500/25 hover:border-indigo-400/40'
          : 'bg-slate-900/40 border-white/[0.06] hover:border-indigo-500/25')
      }
    >
      <div className="flex items-start gap-4 min-w-0">
        <div
          className={
            'w-10 h-10 rounded-xl flex items-center justify-center border ' +
            (highlight
              ? 'bg-indigo-500/15 border-indigo-500/25'
              : 'bg-indigo-500/10 border-white/[0.06]')
          }
        >
          <Icon className="w-5 h-5 text-indigo-300" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate">
              {title}
            </h3>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{description}</p>
          {cta && status !== 'ready' && (
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-300 group-hover:text-indigo-200 transition-colors">
              {cta} <ArrowRight className="w-3.5 h-3.5" />
            </div>
          )}
          {preview && status === 'ready' && (
            <p className="mt-2 text-xs text-slate-500 italic line-clamp-1">{preview}</p>
          )}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-300 transition-colors mt-1" />
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-white mt-1">{value}</div>
    </div>
  );
}

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

    return () => {
      cancelled = true;
    };
  }, [id]);

  const computed = useMemo(() => {
    if (!plan) return null;

    const appName = plan.config?.app_name || 'Untitled plan';
    const oneLiner = plan.config?.one_liner || plan.scraped?.description || '';
    const icon = plan.scraped?.icon || plan.config?.icon;

    const stagesAny = plan.stages as unknown as Record<string, unknown>;

    const keywordsCount =
      safeCount((stagesAny as any)?.keywords) ||
      safeCount((stagesAny as any)?.seo?.keywords) ||
      safeCount(plan.scraped?.keywords);

    const featuresCount = plan.scraped?.features?.length || 0;

    const emailSequences = safeCount((stagesAny as any)?.emails) || (overview?.sections?.emails?.hasContent ? 1 : 0);

    const socialChannels = plan.config?.distribution_channels?.length || 0;

    const strategyReady = !!plan.generated?.trim();
    const contentReady = !!(plan.stages?.assets?.trim() || overview?.sections?.templates?.hasContent);
    const distributionReady = !!(plan.stages?.distribution?.trim() || (overview?.socialPostsCount ?? 0) > 0);
    const seoReady = !!(overview?.sections?.keywords?.hasContent || keywordsCount > 0);
    const exportReady = strategyReady;

    const hubReadyCount = [strategyReady, contentReady, distributionReady, seoReady, exportReady].filter(Boolean).length;

    return {
      appName,
      oneLiner,
      icon,
      keywordsCount,
      featuresCount,
      emailSequences,
      socialChannels,
      hubReadyCount,
      statuses: {
        strategy: hubStatus({ ready: strategyReady }),
        content: hubStatus({ ready: contentReady }),
        distribution: hubStatus({ ready: distributionReady }),
        seo: hubStatus({ ready: seoReady }),
        export: hubStatus({ ready: exportReady }),
      } as Record<string, Status>,
    };
  }, [plan, overview]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-32 bg-slate-900/50 border border-white/[0.06] rounded-2xl mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-slate-900/40 border border-white/[0.06] rounded-2xl"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-900/40 border border-white/[0.06] rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !plan || !computed) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="text-slate-400 mb-4">{error || 'Plan not found'}</div>
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          {computed.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={computed.icon} alt="" className="w-14 h-14 rounded-2xl" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-white break-words">
              {computed.appName}
            </h1>
            {computed.oneLiner && (
              <p className="text-sm text-slate-400 mt-1 break-words line-clamp-2">
                {computed.oneLiner}
              </p>
            )}
            {plan?.createdAt && (
              <div className="text-xs text-slate-500 mt-2">
                Created <span suppressHydrationWarning>{new Date(plan.createdAt).toLocaleDateString()}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <StatusBadge status={computed.statuses.strategy} />
              <span className="text-xs text-slate-500">Generated</span>
              <span className="text-slate-700">•</span>
              <StatusBadge status={computed.statuses.content} />
              <span className="text-xs text-slate-500">Content</span>
              <span className="text-slate-700">•</span>
              <span className="text-xs text-slate-500">
                {computed.hubReadyCount} hubs ready
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Keywords found" value={computed.keywordsCount} />
        <StatCard label="Features" value={computed.featuresCount} />
        <StatCard label="Email sequences" value={computed.emailSequences} />
        <StatCard label="Social channels" value={computed.socialChannels} />
      </div>

      {/* Hubs */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">
          Your Marketing Plan
        </h2>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">
          ← All Plans
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <HubCard
          title="Strategy"
          description="Your brief, positioning, and foundation"
          href={`/plan/${id}/strategy/brief`}
          icon={FileText}
          status={computed.statuses.strategy}
          cta="Review brief"
          preview={overview?.sections?.brief?.preview}
        />
        <HubCard
          title="Content"
          description="Drafts, templates, emails, and translations"
          href={`/plan/${id}/content`}
          icon={PenLine}
          status={computed.statuses.content}
          cta="Generate →"
          preview={overview?.sections?.templates?.preview}
        />
        <HubCard
          title="Distribution"
          description="Create social posts, images, and video prompts"
          href={`/plan/${id}/distribution`}
          icon={Megaphone}
          status={computed.statuses.distribution}
          cta="Create Posts & Videos"
          highlight
        />
        <HubCard
          title="SEO & ASO"
          description="Keyword research and search visibility"
          href={`/plan/${id}/seo`}
          icon={Search}
          status={computed.statuses.seo}
          cta="Generate →"
        />
        <HubCard
          title="Export"
          description="Download, share, and export your full pack"
          href={`/plan/${id}/export`}
          icon={Package}
          status={computed.statuses.export}
          cta="Open →"
        />
      </div>

      {/* Suggested next steps */}
      <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-6 mb-10">
        <h2 className="text-sm font-semibold text-white mb-4">💡 Suggested Next Steps</h2>
        <ol className="space-y-2">
          <li>
            <Link
              href={`/plan/${id}/strategy/brief`}
              className="flex items-center gap-3 rounded-xl px-3 py-2 -mx-3 hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-xs w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-semibold">
                1
              </span>
              <span className="text-sm text-slate-200">Review your brief</span>
              <span className="ml-auto text-slate-600">→</span>
            </Link>
          </li>
          <li>
            <Link
              href={`/plan/${id}/distribution`}
              className="flex items-center gap-3 rounded-xl px-3 py-2 -mx-3 hover:bg-indigo-500/10 transition-colors"
            >
              <span className="text-xs w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-semibold">
                2
              </span>
              <span className="text-sm text-slate-200">
                Generate social posts, images, and video prompts
              </span>
              <span className="ml-auto text-indigo-300">→</span>
            </Link>
          </li>
          <li>
            <Link
              href={`/plan/${id}/content`}
              className="flex items-center gap-3 rounded-xl px-3 py-2 -mx-3 hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-xs w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-semibold">
                3
              </span>
              <span className="text-sm text-slate-200">Build your content strategy</span>
              <span className="ml-auto text-slate-600">→</span>
            </Link>
          </li>
        </ol>
      </div>
    </div>
  );
}
