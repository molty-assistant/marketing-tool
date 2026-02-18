'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import type { OverviewResponse, SectionStatus } from '@/app/api/plans/[id]/overview/route';

// ─── helpers ────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function readinessLabel(score: number): string {
  if (score <= 30) return 'Getting started 🌱';
  if (score <= 60) return 'Building momentum 🔥';
  if (score <= 85) return 'Almost there ⚡';
  return 'Launch ready 🚀';
}

function readinessColor(score: number): string {
  if (score <= 30) return '#22c55e'; // green
  if (score <= 60) return '#f97316'; // orange
  if (score <= 85) return '#a855f7'; // purple
  return '#4f46e5'; // indigo
}

// ─── circular progress ───────────────────────────────────────────────────────

function ReadinessRing({ score }: { score: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  const gap = circumference - dash;
  const color = readinessColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="120" viewBox="0 0 100 100">
        {/* Track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        {/* Progress */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* Score text */}
        <text
          x="50"
          y="45"
          textAnchor="middle"
          fill="white"
          fontSize="20"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          {score}%
        </text>
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="9"
          fontFamily="sans-serif"
        >
          Readiness
        </text>
      </svg>
      <span className="text-xs font-medium" style={{ color }}>
        {readinessLabel(score)}
      </span>
    </div>
  );
}

// ─── section card ────────────────────────────────────────────────────────────

interface SectionDef {
  key: string;
  label: string;
  emoji: string;
  href: string;
  description: string;
}

const SECTIONS: SectionDef[] = [
  { key: 'brief',      label: 'Brief',          emoji: '📋', href: '',            description: 'Core marketing brief' },
  { key: 'foundation', label: 'Foundation',      emoji: '🧱', href: '/foundation', description: 'Brand voice & positioning' },
  { key: 'draft',      label: 'Draft',           emoji: '📝', href: '/draft',      description: 'App Store copy' },
  { key: 'copy',       label: 'Copy / Variants', emoji: '🏆', href: '/variants',   description: 'Headline A/B testing' },
  { key: 'templates',  label: 'Templates',       emoji: '🧩', href: '/templates',  description: 'Ready-to-use templates' },
  { key: 'keywords',   label: 'Keywords',        emoji: '🔑', href: '/keywords',   description: 'ASO keyword research' },
  { key: 'distribute', label: 'Distribute',      emoji: '📣', href: '/distribute', description: 'Cross-platform posting' },
  { key: 'emails',     label: 'Emails',          emoji: '✉️',  href: '/emails',     description: 'Welcome & launch emails' },
  { key: 'social',     label: 'Social',          emoji: '📱', href: '/social',     description: 'Instagram & TikTok posts' },
  { key: 'schedule',   label: 'Schedule',        emoji: '⏰', href: '/schedule',   description: 'Auto-posting calendar' },
  { key: 'translate',  label: 'Translate',       emoji: '🌍', href: '/translate',  description: '10-language store copy' },
  { key: 'serp',       label: 'SERP Preview',    emoji: '🔍', href: '/serp',       description: 'Google search preview' },
];

// Priority order for quick actions (only sections that can be "missing")
const ACTION_PRIORITY: string[] = [
  'foundation', 'draft', 'keywords', 'distribute', 'emails', 'schedule', 'social',
];

const ACTION_LABELS: Record<string, string> = {
  foundation: 'Generate your Foundation brief',
  draft:      'Write your App Store copy',
  keywords:   'Research ASO keywords',
  distribute: 'Set up content distribution',
  emails:     'Create your email sequence',
  schedule:   'Set up your content schedule',
  social:     'Create your first social post',
};

function SectionCard({
  section,
  status,
  planId,
}: {
  section: SectionDef;
  status: SectionStatus;
  planId: string;
}) {
  const href = `/plan/${planId}${section.href}`;

  let statusIcon: string;
  let statusText: string;
  let borderClass: string;

  if (status.hasContent) {
    statusIcon = '✅';
    statusText = 'Generated';
    borderClass = 'border-slate-700/50 hover:border-indigo-500/40';
  } else {
    statusIcon = '⬜';
    statusText = 'Not yet';
    borderClass = 'border-slate-700/30 hover:border-slate-600/50';
  }

  return (
    <Link
      href={href}
      className={`group flex flex-col gap-2 bg-slate-800/50 border ${borderClass} rounded-xl p-4 transition-all hover:bg-slate-800/80`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl leading-none">{section.emoji}</span>
        <span className="text-xs">{statusIcon}</span>
      </div>

      <div>
        <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
          {section.label}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{section.description}</div>
      </div>

      <div className="mt-auto">
        {status.hasContent && status.preview ? (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {status.preview}
          </p>
        ) : (
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded-full ${
              status.hasContent
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-slate-700/50 text-slate-500'
            }`}
          >
            {statusText}
          </span>
        )}
      </div>

      <div className="text-xs text-slate-600 group-hover:text-indigo-400 transition-colors text-right">
        →
      </div>
    </Link>
  );
}

// ─── stats bar ───────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-3 bg-slate-800/50 border border-slate-700/40 rounded-xl flex-1 min-w-[120px]">
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="h-10 bg-slate-800 rounded-xl mb-6" />
      <div className="h-40 bg-slate-800/60 rounded-2xl mb-6" />
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-800/60 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-800/60 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetch(`/api/plans/${id}/overview`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load overview');
        return res.json() as Promise<OverviewResponse>;
      })
      .then((d) => setData(d))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Unknown error')
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <OverviewSkeleton />;

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="text-slate-400 mb-4">{error || 'Plan not found'}</div>
        <button
          onClick={load}
          className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
        >
          Try again →
        </button>
      </div>
    );
  }

  const { plan, sections, socialPostsCount, scheduleCount, wordCount } = data;

  // Calculate readiness score
  const total = SECTIONS.length;
  const complete = SECTIONS.filter((s) => sections[s.key]?.hasContent).length;
  const score = Math.round((complete / total) * 100);

  // Quick actions: top 3 missing sections in priority order
  const quickActions = ACTION_PRIORITY.filter(
    (key) => !sections[key]?.hasContent
  ).slice(0, 3);

  const sectionDef = (key: string) => SECTIONS.find((s) => s.key === key);

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Plan Header ─────────────────────────────────────────── */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {plan.config.icon && (
            <img
              src={plan.config.icon}
              alt=""
              className="w-16 h-16 rounded-xl flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white break-words">
              {plan.config.app_name}
            </h1>
            {plan.config.one_liner && (
              <p className="text-slate-400 text-sm mt-0.5 break-words">
                {plan.config.one_liner}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {plan.config.app_url && (
                <a
                  href={plan.config.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors truncate max-w-[200px]"
                >
                  🔗 {plan.config.app_url}
                </a>
              )}
              <span className="text-xs text-slate-500">
                Created {relativeTime(plan.createdAt)}
              </span>
              {plan.updatedAt && plan.updatedAt !== plan.createdAt && (
                <span className="text-xs text-slate-500">
                  · Updated {relativeTime(plan.updatedAt)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                {plan.config.app_type}
              </span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                {plan.config.category}
              </span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                {plan.config.pricing}
              </span>
            </div>
          </div>
        </div>

        {/* Readiness Ring */}
        <div className="flex-shrink-0 self-center sm:self-start">
          <ReadinessRing score={score} />
        </div>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatPill label="Sections complete" value={`${complete}/${total}`} />
        <StatPill label="Words generated" value={`~${wordCount.toLocaleString()}`} />
        <StatPill label="Social posts" value={socialPostsCount} />
        <StatPill label="Scheduled items" value={scheduleCount} />
      </div>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      {quickActions.length > 0 && (
        <div className="bg-indigo-950/30 border border-indigo-700/30 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-indigo-300 mb-3">
            🚀 Recommended next steps
          </h2>
          <div className="space-y-2">
            {quickActions.map((key, i) => {
              const def = sectionDef(key);
              if (!def) return null;
              return (
                <Link
                  key={key}
                  href={`/plan/${id}${def.href}`}
                  className="flex items-center gap-3 group hover:bg-indigo-900/20 rounded-xl px-3 py-2.5 -mx-3 transition-colors"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                    <span>{def.emoji}</span>
                    <span>{ACTION_LABELS[key]}</span>
                  </span>
                  <span className="ml-auto text-slate-600 group-hover:text-indigo-400 text-sm transition-colors flex-shrink-0">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* All done! */}
      {quickActions.length === 0 && (
        <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-2xl p-5 mb-6 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <div className="text-emerald-300 font-semibold text-sm">
              Marketing plan complete!
            </div>
            <div className="text-slate-400 text-xs mt-0.5">
              All priority sections have been generated. Export your full marketing pack below.
            </div>
          </div>
        </div>
      )}

      {/* ── Section Grid ─────────────────────────────────────────── */}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Sections
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {SECTIONS.map((section) => (
          <SectionCard
            key={section.key}
            section={section}
            status={sections[section.key] ?? { hasContent: false, preview: '' }}
            planId={id}
          />
        ))}
      </div>

      {/* ── Footer note ──────────────────────────────────────────── */}
      <div className="text-center text-xs text-slate-600 mb-8">
        {complete} of {total} sections complete · Generated using the Vibe Marketing Playbook
      </div>
    </div>
  );
}
