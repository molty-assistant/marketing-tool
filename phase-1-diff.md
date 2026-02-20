# app/(marketing)/analyze/page.tsx

```tsx
import { redirect } from 'next/navigation';

export default function AnalyzePage() {
  redirect('/');
}

```

# app/(marketing)/compare/page.tsx

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { MarketingPlan } from '@/lib/types';

type PlanContentRow = {
  contentType: string;
  contentKey: string | null;
  content: unknown;
};

type PlanContentApiResponse = {
  planId: string;
  content: PlanContentRow[];
};

type ContentByType = Record<string, unknown[]>;

const contentCache = new Map<string, ContentByType>();

function toContentByType(rows: PlanContentRow[]): ContentByType {
  const map: ContentByType = {};
  for (const row of rows) {
    if (!map[row.contentType]) {
      map[row.contentType] = [];
    }
    map[row.contentType].push(row.content);
  }
  return map;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => asString(item))
    .filter(Boolean);
}

function truncate(text: string, max = 200): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function firstMarkdownParagraph(markdown: string): string {
  if (!markdown.trim()) return '';

  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith('#') &&
        !line.startsWith('-') &&
        !line.startsWith('*') &&
        !line.startsWith('\`\`\`') &&
        !line.startsWith('>')
    );

  return truncate(lines.join(' '), 220);
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function getFirstContent(content: ContentByType | null, type: string): unknown {
  if (!content || !content[type]?.length) return null;
  return content[type][0];
}

type SequenceSummary = {
  type: string;
  subjectLines: string[];
  count: number;
};

function parseEmailSequence(value: unknown): SequenceSummary | null {
  const root = asRecord(value);
  if (!root) return null;

  const sequence = asRecord(root.sequence);
  if (!sequence) return null;

  const type = asString(sequence.type) || 'sequence';
  const emails = asArray(sequence.emails).map((item) => asRecord(item)).filter(Boolean) as Record<
    string,
    unknown
  >[];

  if (!emails.length) return null;

  const subjectLines = emails
    .map((email) => asString(email.subjectLine))
    .filter(Boolean)
    .slice(0, 3);

  return { type, subjectLines, count: emails.length };
}

function emailSummaries(value: unknown): SequenceSummary[] {
  const direct = parseEmailSequence(value);
  if (direct) return [direct];

  const record = asRecord(value);
  if (!record) return [];

  const collected: SequenceSummary[] = [];
  for (const key of Object.keys(record)) {
    const parsed = parseEmailSequence(record[key]);
    if (parsed) {
      const type = parsed.type === 'sequence' ? key : parsed.type;
      collected.push({ ...parsed, type });
    }
  }
  return collected;
}

function summarizeBrief(plan: MarketingPlan): string[] {
  const lines: string[] = [];

  const oneLiner = asString(plan.config?.one_liner);
  if (oneLiner) lines.push(oneLiner);

  const audience = asString(plan.config?.target_audience);
  if (audience) lines.push(`Audience: ${audience}`);

  const excerpt = firstMarkdownParagraph(asString(plan.generated));
  if (excerpt) lines.push(`Excerpt: ${excerpt}`);

  return uniqueLines(lines).slice(0, 3);
}

function summarizePositioning(plan: MarketingPlan, content: ContentByType | null): string[] {
  const lines: string[] = [];

  const positioning = asRecord(getFirstContent(content, 'positioning'));
  if (positioning) {
    const primary = asString(positioning.recommendedPrimary);
    if (primary) lines.push(`Primary: ${primary}`);

    const angles = asArray(positioning.angles)
      .map((item) => asRecord(item))
      .filter(Boolean) as Record<string, unknown>[];
    if (angles.length) {
      lines.push(
        `Angles: ${angles
          .map((angle) => asString(angle.name))
          .filter(Boolean)
          .slice(0, 3)
          .join(', ')}`
      );
      const firstHook = asString(angles[0]?.hook);
      if (firstHook) lines.push(`Hook: ${truncate(firstHook, 140)}`);
    }
  }

  if (!lines.length) {
    const differentiators = asStringArray(plan.config?.differentiators);
    if (differentiators.length) {
      lines.push(`Differentiators: ${differentiators.slice(0, 4).join(', ')}`);
    }
  }

  return uniqueLines(lines).slice(0, 4);
}

function summarizeBrandVoice(content: ContentByType | null): string[] {
  const lines: string[] = [];
  const brandVoice = asRecord(getFirstContent(content, 'brand-voice'));

  if (!brandVoice) return lines;

  const summary = asString(brandVoice.voiceSummary);
  if (summary) lines.push(summary);

  const traits = asArray(brandVoice.personalityTraits)
    .map((item) => asRecord(item))
    .filter(Boolean) as Record<string, unknown>[];
  if (traits.length) {
    lines.push(
      `Traits: ${traits
        .map((trait) => asString(trait.trait))
        .filter(Boolean)
        .slice(0, 4)
        .join(', ')}`
    );
  }

  return uniqueLines(lines).slice(0, 3);
}

function summarizeEmails(content: ContentByType | null): string[] {
  const emails = getFirstContent(content, 'emails');
  const sequences = emailSummaries(emails);

  if (!sequences.length) return [];

  const lines: string[] = [];
  for (const seq of sequences.slice(0, 2)) {
    lines.push(`${seq.type}: ${seq.count} emails`);
    if (seq.subjectLines.length) {
      lines.push(`Subjects: ${seq.subjectLines.join(' | ')}`);
    }
  }

  return uniqueLines(lines).slice(0, 4);
}

function summarizeAtoms(plan: MarketingPlan, content: ContentByType | null): string[] {
  const atomData = asRecord(getFirstContent(content, 'atoms'));
  const lines: string[] = [];

  if (atomData) {
    const corePiece = asRecord(atomData.corePiece);
    const coreTitle = asString(corePiece?.title);
    if (coreTitle) lines.push(`Core: ${coreTitle}`);

    const atoms = asArray(atomData.atoms)
      .map((item) => asRecord(item))
      .filter(Boolean) as Record<string, unknown>[];

    if (atoms.length) {
      lines.push(`Atoms: ${atoms.length}`);

      const byPlatform = new Map<string, number>();
      for (const atom of atoms) {
        const platform = asString(atom.platform);
        if (!platform) continue;
        byPlatform.set(platform, (byPlatform.get(platform) ?? 0) + 1);
      }

      if (byPlatform.size) {
        const platformSummary = Array.from(byPlatform.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([platform, count]) => `${platform} (${count})`)
          .join(', ');

        lines.push(`Platforms: ${platformSummary}`);
      }
    }
  }

  if (!lines.length) {
    const channels = asStringArray(plan.config?.distribution_channels);
    if (channels.length) {
      lines.push(`Planned channels: ${channels.join(', ')}`);
    }
  }

  return uniqueLines(lines).slice(0, 4);
}

function summarizeCompetitive(plan: MarketingPlan, content: ContentByType | null): string[] {
  const lines: string[] = [];

  const competitive = asRecord(getFirstContent(content, 'competitive-analysis'));
  if (competitive) {
    const competitors = asArray(competitive.competitors);
    if (competitors.length) lines.push(`Competitors analyzed: ${competitors.length}`);

    const opportunities = asStringArray(competitive.opportunities);
    if (opportunities.length) {
      lines.push(`Top opportunity: ${truncate(opportunities[0], 120)}`);
    }
  }

  if (!lines.length) {
    const configured = asStringArray(plan.config?.competitors);
    if (configured.length) {
      lines.push(`Known competitors: ${configured.slice(0, 4).join(', ')}`);
    }
  }

  return uniqueLines(lines).slice(0, 3);
}

function CellLines({ lines }: { lines: string[] }) {
  if (!lines.length) {
    return <span className="text-slate-500">Not available</span>;
  }

  return (
    <ul className="space-y-1.5 text-sm text-slate-200">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`} className="leading-relaxed break-words">
          {line}
        </li>
      ))}
    </ul>
  );
}

function usePlanContent(planId: string) {
  const cached = planId ? (contentCache.get(planId) ?? null) : null;
  const [state, setState] = useState<{
    planId: string;
    content: ContentByType | null;
    loading: boolean;
    error: string;
  }>({
    planId: '',
    content: null,
    loading: false,
    error: '',
  });

  useEffect(() => {
    if (!planId || cached) {
      return;
    }

    let cancelled = false;

    fetch(`/api/plans/${planId}/content`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || 'Failed to load plan content');
        }
        return (await res.json()) as PlanContentApiResponse;
      })
      .then((data) => {
        if (cancelled) return;
        const contentByType = toContentByType(data.content || []);
        contentCache.set(planId, contentByType);
        setState({
          planId,
          content: contentByType,
          loading: false,
          error: '',
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          planId,
          content: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load plan content',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [planId, cached]);

  const stateIsCurrent = state.planId === planId;
  const loading = !!planId && !cached && (!stateIsCurrent || state.loading);
  const content = planId ? cached ?? (stateIsCurrent ? state.content : null) : null;
  const error = planId && !cached && stateIsCurrent ? state.error : '';

  return { content, loading, error };
}

function planLabel(plan: MarketingPlan): string {
  return plan.config?.app_name || plan.scraped?.name || plan.id;
}

function createdLabel(plan: MarketingPlan): string {
  const ts = plan.createdAt ? new Date(plan.createdAt).getTime() : Number.NaN;
  if (!Number.isFinite(ts)) return 'Unknown date';
  return new Date(ts).toLocaleDateString();
}

export default function ComparePlansPage() {
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [selectedLeftPlanId, setSelectedLeftPlanId] = useState('');
  const [selectedRightPlanId, setSelectedRightPlanId] = useState('');

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTs - aTs;
    });
  }, [plans]);

  useEffect(() => {
    fetch('/api/plans')
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || 'Failed to load plans');
        }
        return (await res.json()) as MarketingPlan[];
      })
      .then((data) => {
        const nextPlans = data || [];
        setPlans(nextPlans);
      })
      .catch((err: unknown) => {
        setPlansError(err instanceof Error ? err.message : 'Failed to load plans');
      })
      .finally(() => setPlansLoading(false));
  }, []);

  const defaultLeftPlanId = sortedPlans[0]?.id ?? '';
  const defaultRightPlanId = sortedPlans[1]?.id ?? sortedPlans[0]?.id ?? '';
  const leftPlanId =
    selectedLeftPlanId && sortedPlans.some((plan) => plan.id === selectedLeftPlanId)
      ? selectedLeftPlanId
      : defaultLeftPlanId;
  const rightPlanId =
    selectedRightPlanId && sortedPlans.some((plan) => plan.id === selectedRightPlanId)
      ? selectedRightPlanId
      : defaultRightPlanId;

  const leftPlan = useMemo(
    () => sortedPlans.find((plan) => plan.id === leftPlanId) || null,
    [sortedPlans, leftPlanId]
  );
  const rightPlan = useMemo(
    () => sortedPlans.find((plan) => plan.id === rightPlanId) || null,
    [sortedPlans, rightPlanId]
  );

  const leftContentState = usePlanContent(leftPlanId);
  const rightContentState = usePlanContent(rightPlanId);

  const notEnoughPlans = !plansLoading && sortedPlans.length < 2;
  const samePlanSelected = !!leftPlanId && leftPlanId === rightPlanId;

  const rows = useMemo(() => {
    if (!leftPlan || !rightPlan) return [];

    const leftContent = leftContentState.content;
    const rightContent = rightContentState.content;

    return [
      {
        section: 'Brief Summary',
        left: summarizeBrief(leftPlan),
        right: summarizeBrief(rightPlan),
      },
      {
        section: 'Positioning',
        left: summarizePositioning(leftPlan, leftContent),
        right: summarizePositioning(rightPlan, rightContent),
      },
      {
        section: 'Brand Voice',
        left: summarizeBrandVoice(leftContent),
        right: summarizeBrandVoice(rightContent),
      },
      {
        section: 'Emails',
        left: summarizeEmails(leftContent),
        right: summarizeEmails(rightContent),
      },
      {
        section: 'Distribute Atoms',
        left: summarizeAtoms(leftPlan, leftContent),
        right: summarizeAtoms(rightPlan, rightContent),
      },
      {
        section: 'Competitive Snapshot',
        left: summarizeCompetitive(leftPlan, leftContent),
        right: summarizeCompetitive(rightPlan, rightContent),
      },
    ];
  }, [leftPlan, rightPlan, leftContentState.content, rightContentState.content]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Plan Comparison</h1>
          <p className="text-sm text-slate-400 mt-1">
            Compare two plans side-by-side across brief, positioning, brand voice, emails, and distribution outputs.
          </p>
        </div>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">
          ← Back to dashboard
        </Link>
      </div>

      <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-4 sm:p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Plan A</span>
            <select
              value={leftPlanId}
              onChange={(e) => setSelectedLeftPlanId(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              disabled={plansLoading || !sortedPlans.length}
            >
              {sortedPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {planLabel(plan)} · {createdLabel(plan)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Plan B</span>
            <select
              value={rightPlanId}
              onChange={(e) => setSelectedRightPlanId(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              disabled={plansLoading || !sortedPlans.length}
            >
              {sortedPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {planLabel(plan)} · {createdLabel(plan)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {samePlanSelected && (
          <div className="mt-3 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded-xl px-3 py-2">
            Select two different plans to compare.
          </div>
        )}
      </div>

      {plansLoading && (
        <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-6 text-slate-400 text-sm">
          Loading plans…
        </div>
      )}

      {!plansLoading && plansError && (
        <div className="bg-red-950/30 border border-red-700/40 rounded-2xl p-5 text-red-200 text-sm">
          {plansError}
        </div>
      )}

      {notEnoughPlans && !plansError && (
        <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-8 text-center">
          <div className="text-slate-200 font-semibold">Need at least two plans to compare</div>
          <p className="text-sm text-slate-400 mt-2">Generate another plan, then come back to this page.</p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center bg-indigo-500/15 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 hover:border-indigo-400/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Create plan →
            </Link>
          </div>
        </div>
      )}

      {!plansLoading && !plansError && !notEnoughPlans && (
        <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-950/40">
                <tr>
                  <th className="w-[18%] text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-700/40">
                    Section
                  </th>
                  <th className="w-[41%] text-left px-4 py-3 text-xs font-semibold text-slate-300 border-b border-slate-700/40">
                    {leftPlan ? planLabel(leftPlan) : 'Plan A'}
                  </th>
                  <th className="w-[41%] text-left px-4 py-3 text-xs font-semibold text-slate-300 border-b border-slate-700/40">
                    {rightPlan ? planLabel(rightPlan) : 'Plan B'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.section} className="align-top">
                    <th className="px-4 py-4 text-left text-slate-400 font-medium border-b border-slate-700/30">
                      {row.section}
                    </th>
                    <td className="px-4 py-4 border-b border-slate-700/30">
                      {leftContentState.loading ? (
                        <span className="text-slate-500">Loading…</span>
                      ) : leftContentState.error ? (
                        <span className="text-red-300">{leftContentState.error}</span>
                      ) : (
                        <CellLines lines={row.left} />
                      )}
                    </td>
                    <td className="px-4 py-4 border-b border-slate-700/30">
                      {rightContentState.loading ? (
                        <span className="text-slate-500">Loading…</span>
                      ) : rightContentState.error ? (
                        <span className="text-red-300">{rightContentState.error}</span>
                      ) : (
                        <CellLines lines={row.right} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

```

# app/(marketing)/dashboard/page.tsx

```tsx
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

```

# app/(marketing)/layout.tsx

```tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export const metadata: Metadata = {
  title: 'Marketing Tool — Vibe Marketing Brief Generator',
  description:
    'Paste any App Store, Google Play, or website URL and get a complete 5-stage marketing brief powered by the Vibe Marketing methodology. AI-enhanced copy, competitive analysis, and social media assets included.',
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors dark:text-white dark:hover:text-indigo-400"
          >
            <span>Marketing Tool</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link
              href="/"
              className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Start
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white"
            >
              Plans
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </>
  );
}

```

# app/(marketing)/page.tsx

```tsx
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import GenerationOverlay from '@/components/GenerationOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
      {children}
    </div>
  );
}

function normalizeUrl(input: string): string {
  return input.trim().match(/^https?:\/\//i) ? input.trim() : `https://${input.trim()}`;
}

function isValidUrl(input: string): boolean {
  try {
    new URL(normalizeUrl(input));
    return true;
  } catch {
    return false;
  }
}

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingUrl, setGeneratingUrl] = useState('');
  const router = useRouter();

  const features = useMemo(
    () => [
      {
        title: 'AI Briefs',
        desc: 'Generate a complete, structured marketing brief from any URL.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M8 6h10M8 10h10M8 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 4h12a2 2 0 012 2v14l-4-3H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Competitor Analysis',
        desc: 'Quick scan of positioning, angles, and messaging in your space.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 19V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 19V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Export Pack',
        desc: 'Download your brief as clean Markdown and PDF-ready content.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v3h16v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Multi-Platform',
        desc: 'Works for App Store, Google Play, and any website landing page.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7z" stroke="currentColor" strokeWidth="2" />
            <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Brand Assets',
        desc: 'Generate copy-friendly assets and visual direction you can reuse.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M4 19V5h16v14H4z" stroke="currentColor" strokeWidth="2" />
            <path d="M8 9h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 13h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 13l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'A/B Variants',
        desc: 'Create multiple copy angles and iterate faster with your team.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M7 6h10M7 12h10M7 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 4h14v16H5V4z" stroke="currentColor" strokeWidth="2" />
          </svg>
        ),
      },
      {
        title: 'Shareable Links',
        desc: 'Send a single link to teammates or clients for review and edits.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M10 13a5 5 0 010-7l1-1a5 5 0 017 7l-1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 11a5 5 0 010 7l-1 1a5 5 0 01-7-7l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'SEO + Keywords',
        desc: 'Discover messaging and keyword opportunities for growth channels.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M10 10a4 4 0 118 0 4 4 0 01-8 0z" stroke="currentColor" strokeWidth="2" />
            <path d="M2 20l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 14l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
    []
  );

  const handleStart = () => {
    setError('');
    if (!url.trim()) {
      setError('Paste a URL to generate your plan.');
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    if (!isValidUrl(normalizedUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    setGeneratingUrl(normalizedUrl);
    setGenerating(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStart();
  };

  return (
    <div className="w-full">
      {generating && (
        <GenerationOverlay
          url={generatingUrl}
          onComplete={(planId) => router.push(`/plan/${planId}`)}
          onError={(err) => {
            setGenerating(false);
            setError(err);
          }}
        />
      )}
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-700 dark:text-indigo-200">
            <span className="text-slate-700 dark:text-slate-300">Generate a brief in minutes, not days</span>
          </div>

          <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
            Turn Any URL Into a Complete Marketing Plan
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            Paste a link. Get a brief, content strategy, social posts, email sequences, SEO keywords, and distribution plan — in under 60 seconds.
          </p>

          {/* CTA */}
          <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-700/60 dark:bg-slate-900/60">
            <Label htmlFor="landing-url" className="block mb-3 text-left">
              Product URL (required)
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                id="landing-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="https://linear.app (or an App Store / Play link)"
                className="h-auto rounded-xl border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus-visible:border-transparent dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 sm:flex-1"
              />
              <Button
                onClick={handleStart}
                className="w-full sm:w-auto h-auto font-semibold px-6 py-3 whitespace-nowrap"
              >
                Generate plan →
              </Button>
            </div>
            {error && <p className="mt-2 text-left text-sm text-red-600 dark:text-red-400">{error}</p>}

            <p className="mt-3 text-left text-xs text-slate-500 dark:text-slate-500">
              No signup required · Works with any website, App Store, or Play Store link
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900/40">Export to Markdown/PDF</span>
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900/40">Built for founders & marketers</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mt-12 scroll-mt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">How it works</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            From link → brief → asset pack, in three simple steps.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              title: 'Paste URL',
              desc: 'Drop in an App Store, Google Play, or website URL.',
            },
            {
              step: '02',
              title: 'AI Generates',
              desc: 'We draft positioning, messaging, copy angles, and structure.',
            },
            {
              step: '03',
              title: 'Download Pack',
              desc: 'Export a clean brief and reuse the outputs anywhere.',
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-300">STEP {s.step}</div>
                <div className="h-2 w-2 rounded-full bg-indigo-400/70" />
              </div>
              <div className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{s.title}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mt-12 scroll-mt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Everything you need to ship marketing faster</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Practical outputs — not generic advice — designed to drop straight into your workflow.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="flex items-start gap-3">
                <Icon>{f.icon}</Icon>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{f.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-14 border-t border-slate-200 pt-8 pb-10 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Marketing Tool</div>
            <div className="mt-1 text-sm text-slate-500">Turn any URL into a complete marketing brief.</div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6 text-sm">
            <Link href="/dashboard" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Plans
            </Link>
            <a href="#features" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Features
            </a>
            {/* Pricing removed */}
          </div>
        </div>

        <div className="mt-8 text-xs text-slate-600">
          © {new Date().getFullYear()} Marketing Tool. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

```

# app/(marketing)/shared/[token]/page.tsx

```tsx
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

function renderMarkdown(md: string): string {
  return md
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300 underline">$1</a>')
    .replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled /> $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled /> $1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\|(.+)\|$/gm, (_, content) => {
      const cells = content.split('|').map((c: string) => c.trim());
      if (cells.every((c: string) => /^[-:]+$/.test(c))) return '';
      const cellHtml = cells.map((c: string) => `<td>${c}</td>`).join('');
      return `<tr>${cellHtml}</tr>`;
    })
    .replace(/^---$/gm, '<hr />')
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')
    .replace(/\n{3,}/g, '\n\n');
}

function StageSection({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-800/50 transition-colors text-left"
      >
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-slate-500 text-xl">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-700/50">
          <div
            className="markdown-content mt-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      )}
    </div>
  );
}

interface SharedPlan {
  config: {
    app_name: string;
    one_liner: string;
    icon: string;
    app_type: string;
    category: string;
    pricing: string;
    distribution_channels: string[];
  };
  generated: string;
  stages: {
    research: string;
    foundation: string;
    structure: string;
    assets: string;
    distribution: string;
  };
}

export default function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [plan, setPlan] = useState<SharedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  useEffect(() => {
    fetch(`/api/shared/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setPlan)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="inline-flex items-center gap-3 text-lg text-slate-300">
          <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading shared plan...
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Shared plan not found</div>
        <p className="text-sm text-slate-500 mb-4">This link may have expired or been removed.</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Create your own marketing brief
        </Link>
      </div>
    );
  }

  const handleExportMarkdown = () => {
    const blob = new Blob([plan.generated], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-brief-${plan.config.app_name.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (pdfExporting) return;
    setPdfExporting(true);

    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const match = /filename="?([^";]+)"?/i.exec(cd);
      const filename = match?.[1] || `marketing-brief-${plan.config.app_name.toLowerCase().replace(/\s+/g, '-')}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Sorry — something went wrong exporting your PDF. Please try again.');
    } finally {
      setPdfExporting(false);
    }
  };

  const stageLabels = [
    { key: 'research' as const, title: '🔍 Stage 1: Research' },
    { key: 'foundation' as const, title: '🏗️ Stage 2: Foundation' },
    { key: 'structure' as const, title: '🧱 Stage 3: Structure' },
    { key: 'assets' as const, title: '✍️ Stage 4: Copy Templates' },
    { key: 'distribution' as const, title: '📡 Stage 5: Distribution' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Shared banner */}
      <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-4 mb-6 text-center">
        <p className="text-sm text-indigo-300">
          📋 This is a shared marketing brief.{' '}
          <Link href="/" className="underline hover:text-indigo-200 font-medium">
            Create your own →
          </Link>
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-4 min-w-0">
            {plan.config.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white break-words">{plan.config.app_name}</h1>
              <p className="text-slate-400 break-words">{plan.config.one_liner}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportMarkdown}
            className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg transition-colors"
          >
            📥 Export .md
          </button>
          <button
            onClick={handleExportPdf}
            disabled={pdfExporting}
            className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {pdfExporting ? 'Preparing…' : '📄 Export PDF'}
          </button>
        </div>
      </div>

      {/* Config summary */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap gap-3">
          <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
            {plan.config.app_type}
          </span>
          <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
            {plan.config.category}
          </span>
          <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
            {plan.config.pricing}
          </span>
          {plan.config.distribution_channels.map((ch) => (
            <span key={ch} className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* Stages - all expanded by default */}
      {stageLabels.map((stage) => (
        <StageSection
          key={stage.key}
          title={stage.title}
          content={plan.stages[stage.key]}
        />
      ))}

      {/* Footer */}
      <div className="text-center text-sm text-slate-600 mt-8 mb-4">
        Generated using the Vibe Marketing Playbook 5-Stage Sequence
      </div>
    </div>
  );
}

```

# app/(marketing)/wizard/page.tsx

```tsx
// Redirect wizard users to the landing page
import { redirect } from 'next/navigation'

export default function WizardPage() {
  redirect('/')
}

```

# app/api/approval-queue/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPlan, type ApprovalQueueRow, type ApprovalQueueStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

function emptyStats(): Stats {
  return { total: 0, pending: 0, approved: 0, rejected: 0 };
}

function normalizeStatus(input: unknown): ApprovalQueueStatus | null {
  if (input === 'pending' || input === 'approved' || input === 'rejected') return input;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const planId = request.nextUrl.searchParams.get('planId') || '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const db = getDb();

    const items = db
      .prepare(
        `SELECT * FROM approval_queue
         WHERE plan_id = ?
         ORDER BY datetime(created_at) DESC`
      )
      .all(planId) as ApprovalQueueRow[];

    const statsRows = db
      .prepare(
        `SELECT status, COUNT(*) as count
         FROM approval_queue
         WHERE plan_id = ?
         GROUP BY status`
      )
      .all(planId) as { status: ApprovalQueueStatus; count: number }[];

    const stats = emptyStats();
    stats.total = items.length;
    for (const r of statsRows) {
      if (r.status === 'pending') stats.pending = r.count;
      if (r.status === 'approved') stats.approved = r.count;
      if (r.status === 'rejected') stats.rejected = r.count;
    }

    return NextResponse.json({ items, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch approval queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type PostBody =
  | {
      action: 'add';
      planId: string;
      sectionType: string;
      sectionLabel: string;
      content: string;
    }
  | {
      action: 'approve' | 'reject' | 'set-status';
      id: string;
      status?: ApprovalQueueStatus;
    }
  | {
      action: 'update';
      id: string;
      editedContent?: string | null;
      content?: string;
      sectionLabel?: string;
      sectionType?: string;
    }
  | {
      action: 'delete';
      id: string;
    };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PostBody>;

    const action = body?.action;
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Missing "action"' }, { status: 400 });
    }

    const db = getDb();

    if (action === 'add') {
      const planId = typeof body.planId === 'string' ? body.planId : '';
      const sectionType = typeof body.sectionType === 'string' ? body.sectionType.trim() : '';
      const sectionLabel = typeof body.sectionLabel === 'string' ? body.sectionLabel.trim() : '';
      const content = typeof body.content === 'string' ? body.content : '';

      if (!planId) return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
      if (!sectionType) return NextResponse.json({ error: 'Missing "sectionType"' }, { status: 400 });
      if (!sectionLabel) return NextResponse.json({ error: 'Missing "sectionLabel"' }, { status: 400 });
      if (!content.trim()) return NextResponse.json({ error: 'Missing "content"' }, { status: 400 });

      const plan = getPlan(planId);
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO approval_queue (id, plan_id, section_type, section_label, content, status, edited_content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', NULL, datetime('now'), datetime('now'))`
      ).run(id, planId, sectionType, sectionLabel, content);

      const item = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(id) as ApprovalQueueRow;
      return NextResponse.json({ item });
    }

    if (action === 'approve' || action === 'reject' || action === 'set-status') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return NextResponse.json({ error: 'Missing "id"' }, { status: 400 });

      const status =
        action === 'approve'
          ? 'approved'
          : action === 'reject'
            ? 'rejected'
            : normalizeStatus(body.status);

      if (!status) {
        return NextResponse.json({ error: 'Missing/invalid "status"' }, { status: 400 });
      }

      const result = db
        .prepare(`UPDATE approval_queue SET status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(status, id);

      if (result.changes === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const item = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(id) as ApprovalQueueRow;
      return NextResponse.json({ item });
    }

    if (action === 'update') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return NextResponse.json({ error: 'Missing "id"' }, { status: 400 });

      const fields: string[] = [];
      const values: unknown[] = [];

      if ('editedContent' in body) {
        fields.push('edited_content = ?');
        values.push(typeof body.editedContent === 'string' ? body.editedContent : null);
      }

      if (typeof body.content === 'string') {
        fields.push('content = ?');
        values.push(body.content);
      }

      if (typeof body.sectionLabel === 'string') {
        fields.push('section_label = ?');
        values.push(body.sectionLabel.trim());
      }

      if (typeof body.sectionType === 'string') {
        fields.push('section_type = ?');
        values.push(body.sectionType.trim());
      }

      if (fields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      fields.push("updated_at = datetime('now')");

      const result = db
        .prepare(`UPDATE approval_queue SET ${fields.join(', ')} WHERE id = ?`)
        .run(...values, id);

      if (result.changes === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const item = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(id) as ApprovalQueueRow;
      return NextResponse.json({ item });
    }

    if (action === 'delete') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return NextResponse.json({ error: 'Missing "id"' }, { status: 400 });

      const result = db.prepare('DELETE FROM approval_queue WHERE id = ?').run(id);
      if (result.changes === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update approval queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/atomize-content/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

interface AtomizeContentRequest {
  planId: string;
  sourceContent?: string;
  platforms?: string[];
}

const DEFAULT_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'twitter', 'reddit', 'email'] as const;

function cleanAndParseJson(text: string): unknown {
  let cleaned = text
    .replace(/^\`\`\`(?:json)?\s*\n?/i, '')
    .replace(/\n?\`\`\`\s*$/i, '')
    .trim();

  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    cleaned = '{' + cleaned + '}';
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found');
    return JSON.parse(jsonMatch[0]);
  }
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string' && v.trim().length > 0) as string[];
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/atomize-content',
    maxRequests: 8,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = (await request.json()) as Partial<AtomizeContentRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const platforms =
      body.platforms && Array.isArray(body.platforms) && body.platforms.length > 0
        ? safeStringArray(body.platforms)
        : [...DEFAULT_PLATFORMS];

    const sourceContent = typeof body.sourceContent === 'string' ? body.sourceContent.trim() : '';

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const systemPrompt = `You are a content strategist and social copywriter.

Your job: take ONE core piece of content about the product and atomize it into many platform-native pieces.

Rules:
- Output MUST be valid JSON only (no markdown fences, no commentary).
- Tone: human, specific, non-corporate. Avoid hype.
- Reference real product features/benefits from the plan context.
- If sourceContent is empty, first create a "corePiece" (blog post / announcement) that would make sense to publish.
- Then generate 12-15+ content atoms derived from the core piece across the requested platforms.
- Each atom must include characterCount (count the characters of the content field) and helpful posting notes.
- When platform is twitter, include both a thread and at least one single tweet.
- When platform is reddit, keep it authentic, no marketing speak; include suggested subreddits.
- When platform is instagram, write a visually-led caption with a strong hook in the first line, emojis, line breaks for readability, and 5-10 relevant hashtags. Format: "hook\n\nbody\n\nCTA\n\n#hashtags". Keep under 2200 chars.
- When platform is tiktok, write a punchy video script caption (hook + 3 key points + CTA) under 300 chars for the caption, plus a "videoScript" style notes field with talking points for a 30-60s video. Include trending-style hashtags.

Return JSON shape:
{
  "corePiece": { "title": "...", "content": "..." },
  "atoms": [
    {
      "platform": "linkedin" | "twitter" | "instagram" | "reddit" | "email" | string,
      "format": "...",
      "content": "...",
      "hashtags": ["#tag"],
      "subreddits": ["/r/..."],
      "characterCount": 123,
      "notes": "..."
    }
  ],
  "metadata": { "model": "gemini-2.5-flash", "tokens": 0, "atomCount": 15 }
}

Do not include any keys besides corePiece, atoms, metadata.`;

    const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}\n\nREQUEST:\nplatforms=${JSON.stringify(platforms)}\n\nSOURCE CONTENT (if provided):\n${sourceContent || '(none)'}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = cleanAndParseJson(text);
    } catch {
      console.error('Failed to parse Gemini JSON:', text.slice(0, 500));
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const usage = data?.usageMetadata;
    const tokens =
      typeof usage?.totalTokenCount === 'number'
        ? usage.totalTokenCount
        : typeof usage?.promptTokenCount === 'number' &&
            typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null;

    // Server-side fixups: character counts + metadata
    let atoms: Record<string, unknown>[] = [];
    let corePieceContent: string | null = null;

    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const atomsRaw = obj.atoms;
      if (Array.isArray(atomsRaw)) {
        atoms = atomsRaw.filter((a) => a && typeof a === 'object') as Record<string, unknown>[];
      }

      const corePiece = obj.corePiece;
      if (corePiece && typeof corePiece === 'object') {
        const content = (corePiece as Record<string, unknown>).content;
        if (typeof content === 'string') corePieceContent = content;
      }

      for (const atom of atoms) {
        const contentVal = typeof atom.content === 'string' ? (atom.content as string) : '';
        atom.characterCount = contentVal.length;
      }

      const metadataRaw = (obj.metadata && typeof obj.metadata === 'object'
        ? (obj.metadata as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      metadataRaw.model = 'gemini-2.5-flash';
      metadataRaw.tokens = tokens;
      metadataRaw.atomCount = atoms.length;
      obj.metadata = metadataRaw;
    }

    if (corePieceContent && atoms.length >= 8) {
      saveContent(planId, 'atoms', null, JSON.stringify(parsed));
    }

    if (!corePieceContent || atoms.length < 8) {
      return NextResponse.json(
        { error: 'Model did not return enough content atoms. Please try again.' },
        { status: 502 }
      );
    }

    // Persist the generated atoms
    updatePlanContent(planId, 'atoms', parsed);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('atomize-content error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/auto-publish/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

/**
 * Auto-publish: Generate a social post + image and queue it to Buffer in one step.
 * This is the endpoint that cron jobs / scheduled tasks call.
 *
 * POST /api/auto-publish
 * {
 *   planId: string,
 *   platform: "instagram" | "tiktok",
 *   contentType?: "post" | "reel" | "story" | "carousel",
 *   topic?: string,
 *   publishNow?: boolean  // default false (queue)
 * }
 */

interface AutoPublishRequest {
  planId: string;
  platform: 'instagram' | 'tiktok';
  contentType?: string;
  topic?: string;
  publishNow?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<AutoPublishRequest>;

    const planId = body.planId;
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const platform = body.platform || 'instagram';
    const contentType = body.contentType || 'post';
    const topic = body.topic || '';
    const publishNow = body.publishNow ?? false;

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');

    // Step 1: Generate post text via Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const platformGuidelines: Record<string, string> = {
      instagram: `Create an Instagram ${contentType}. Caption: 150-300 words with engaging hook. 20-30 hashtags (mix broad + niche). Clear CTA. Moderate emoji use.`,
      tiktok: `Create a TikTok ${contentType}. Caption: 50-150 words, punchy. 3-5 hashtags. Hook in first 2 seconds. Casual authentic tone.`,
    };

    const systemPrompt = `You are an expert social media marketer. Generate a single ${platform} ${contentType} for the app below.

${platformGuidelines[platform] || platformGuidelines.instagram}

Return valid JSON:
{
  "caption": "full caption text",
  "hashtags": ["tag1", "tag2"],
  "media_concept": "what image/video to create"
}`;

    const userContent = `APP: ${config.app_name || scraped.name || 'Unknown'}
ONE-LINER: ${config.one_liner || scraped.subtitle || ''}
CATEGORY: ${config.category || scraped.category || ''}
TARGET AUDIENCE: ${config.target_audience || ''}
URL: ${config.app_url || scraped.url || ''}
${topic ? `ANGLE: ${topic}` : 'Choose an engaging angle.'}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResp.ok) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const geminiData = await geminiResp.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let generated: { caption: string; hashtags: string[]; media_concept?: string };
    try {
      generated = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return NextResponse.json({ error: 'Invalid AI JSON' }, { status: 502 });
      generated = JSON.parse(match[0]);
    }

    // Internal base URL — use localhost to avoid HTTPS SSL errors on Railway
    const internalBase = `http://localhost:${process.env.PORT || 3000}`;
    const publicBase = `https://${process.env.RAILWAY_PUBLIC_DOMAIN || request.nextUrl.host}`;

    // Step 2: Generate a social image (stored on persistent volume)
    let image: { filename?: string; publicUrl?: string; fullPublicUrl?: string } | null = null;
    try {
      const imgPlatform = platform === 'tiktok' ? 'instagram-story' : 'instagram-post';
      const imgRes = await fetch(`${internalBase}/api/generate-post-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.API_KEY || '',
        },
        body: JSON.stringify({
          planId,
          platform: imgPlatform,
          caption: generated.caption,
          publicBase,
        }),
      });
      if (imgRes.ok) {
        image = await imgRes.json();
      }
    } catch {
      image = null;
    }

    // Step 3: Post to Buffer via our dedicated endpoint (which calls Zapier MCP)
    const bufferRes = await fetch(`${internalBase}/api/post-to-buffer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY || '',
      },
      body: JSON.stringify({
        planId,
        platform,
        caption: generated.caption,
        hashtags: generated.hashtags || [],
        publishNow,
        imageFilename: image?.filename,
      }),
    });

    const bufferJson = await bufferRes.json();

    return NextResponse.json({
      success: bufferRes.ok && bufferJson?.success,
      platform,
      publishNow,
      generated: {
        caption: generated.caption,
        hashtags: generated.hashtags,
        media_concept: generated.media_concept,
      },
      image,
      buffer: bufferJson,
    });
  } catch (err) {
    console.error('auto-publish error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/brand-voice/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const systemPrompt = `You are a brand strategist and copy chief trained in David Ogilvy's research-first methods.

Your job: extract the TRUE voice of this specific product from evidence in the input — the scraped app description, feature lists, existing marketing copy, and the marketing plan. Do NOT invent or project; distil what is already there.

Ogilvy's method: immerse yourself in the product facts, understand the customer, then articulate the voice that already exists in the copy and positioning — just make it conscious and usable.

Output MUST be valid JSON matching this exact shape:
{
  "voiceSummary": "2-3 sentences describing this product's unique voice",
  "personalityTraits": [
    { "trait": "trait name", "description": "what it means for THIS product", "example": "an example sentence in this voice" }
  ],
  "vocabularyGuide": {
    "wordsToUse": ["word1", "word2"],
    "wordsToAvoid": ["word1", "word2"],
    "phrasesToUse": ["phrase1"],
    "phrasesToAvoid": ["phrase1"]
  },
  "toneSpectrum": {
    "formal": 0,
    "playful": 0,
    "technical": 0,
    "emotional": 0
  }
}

Constraints:
- voiceSummary: 2-3 sentences, specific to THIS product.
- personalityTraits: 5-8 traits. Each example must sound like THIS product's copy.
- vocabularyGuide: 8-15 items per list where the evidence supports it.
- toneSpectrum: integers 0-10.
- Do NOT output generic traits ("friendly", "professional") without concrete product-specific meaning.
- Do NOT fabricate product facts not present in the inputs.`;

    const userContent = `APP CONTEXT:\n${JSON.stringify(appContext)}\n\nSCRAPED INFO:\n${JSON.stringify(scraped)}\n\nPLAN STAGES:\n${JSON.stringify(stages)}\n\nFULL PLAN:\n${row.generated}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      const cleaned = text.replace(/^\`\`\`(?:json)?\s*\n?/i, '').replace(/\n?\`\`\`\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {
          return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
        }
      } else {
        return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
      }
    }

    // Persist to plan
    saveContent(planId, 'brand-voice', null, JSON.stringify(parsed));

    // Persist the generated brand voice
    updatePlanContent(planId, 'brandVoice', parsed);

    return NextResponse.json({ brandVoice: parsed, metadata: { model: 'gemini-2.5-flash' } });
  } catch (err) {
    console.error('brand-voice error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/caption-to-image-brief/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

type CandidatePart = { text?: unknown };

/**
 * POST /api/caption-to-image-brief
 * Body: { caption: string, platform?: "instagram"|"tiktok" }
 * Returns: {
 *   hook: string;
 *   scene: string;
 *   subject: string;
 *   mood: string;
 *   palette: string;
 *   composition: string;
 *   avoid: string[];
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      caption?: string;
      platform?: string;
    };

    const caption = typeof body.caption === 'string' ? body.caption.trim() : '';
    const platform = typeof body.platform === 'string' ? body.platform.trim() : 'instagram';

    if (!caption) {
      return NextResponse.json({ error: 'Missing caption' }, { status: 400 });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const system =
      'You are a senior creative director. Given a social post caption, extract ONE dominant visual hook and produce a concise image brief as JSON only. ' +
      'Return ONLY valid JSON with exactly this schema: {"hook":"...","scene":"...","subject":"...","mood":"...","palette":"...","composition":"...","avoid":["...",...]}. ' +
      'Rules: pick ONE hook (not multiple), no marketing fluff, keep each field under 12 words, avoid text in image, avoid UI/screenshots/logos/watermarks.';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [
          {
            parts: [
              {
                text: `Platform: ${platform}\n\nCaption:\n${caption}\n\nReturn JSON only.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('caption-to-image-brief Gemini error:', res.status, text);
      return NextResponse.json({ error: 'Failed to generate image brief' }, { status: 502 });
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts as CandidatePart[] | undefined;
    const text = Array.isArray(parts)
      ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('\n').trim()
      : '';

    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let parsed: Record<string, unknown> | null = null;
    try {
      const maybe = JSON.parse(text) as unknown;
      parsed = maybe && typeof maybe === 'object' ? (maybe as Record<string, unknown>) : null;
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const maybe = JSON.parse(match[0]) as unknown;
        parsed = maybe && typeof maybe === 'object' ? (maybe as Record<string, unknown>) : null;
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
    }

    const brief = {
      hook: typeof parsed.hook === 'string' ? parsed.hook.trim() : '',
      scene: typeof parsed.scene === 'string' ? parsed.scene.trim() : '',
      subject: typeof parsed.subject === 'string' ? parsed.subject.trim() : '',
      mood: typeof parsed.mood === 'string' ? parsed.mood.trim() : '',
      palette: typeof parsed.palette === 'string' ? parsed.palette.trim() : '',
      composition: typeof parsed.composition === 'string' ? parsed.composition.trim() : '',
      avoid: Array.isArray(parsed.avoid)
        ? parsed.avoid.filter((x: unknown): x is string => typeof x === 'string').map((s: string) => s.trim())
        : ['text', 'logos', 'UI', 'watermarks'],
    };

    if (!brief.hook) {
      return NextResponse.json({ error: 'AI response missing hook' }, { status: 502 });
    }

    return NextResponse.json(brief);
  } catch (err) {
    console.error('caption-to-image-brief error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/caption-to-veo-prompt/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

type CandidatePart = { text?: unknown };

/**
 * POST /api/caption-to-veo-prompt
 * Body: { caption: string }
 * Returns: { prompt: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { caption?: string };
    const caption = typeof body.caption === 'string' ? body.caption.trim() : '';

    if (!caption) {
      return NextResponse.json({ error: 'Missing caption' }, { status: 400 });
    }

    const apiKey = getApiKey();

    const system =
      'You are an expert at writing Veo 2 video generation prompts. Given a social media post caption, write a single cinematic video prompt. Rules: one focused scene, specify shot type (close-up/wide/medium), specify camera movement (dolly in/pan/crane), specify lighting and mood, under 100 words, no quotation marks. Return ONLY valid JSON with exactly this schema: {"prompt":"..."}.';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [
          {
            parts: [
              {
                text: `Caption:\n${caption}\n\nReturn JSON only with schema: {\"prompt\": \"...\"}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('caption-to-veo-prompt Gemini error:', res.status, text);
      return NextResponse.json({ error: 'Failed to generate Veo prompt' }, { status: 502 });
    }

    const data = await res.json();

    const parts = data?.candidates?.[0]?.content?.parts as CandidatePart[] | undefined;
    const text = Array.isArray(parts)
      ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('\n').trim()
      : '';

    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    // We ask for JSON, but models sometimes return plain text or slightly different keys.
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = null;
        }
      }
    }

    const obj = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : null;
    const videoPrompt = obj?.videoPrompt;
    const veoPrompt = obj?.veoPrompt;
    const promptCandidate =
      (obj && typeof obj.prompt === 'string' && obj.prompt) ||
      (typeof videoPrompt === 'string' && videoPrompt) ||
      (typeof veoPrompt === 'string' && veoPrompt) ||
      (typeof parsed === 'string' ? parsed : '') ||
      '';

    // Final fallback: if the model ignored JSON but returned a short prompt, accept it.
    const prompt = (promptCandidate || text).trim();
    if (!prompt) {
      return NextResponse.json({ error: 'AI response missing prompt' }, { status: 502 });
    }

    return NextResponse.json({ prompt });
  } catch (err) {
    console.error('caption-to-veo-prompt error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/competitive-analysis/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

type PlanConfig = {
  app_name?: string;
  one_liner?: string;
  category?: string;
  target_audience?: string;
  pricing?: string;
  differentiators?: string;
  competitors?: string;
  distribution_channels?: string;
  app_url?: string;
  app_type?: string;
};

async function fetchCompetitorsViaPerplexity(params: {
  url?: string;
  category?: string;
  appName?: string;
  description?: string;
}): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const prompt = `Find 5-8 direct competitors for this product.

Product:
- Name: ${params.appName || 'Unknown'}
- URL: ${params.url || 'Unknown'}
- Category: ${params.category || 'Unknown'}
- Description: ${params.description || 'N/A'}

Return: competitor name, homepage URL, positioning/tagline, and pricing model for each.
Prefer JSON array: [{"name":"...","url":"...","positioning":"...","pricing":"..."}]`;

  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a meticulous market researcher. Prefer primary sources and current competitor homepages.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Perplexity error (${resp.status}): ${errText.slice(0, 500)}`);
  }

  const data = (await resp.json()) as PerplexityResponse;
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Unexpected Perplexity response shape');
  }
  return content;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const inputUrl = typeof body.url === 'string' ? body.url : '';
    const inputCategory = typeof body.category === 'string' ? body.category : '';

    if (!planId && !inputUrl) {
      return NextResponse.json({ error: 'Provide either "planId" or "url"' }, { status: 400 });
    }

    let appName: string | undefined;
    let url: string | undefined = inputUrl || undefined;
    let category: string | undefined = inputCategory || undefined;
    let scraped: Record<string, unknown> = {};
    let stages: Record<string, unknown> = {};
    let generated = '';
    let config: PlanConfig = {};

    if (planId) {
      const row = getPlan(planId);
      if (!row) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      config = JSON.parse(row.config || '{}') as PlanConfig;
      scraped = JSON.parse(row.scraped || '{}') as Record<string, unknown>;
      stages = JSON.parse(row.stages || '{}') as Record<string, unknown>;
      generated = row.generated;
      appName = config.app_name;
      url = url || config.app_url;
      category = category || config.category;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    // Step 1: Perplexity competitor discovery (best-effort)
    let competitorResearch = '';
    let perplexityUsed = false;
    try {
      const desc =
        (typeof scraped.description === 'string' ? scraped.description : '') ||
        (typeof scraped.appDescription === 'string' ? scraped.appDescription : '') ||
        (generated ? generated.slice(0, 800) : '');
      competitorResearch = await fetchCompetitorsViaPerplexity({ url, category, appName, description: desc || undefined });
      perplexityUsed = true;
    } catch (e) {
      console.warn('Perplexity failed, falling back to Gemini-only:', e);
    }

    // Step 2: Gemini structures the analysis
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

    const appContext = {
      app_name: config.app_name,
      one_liner: config.one_liner,
      category: config.category,
      target_audience: config.target_audience,
      pricing: config.pricing,
      differentiators: config.differentiators,
      competitors: config.competitors,
      distribution_channels: config.distribution_channels,
      app_url: config.app_url,
      app_type: config.app_type,
    };

    const systemPrompt = `You are a sharp competitive intelligence analyst.

Build a competitive analysis for the given product.
Use the competitor research input if present. If absent, infer reasonable competitors from category and description — but do NOT invent precise pricing unless confident.

Output MUST be valid JSON matching this exact shape:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "url": "their URL",
      "positioning": "how they position themselves",
      "pricing": "their pricing model",
      "strengths": ["strength1"],
      "weaknesses": ["weakness1"],
      "keyMessaging": ["headline or tagline"]
    }
  ],
  "gaps": ["positioning gap 1"],
  "opportunities": ["opportunity 1"],
  "keywordGaps": ["keyword they miss"]
}

Constraints:
- 4-8 competitors.
- 3-6 items per strengths/weaknesses/keyMessaging.
- 4-10 items for gaps/opportunities/keywordGaps.
- Keep it specific and actionable for marketing.`;

    const userContent = `PRODUCT URL: ${url || 'N/A'}\nCATEGORY: ${category || 'N/A'}\n\nAPP CONTEXT:\n${JSON.stringify(appContext)}\n\nSCRAPED INFO:\n${JSON.stringify(scraped)}\n\nPLAN STAGES:\n${JSON.stringify(stages)}\n\nFULL PLAN:\n${generated}\n\nCOMPETITOR RESEARCH (Perplexity):\n${competitorResearch || '(none — use your own knowledge)'}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      const cleaned = text.replace(/^\`\`\`(?:json)?\s*\n?/i, '').replace(/\n?\`\`\`\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {
          return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
        }
      } else {
        return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
      }
    }

    if (planId) {
      saveContent(planId, 'competitive-analysis', null, JSON.stringify(parsed));
    }

    return NextResponse.json({ competitive: parsed, metadata: { model: 'gemini-2.5-flash', perplexityUsed } });
  } catch (err) {
    console.error('competitive-analysis error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/competitive-intel/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, getContent } from '@/lib/db';

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

type PlanConfig = {
  app_name?: string;
  one_liner?: string;
  category?: string;
};

export type CompetitorIntel = {
  name: string;
  oneLiner: string;
  strengths: string[];
  weaknesses: string[];
  pricing: string;
};

export type CompetitiveIntelResult = {
  competitors: CompetitorIntel[];
  opportunities: string[];
  marketGaps: string[];
};

function safeJsonParse(input: string): unknown {
  const cleaned = input
    .replace(/^\`\`\`(?:json)?\s*\n?/i, '')
    .replace(/\n?\`\`\`\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Model returned invalid JSON');
  }
}

async function fetchCompetitiveIntel(params: {
  appName: string;
  category: string;
  oneLiner: string;
}): Promise<CompetitiveIntelResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const systemPrompt =
    'You are a meticulous competitive intelligence analyst. Prefer well-known, direct competitors. Be specific and concise. Output valid JSON only.';

  const userPrompt = `Perform competitive intelligence research for this product.

Product:
- Name: ${params.appName}
- Category: ${params.category}
- One-liner: ${params.oneLiner}

Return ONLY a JSON object matching this exact shape:
{
  "competitors": [
    {
      "name": "Competitor name",
      "oneLiner": "1-2 sentence description",
      "strengths": ["...", "..."],
      "weaknesses": ["...", "..."],
      "pricing": "Their pricing model (e.g., free, freemium, subscription tiers)"
    }
  ],
  "opportunities": ["Market positioning opportunity 1", "..."],
  "marketGaps": ["Underserved need or gap 1", "..."]
}

Constraints:
- competitors: exactly 5 items
- strengths: 3-6 items per competitor
- weaknesses: 3-6 items per competitor
- opportunities: 3-5 items — specific ways this product could differentiate or position itself
- marketGaps: 3-5 items — underserved needs, missing features, or segments competitors ignore
- Keep pricing high-level if exact numbers are uncertain.
- Do not include markdown, citations, or extra keys.`;

  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Perplexity error (${resp.status}): ${errText.slice(0, 500)}`);
  }

  const data = (await resp.json()) as PerplexityResponse;
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Unexpected Perplexity response shape');
  }

  const parsed = safeJsonParse(content) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.competitors)) {
    throw new Error('Model returned invalid JSON shape (expected object with competitors array)');
  }

  const competitors: CompetitorIntel[] = (parsed.competitors as unknown[])
    .filter((c) => c && typeof c === 'object')
    .map((c) => {
      const obj = c as Record<string, unknown>;
      return {
        name: typeof obj.name === 'string' ? obj.name : '',
        oneLiner: typeof obj.oneLiner === 'string' ? obj.oneLiner : (typeof obj.description === 'string' ? obj.description : ''),
        strengths: Array.isArray(obj.strengths)
          ? obj.strengths.filter((s): s is string => typeof s === 'string')
          : [],
        weaknesses: Array.isArray(obj.weaknesses)
          ? obj.weaknesses.filter((s): s is string => typeof s === 'string')
          : [],
        pricing: typeof obj.pricing === 'string' ? obj.pricing : '',
      };
    })
    .filter((c) => c.name && c.oneLiner);

  if (competitors.length === 0) {
    throw new Error('Model returned empty competitors');
  }

  const opportunities = Array.isArray(parsed.opportunities)
    ? (parsed.opportunities as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  const marketGaps = Array.isArray(parsed.marketGaps)
    ? (parsed.marketGaps as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  return {
    competitors: competitors.slice(0, 5),
    opportunities,
    marketGaps,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      planId?: unknown;
      appName?: unknown;
      category?: unknown;
      oneLiner?: unknown;
    };
    const planId = typeof body.planId === 'string' ? body.planId : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}') as PlanConfig;

    // Accept from body or fall back to plan config
    const appName = (typeof body.appName === 'string' && body.appName) || config.app_name || '';
    const category = (typeof body.category === 'string' && body.category) || config.category || '';
    const oneLiner = (typeof body.oneLiner === 'string' && body.oneLiner) || config.one_liner || '';

    if (!appName || !category || !oneLiner) {
      return NextResponse.json(
        { error: 'Plan is missing required fields (app_name, category, one_liner)' },
        { status: 400 }
      );
    }

    const result = await fetchCompetitiveIntel({ appName, category, oneLiner });

    saveContent(planId, 'competitive-intel', null, JSON.stringify(result));

    return NextResponse.json({
      ...result,
      metadata: {
        provider: 'perplexity',
        model: 'sonar',
      },
    });
  } catch (err) {
    console.error('competitive-intel error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const planId = request.nextUrl.searchParams.get('planId') || '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getContent(planId, 'competitive-intel');
    if (!row) {
      return NextResponse.json({ competitors: [], opportunities: [], marketGaps: [] });
    }

    const parsed = typeof row === 'string' ? JSON.parse(row) : row;
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('competitive-intel GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/composite-batch/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';
import { getPlan } from '@/lib/db';
import { buildCompositeHtml, type CompositeDevice } from '@/lib/screenshot-compositor';

interface BatchInput {
  planId: string;
  screenshots: Array<{
    imageUrl?: string;
    imageBase64?: string;
    headline: string;
    subheadline?: string;
    badge?: string;
  }>;
  device?: CompositeDevice;
  backgroundColor?: string;
  textColor?: string;
}

let active = 0;

export async function POST(request: NextRequest) {
  if (active >= 1) {
    return NextResponse.json({ error: 'A ZIP render is already in progress.' }, { status: 429 });
  }
  active++;
  try {
    const body = (await request.json()) as BatchInput;
    const { planId, screenshots, device, backgroundColor, textColor } = body;

    if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    if (!screenshots?.length) return NextResponse.json({ error: 'screenshots array is required' }, { status: 400 });
    if (screenshots.length > 10) return NextResponse.json({ error: 'Max 10 screenshots' }, { status: 400 });

    const row = getPlan(planId);
    if (!row) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    const config = JSON.parse(row.config) as { app_name?: string };
    const appName = config.app_name || '';

    let chromium;
    try {
      const pw = await import('playwright');
      chromium = pw.chromium;
    } catch {
      return NextResponse.json({ error: 'Playwright is not installed.' }, { status: 500 });
    }

    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    try {
      const pngs: { name: string; buf: Buffer }[] = [];

      for (let i = 0; i < screenshots.length; i++) {
        const s = screenshots[i];
        const { html, width, height } = buildCompositeHtml({
          ...s,
          device,
          backgroundColor,
          textColor,
          appName,
        });

        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        await page.setContent(html, { waitUntil: 'networkidle', timeout: 20000 });
        const shot = await page.screenshot({ type: 'png', timeout: 20000 });
        await ctx.close();
        pngs.push({ name: `screenshot-${String(i + 1).padStart(2, '0')}.png`, buf: Buffer.from(shot) });
      }

      const pt = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 6 } });
      const chunks: Buffer[] = [];
      pt.on('data', (c: Buffer) => chunks.push(c));
      const done = new Promise<Buffer>((res, rej) => {
        pt.on('end', () => res(Buffer.concat(chunks)));
        pt.on('error', rej);
        archive.on('error', rej);
      });
      archive.pipe(pt);
      for (const { name, buf } of pngs) archive.append(Readable.from(buf), { name });
      await archive.finalize();
      const zip = await done;

      const slug = (appName || 'screenshots').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'screenshots';
      return new NextResponse(new Uint8Array(zip), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${slug}-composited.zip"`,
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to composite batch';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    active--;
  }
}

```

# app/api/composite-screenshot/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { buildCompositeHtml, type CompositeScreenshotInput } from '@/lib/screenshot-compositor';

let activeRenders = 0;
const MAX_CONCURRENT = 3;

export async function POST(request: NextRequest) {
  if (activeRenders >= MAX_CONCURRENT) {
    return NextResponse.json({ error: 'Too many concurrent renders. Please try again shortly.' }, { status: 429 });
  }
  activeRenders++;
  try {
    const body = (await request.json()) as CompositeScreenshotInput;
    const { html, width, height } = buildCompositeHtml(body);

    let chromium;
    try {
      const pw = await import('playwright');
      chromium = pw.chromium;
    } catch {
      return NextResponse.json({ error: 'Playwright is not installed.' }, { status: 500 });
    }

    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    try {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 20000 });
      const png = await page.screenshot({ type: 'png', timeout: 20000 });
      await ctx.close();
      return new NextResponse(new Uint8Array(png), {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'attachment; filename="composited-screenshot.png"',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to composite screenshot';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    activeRenders--;
  }
}

```

# app/api/content-calendar/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';

export type CalendarContentType = 'post' | 'reel' | 'story' | 'thread' | 'article';

export interface CalendarPost {
  date: string; // YYYY-MM-DD
  platform: string;
  content_type: CalendarContentType;
  title: string;
  draft_copy: string;
  hashtags: string[];
  suggested_time: string; // e.g. "09:30" or "9:30am"
  media_notes: string;
}

interface ContentCalendarRequest {
  planId: string;
  platforms: string[];
  weeks: number;
}

function cleanAndParseJson(text: string): unknown {
  let cleaned = text
    .replace(/^\`\`\`(?:json)?\s*\n?/i, '')
    .replace(/\n?\`\`\`\s*$/i, '')
    .trim();

  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    cleaned = '{' + cleaned + '}';
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error('No JSON found');
    return JSON.parse(objMatch[0]);
  }
}

function isCalendarPost(x: unknown): x is CalendarPost {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.date === 'string' &&
    typeof o.platform === 'string' &&
    typeof o.content_type === 'string' &&
    typeof o.title === 'string' &&
    typeof o.draft_copy === 'string' &&
    Array.isArray(o.hashtags) &&
    typeof o.suggested_time === 'string' &&
    typeof o.media_notes === 'string'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ContentCalendarRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const platformsRaw = Array.isArray(body.platforms) ? body.platforms : [];
    const platforms = platformsRaw
      .filter((p): p is string => typeof p === 'string')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "platforms"' },
        { status: 400 }
      );
    }

    const weeksRaw = typeof body.weeks === 'number' ? body.weeks : 0;
    const weeks = Number.isFinite(weeksRaw)
      ? Math.max(1, Math.min(4, Math.round(weeksRaw)))
      : 2;

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    const systemPrompt = `You are a senior social media strategist and content marketer.

Create a ${weeks}-week posting calendar starting next Monday (relative to the user's locale). Use the given marketing plan.

Rules:
- Output MUST be valid JSON only (no markdown, no commentary).
- Return an ARRAY of scheduled posts.
- Each item MUST have this exact shape:
  {
    "date": "YYYY-MM-DD",
    "platform": string,
    "content_type": "post"|"reel"|"story"|"thread"|"article",
    "title": string,
    "draft_copy": string,
    "hashtags": string[],
    "suggested_time": string,
    "media_notes": string
  }
- Use only these platforms: ${platforms.map((p) => JSON.stringify(p)).join(', ')}
- Ensure dates are within the requested ${weeks} weeks window.
- Make the calendar realistic: 3-6 posts/week total across platforms, vary content types.
- Draft copy should be platform-appropriate and grounded in the app's differentiators.
- Hashtags: 3-12 relevant hashtags per item (no duplicates).
- suggested_time should be a local-time suggestion like "09:00" or "6:30pm".
- Avoid unverifiable claims (no #1, guaranteed).`;

    const userContent = `TODAY: ${todayIso}

APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}\n\nREQUEST:\nplatforms=${platforms.join(', ')}\nweeks=${weeks}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error(
        'Unexpected Gemini response shape:',
        JSON.stringify(data).slice(0, 500)
      );
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = cleanAndParseJson(text);
    } catch {
      console.error('Failed to parse Gemini JSON:', text.slice(0, 500));
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const usage = data?.usageMetadata;
    const tokens =
      typeof usage?.totalTokenCount === 'number'
        ? usage.totalTokenCount
        : typeof usage?.promptTokenCount === 'number' &&
            typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null;

    // Accept either an array directly, or { calendar: [...] }
    let calendarRaw: unknown = parsed;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const maybe = (parsed as Record<string, unknown>).calendar;
      if (maybe) calendarRaw = maybe;
    }

    const calendar: CalendarPost[] = Array.isArray(calendarRaw)
      ? calendarRaw.filter(isCalendarPost)
      : [];

    if (calendar.length === 0) {
      return NextResponse.json(
        { error: 'Model did not return a calendar. Please try again.' },
        { status: 502 }
      );
    }

    // Persist to plan_content
    saveContent(planId, 'calendar', null, JSON.stringify(calendar));

    return NextResponse.json({
      calendar,
      metadata: {
        model: 'gemini-2.0-flash',
        tokens,
        platforms,
        weeks,
      },
    });
  } catch (err) {
    console.error('content-calendar error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/content-schedule/[id]/performance/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { updateSchedulePerformance } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { rating, notes, metrics } = body;

    const validRatings = ['great', 'good', 'ok', 'poor', null];
    if (rating !== undefined && !validRatings.includes(rating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    updateSchedulePerformance(
      id,
      rating ?? null,
      notes ?? null,
      metrics ? JSON.stringify(metrics) : null
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('performance PUT error:', err);
    return NextResponse.json({ error: 'Failed to update performance' }, { status: 500 });
  }
}

```

# app/api/content-schedule/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const planId = url.searchParams.get('planId');
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const db = getDb();
    let query = 'SELECT * FROM content_schedule WHERE 1=1';
    const params: unknown[] = [];

    if (planId) { query += ' AND plan_id = ?'; params.push(planId); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (from) { query += ' AND scheduled_at >= ?'; params.push(from); }
    if (to) { query += ' AND scheduled_at <= ?'; params.push(to); }

    query += ' ORDER BY scheduled_at ASC';

    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ schedules: rows });
  } catch (err) {
    console.error('content-schedule GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, platform, contentType, topic, scheduledAt } = body;

    if (!planId || !scheduledAt) {
      return NextResponse.json({ error: 'Missing planId or scheduledAt' }, { status: 400 });
    }

    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO content_schedule (id, plan_id, platform, content_type, topic, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, planId, platform || 'instagram', contentType || 'post', topic || null, scheduledAt);

    const row = db.prepare('SELECT * FROM content_schedule WHERE id = ?').get(id);
    return NextResponse.json({ schedule: row }, { status: 201 });
  } catch (err) {
    console.error('content-schedule POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, topic, scheduledAt, platform, contentType, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM content_schedule WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE content_schedule SET
        topic = ?, scheduled_at = ?, platform = ?, content_type = ?, status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      topic ?? existing.topic,
      scheduledAt ?? existing.scheduled_at,
      platform ?? existing.platform,
      contentType ?? existing.content_type,
      status ?? existing.status,
      id
    );

    const row = db.prepare('SELECT * FROM content_schedule WHERE id = ?').get(id);
    return NextResponse.json({ schedule: row });
  } catch (err) {
    console.error('content-schedule PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare("UPDATE content_schedule SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND status = 'scheduled'").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Not found or not cancellable' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('content-schedule DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/download-video/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

// Proxy Veo 2 video downloads — the raw URI requires an API key header
// which browsers can't send via a plain <a href> link.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uri = searchParams.get('uri');

  if (!uri) {
    return NextResponse.json({ error: 'Missing uri parameter' }, { status: 400 });
  }

  // Only allow Veo / Google AI file downloads
  if (!uri.startsWith('https://generativelanguage.googleapis.com/')) {
    return NextResponse.json({ error: 'Invalid URI' }, { status: 400 });
  }

  // Ensure alt=media is present
  const downloadUrl = uri.includes('alt=media') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}alt=media`;

  try {
    const response = await fetch(downloadUrl, {
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch video', detail: text.slice(0, 500) },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const videoBuffer = await response.arrayBuffer();

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment; filename="promo-video.mp4"',
        'Content-Length': String(videoBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error('download-video error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/enhance-copy/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

interface EnhanceRequest {
  text: string;
  tone: Tone;
  context: string;
}

const VALID_TONES: Tone[] = ['professional', 'casual', 'bold', 'minimal'];

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  professional:
    'Polished, credible, authoritative. Use clear language, benefits-focused, confident but not over-the-top.',
  casual:
    'Friendly, conversational, approachable. Write like a knowledgeable friend recommending something. Contractions OK, light humour OK.',
  bold:
    'Punchy, high-energy, attention-grabbing. Short sentences. Strong verbs. No filler. Make every word hit. Think Nike/Apple ad copy.',
  minimal:
    'Ultra-concise. Strip to essentials. Maximum impact, minimum words. No fluff, no adjectives unless they earn their place. Haiku-like brevity.',
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<EnhanceRequest>;

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "text" field' },
        { status: 400 }
      );
    }

    const tone: Tone = body.tone && VALID_TONES.includes(body.tone) ? body.tone : 'professional';
    const context = typeof body.context === 'string' ? body.context : '';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const toneGuide = TONE_DESCRIPTIONS[tone];
    const systemPrompt = `You are an expert marketing copywriter. Rewrite the following marketing copy to match this tone:

TONE: ${tone}
GUIDE: ${toneGuide}

${context ? `APP CONTEXT: ${context}` : ''}

Rules:
- Return ONLY the improved copy, nothing else.
- No quotes around the output.
- Keep the core message but transform the voice.
- Each tone should feel distinctly different from the others.`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: body.text }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();

    const enhanced =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!enhanced || typeof enhanced !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ enhanced: enhanced.trim() });
  } catch (err) {
    console.error('enhance-copy error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

```

# app/api/export-bundle/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';
import { getPlan, getContent, saveContent } from '@/lib/db';
import { generateAssets } from '@/lib/asset-generator';
import type { AppConfig, AssetConfig } from '@/lib/types';
import { guardApiRoute } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';
// Generous timeout: this endpoint can make multiple Gemini calls + render PNGs
export const maxDuration = 300;

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

interface ExportBundleRequest {
  planId: string;
  tones?: string[];
  languages?: string[];
  includeAssets?: boolean;
}

const VALID_TONES: Tone[] = ['professional', 'casual', 'bold', 'minimal'];
const SUPPORTED_LANGUAGES = [
  'es',
  'fr',
  'de',
  'ja',
  'ko',
  'pt-BR',
  'it',
  'zh-Hans',
  'nl',
  'ar',
] as const;

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

type DraftSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'feature_bullets';

type TranslationSection = 'app_store_description' | 'short_description' | 'keywords';

function safeFilenamePart(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function parseGeminiJson(text: string): unknown {
  // Strip markdown code fences if present
  let cleaned = text
    .replace(/^\`\`\`(?:json)?\s*\n?/i, '')
    .replace(/\n?\`\`\`\s*$/i, '')
    .trim();

  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    cleaned = '{' + cleaned + '}';
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Model returned invalid JSON');
    return JSON.parse(jsonMatch[0]);
  }
}

function draftSectionLabel(section: DraftSection): string {
  switch (section) {
    case 'app_store_description':
      return 'App Store description';
    case 'short_description':
      return 'Short description';
    case 'keywords':
      return 'Keywords';
    case 'feature_bullets':
      return 'Feature bullets';
  }
}

function translationSectionLabel(section: TranslationSection): string {
  switch (section) {
    case 'app_store_description':
      return 'App Store description';
    case 'short_description':
      return 'Short description';
    case 'keywords':
      return 'Keywords';
  }
}

function languageLabel(code: string): string {
  switch (code) {
    case 'es':
      return 'Spanish (es)';
    case 'fr':
      return 'French (fr)';
    case 'de':
      return 'German (de)';
    case 'ja':
      return 'Japanese (ja)';
    case 'ko':
      return 'Korean (ko)';
    case 'pt-BR':
      return 'Portuguese (Brazil) (pt-BR)';
    case 'it':
      return 'Italian (it)';
    case 'zh-Hans':
      return 'Chinese (Simplified) (zh-Hans)';
    case 'nl':
      return 'Dutch (nl)';
    case 'ar':
      return 'Arabic (ar)';
    default:
      return code;
  }
}

async function geminiGenerateJson({
  apiKey,
  systemPrompt,
  userContent,
  temperature,
}: {
  apiKey: string;
  systemPrompt: string;
  userContent: string;
  temperature: number;
}): Promise<{ parsed: unknown; rawText: string; usageTokens: number | null }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText.slice(0, 500)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Unexpected Gemini response shape');
  }

  const parsed = parseGeminiJson(text);

  const usage = data?.usageMetadata;
  const tokens =
    typeof usage?.totalTokenCount === 'number'
      ? usage.totalTokenCount
      : typeof usage?.promptTokenCount === 'number' &&
          typeof usage?.candidatesTokenCount === 'number'
        ? usage.promptTokenCount + usage.candidatesTokenCount
        : null;

  return { parsed, rawText: text, usageTokens: tokens };
}

async function generateDraftForTone({
  apiKey,
  planRow,
  tone,
  sections,
}: {
  apiKey: string;
  planRow: { config: string; scraped: string; stages: string; generated: string };
  tone: Tone;
  sections: DraftSection[];
}): Promise<Record<string, string>> {
  const config = JSON.parse(planRow.config || '{}');
  const scraped = JSON.parse(planRow.scraped || '{}');
  const stages = JSON.parse(planRow.stages || '{}');

  const appContext = {
    app_name: config?.app_name,
    one_liner: config?.one_liner,
    category: config?.category,
    target_audience: config?.target_audience,
    pricing: config?.pricing,
    differentiators: config?.differentiators,
    competitors: config?.competitors,
    distribution_channels: config?.distribution_channels,
    app_url: config?.app_url,
    app_type: config?.app_type,
  };

  const systemPrompt = `You are an expert app store copywriter.

Write a complete first-draft of app listing copy based on the provided app marketing plan.
Tone: ${tone}.

Output MUST be valid JSON only (no markdown, no commentary). The JSON must be an object where each key is one of the requested sections, and the value is a string.

Sections requested:
${sections.map((s) => `- ${s}: ${draftSectionLabel(s)}`).join('\n')}

Writing requirements by section:
- app_store_description: 800-2000 characters. Use short paragraphs, benefits-first, include a light CTA.
- short_description: 60-80 characters (store-friendly). No quotes.
- keywords: comma-separated keywords (15-30), no hashtags.
- feature_bullets: 5-8 bullets, each max ~12 words.

Use the app's differentiators and audience. Avoid making unverifiable claims (e.g., "#1", "guaranteed").`;

  const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${planRow.generated}`;

  const { parsed } = await geminiGenerateJson({
    apiKey,
    systemPrompt,
    userContent,
    temperature: 0.7,
  });

  const out: Record<string, string> = {};
  if (parsed && typeof parsed === 'object') {
    for (const s of sections) {
      const val = (parsed as Record<string, unknown>)[s];
      if (typeof val === 'string' && val.trim().length > 0) {
        out[s] = val.trim();
      }
    }
  }

  if (Object.keys(out).length === 0) {
    throw new Error('Model did not return requested draft sections');
  }

  return out;
}

async function generateTranslations({
  apiKey,
  planRow,
  targetLanguages,
  sections,
}: {
  apiKey: string;
  planRow: { config: string; scraped: string; stages: string; generated: string };
  targetLanguages: SupportedLanguage[];
  sections: TranslationSection[];
}): Promise<Record<string, Record<string, string>>> {
  const config = JSON.parse(planRow.config || '{}');
  const scraped = JSON.parse(planRow.scraped || '{}');
  const stages = JSON.parse(planRow.stages || '{}');

  const appContext = {
    app_name: config?.app_name,
    one_liner: config?.one_liner,
    category: config?.category,
    target_audience: config?.target_audience,
    pricing: config?.pricing,
    differentiators: config?.differentiators,
    competitors: config?.competitors,
    distribution_channels: config?.distribution_channels,
    app_url: config?.app_url,
    app_type: config?.app_type,
  };

  const systemPrompt = `You are an expert app store localisation copywriter.

Task:
- Produce LOCALISED app store copy (not literal translation) for the requested languages.
- Adapt idioms, cultural references, and app store conventions for each locale.
- Keep meaning consistent with the product, but make it feel native.

Output rules:
- Output MUST be valid JSON only (no markdown, no commentary).
- The JSON MUST be an object with a top-level key "translations".
- translations[language_code][section] = string.
- Only include the requested languages and requested sections.

Languages requested:
${targetLanguages.map((l) => `- ${l}: ${languageLabel(l)}`).join('\n')}

Sections requested:
${sections.map((s) => `- ${s}: ${translationSectionLabel(s)}`).join('\n')}

Section requirements:
- app_store_description: 800-2000 characters (or natural equivalent length). Short paragraphs, benefits-first, light CTA.
- short_description: ~60-80 characters (store-friendly, no quotes). Localise length appropriately.
- keywords: comma-separated keywords (15-30). Use locale-appropriate search terms. No hashtags.

Quality/safety:
- Avoid unverifiable claims (e.g., "#1", "guaranteed").
- Keep brand/product names in original form.`;

  const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${planRow.generated}`;

  const { parsed } = await geminiGenerateJson({
    apiKey,
    systemPrompt,
    userContent,
    temperature: 0.6,
  });

  const translations: Record<string, Record<string, string>> = {};
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  const t = obj?.translations;
  if (t && typeof t === 'object') {
    for (const lang of targetLanguages) {
      const langObj = (t as Record<string, unknown>)[lang];
      if (!langObj || typeof langObj !== 'object') continue;
      for (const section of sections) {
        const val = (langObj as Record<string, unknown>)[section];
        if (typeof val === 'string' && val.trim().length > 0) {
          translations[lang] ||= {};
          translations[lang][section] = val.trim();
        }
      }
    }
  }

  if (Object.keys(translations).length === 0) {
    throw new Error('Model did not return requested translations');
  }

  return translations;
}

function buildDefaultAssetConfig(planConfig: Partial<AppConfig> | null | undefined): AssetConfig {
  const icon =
    typeof planConfig?.icon === 'string' &&
    planConfig.icon.trim() &&
    !/^https?:\/\//i.test(planConfig.icon)
      ? planConfig.icon.trim()
      : '🚀';

  return {
    name: planConfig?.app_name || 'Your App',
    tagline: planConfig?.one_liner || '',
    icon,
    url: planConfig?.app_url || planConfig?.repo_url || '',
    features: Array.isArray(planConfig?.differentiators)
      ? planConfig.differentiators.slice(0, 6)
      : [],
    colors: {
      background: '#0f172a',
      text: '#e2e8f0',
      primary: '#6366f1',
      secondary: '#8b5cf6',
    },
  };
}

async function renderAssetsToPngBuffers(assets: { type: string; width: number; height: number; html: string }[]) {
  let chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch {
    throw new Error(
      'Playwright is not installed. Run: npm install playwright-core && npx playwright-core install chromium'
    );
  }

  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const out: { filename: string; buffer: Buffer }[] = [];

    for (const asset of assets) {
      const context = await browser.newContext({
        viewport: { width: asset.width, height: asset.height },
      });
      const page = await context.newPage();

      await page.setContent(asset.html, { waitUntil: 'networkidle', timeout: 10000 });
      const screenshot = await page.screenshot({ type: 'png', timeout: 10000 });

      let filename = `${asset.type}.png`;
      if (asset.type === 'social-card') filename = 'twitter-card.png';

      out.push({ filename, buffer: Buffer.from(screenshot) });
      await context.close();
    }

    return out;
  } finally {
    await browser.close();
  }
}

let activeExportBundles = 0;
const MAX_CONCURRENT_EXPORTS = 1;

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/export-bundle',
    maxRequests: 4,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (activeExportBundles >= MAX_CONCURRENT_EXPORTS) {
    return NextResponse.json(
      { error: 'An export is already in progress. Please try again shortly.' },
      { status: 429 }
    );
  }

  activeExportBundles++;
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as Partial<ExportBundleRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const tones = Array.isArray(body.tones)
      ? body.tones.filter((t): t is Tone => VALID_TONES.includes(t as Tone))
      : [];

    const languages = Array.isArray(body.languages)
      ? body.languages.filter(
          (l): l is SupportedLanguage =>
            (SUPPORTED_LANGUAGES as readonly string[]).includes(l)
        )
      : [];

    const includeAssets = body.includeAssets !== false;

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey && (tones.length > 0 || languages.length > 0)) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const config = JSON.parse(row.config || '{}');

    const briefMd = typeof row.generated === 'string' ? row.generated : '';

    const exportErrors: {
      tones?: Record<string, string>;
      languages?: Record<string, string>;
      assets?: string;
    } = {};

    const copyByTone: Record<string, Record<string, string>> = {};
    const translationsByLang: Record<string, Record<string, string>> = {};

    const draftSections: DraftSection[] = [
      'app_store_description',
      'short_description',
      'keywords',
      'feature_bullets',
    ];

    const translationSections: TranslationSection[] = [
      'app_store_description',
      'short_description',
      'keywords',
    ];

    // Load previously generated content (plan_content)
    const savedDraftsRaw = getContent(planId, 'draft');
    const savedDrafts: Record<string, Record<string, string>> = {};
    type StoredContentItem = { contentKey?: unknown; content?: unknown };

    if (Array.isArray(savedDraftsRaw)) {
      for (const item of savedDraftsRaw) {
        const { contentKey, content } = item as StoredContentItem;
        const tone = contentKey;
        if (typeof tone === 'string' && content && typeof content === 'object') {
          savedDrafts[tone] = content as Record<string, string>;
        }
      }
    }

    const savedTranslationsRaw = getContent(planId, 'translations');
    const savedTranslations: Record<string, Record<string, string>> = {};
    if (Array.isArray(savedTranslationsRaw)) {
      for (const item of savedTranslationsRaw) {
        const { contentKey, content } = item as StoredContentItem;
        const lang = contentKey;
        if (typeof lang === 'string' && content && typeof content === 'object') {
          savedTranslations[lang] = content as Record<string, string>;
        }
      }
    }

    const exportTones: Tone[] = tones.length > 0 ? tones : (Object.keys(savedDrafts) as Tone[]);
    const exportLanguages: SupportedLanguage[] =
      languages.length > 0 ? languages : (Object.keys(savedTranslations) as SupportedLanguage[]);

    // 1) Drafts per tone (use saved, only regenerate missing)
    for (const tone of exportTones) {
      if (savedDrafts[tone]) {
        copyByTone[tone] = savedDrafts[tone];
        continue;
      }

      if (!apiKey) continue;

      try {
        const draft = await generateDraftForTone({
          apiKey,
          planRow: row,
          tone,
          sections: draftSections,
        });
        copyByTone[tone] = draft;
        saveContent(planId, 'draft', tone, JSON.stringify(draft));
      } catch (e) {
        exportErrors.tones ||= {};
        exportErrors.tones[tone] = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    // 2) Translations (use saved, only regenerate missing)
    for (const [lang, content] of Object.entries(savedTranslations)) {
      translationsByLang[lang] = content;
    }

    const missingLanguages = exportLanguages.filter((l) => !savedTranslations[l]);

    if (apiKey && missingLanguages.length > 0) {
      try {
        const res = await generateTranslations({
          apiKey,
          planRow: row,
          targetLanguages: missingLanguages,
          sections: translationSections,
        });

        for (const [lang, content] of Object.entries(res)) {
          translationsByLang[lang] = content;
          saveContent(planId, 'translations', lang, JSON.stringify(content));
        }
      } catch (e) {
        exportErrors.languages ||= {};
        for (const lang of missingLanguages) {
          exportErrors.languages[lang] = e instanceof Error ? e.message : 'Unknown error';
        }
      }
    }

    // 3) Assets (best-effort)
    let pngBuffers: { filename: string; buffer: Buffer }[] = [];
    if (includeAssets) {
      try {
        const assetConfig = buildDefaultAssetConfig(config);
        const assets = generateAssets(assetConfig);
        pngBuffers = await renderAssetsToPngBuffers(assets);
      } catch (e) {
        exportErrors.assets = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    // 4) Package ZIP
    const passthrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 6 } });

    const chunks: Buffer[] = [];
    passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));

    const finishPromise = new Promise<Buffer>((resolve, reject) => {
      passthrough.on('end', () => resolve(Buffer.concat(chunks)));
      passthrough.on('error', reject);
      archive.on('error', reject);
    });

    archive.pipe(passthrough);

    // Root folder
    const root = 'marketing-pack';

    // brief
    archive.append(briefMd || '', { name: `${root}/brief.md` });

    // Saved (non-tone/language) artefacts
    const brandVoice = getContent(planId, 'brand-voice', null);
    if (brandVoice) {
      archive.append(JSON.stringify(brandVoice, null, 2), {
        name: `${root}/brand-voice.json`,
      });
    }

    const positioning = getContent(planId, 'positioning', null);
    if (positioning) {
      archive.append(JSON.stringify(positioning, null, 2), {
        name: `${root}/positioning.json`,
      });
    }

    const competitiveAnalysis = getContent(planId, 'competitive-analysis', null);
    if (competitiveAnalysis) {
      archive.append(JSON.stringify(competitiveAnalysis, null, 2), {
        name: `${root}/competitive-analysis.json`,
      });
    }

    const atoms = getContent(planId, 'atoms', null);
    if (atoms) {
      archive.append(JSON.stringify(atoms, null, 2), {
        name: `${root}/content-atoms.json`,
      });
    }

    const emails = getContent(planId, 'emails', null);
    if (emails) {
      archive.append(JSON.stringify(emails, null, 2), {
        name: `${root}/emails.json`,
      });
    }

    // copy
    for (const tone of Object.keys(copyByTone)) {
      archive.append(JSON.stringify(copyByTone[tone], null, 2), {
        name: `${root}/copy/${tone}.json`,
      });
    }

    // translations
    for (const lang of Object.keys(translationsByLang)) {
      archive.append(JSON.stringify(translationsByLang[lang], null, 2), {
        name: `${root}/translations/${lang}.json`,
      });
    }

    // assets
    for (const { filename, buffer } of pngBuffers) {
      archive.append(Readable.from(buffer), {
        name: `${root}/assets/${filename}`,
      });
    }

    // errors.json (only if something failed)
    if (Object.keys(exportErrors).length > 0) {
      archive.append(
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            planId,
            durationMs: Date.now() - startedAt,
            errors: exportErrors,
          },
          null,
          2
        ),
        { name: `${root}/errors.json` }
      );
    }

    await archive.finalize();
    const zipBuffer = await finishPromise;

    const appNameSlug = safeFilenamePart(config?.app_name || 'plan');
    const filename = `marketing-pack-${appNameSlug || planId}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('export-bundle error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    activeExportBundles--;
  }
}

```

# app/api/export-pdf/route.ts

```ts
import { headers } from 'next/headers';
import { chromium } from 'playwright';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

async function getBaseUrl() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  if (!host) return null;
  return `${proto}://${host}`;
}

function parseCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return [] as { name: string; value: string }[];
  return cookieHeader
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf('=');
      if (idx === -1) return { name: pair, value: '' };
      return { name: pair.slice(0, idx), value: pair.slice(idx + 1) };
    });
}

function getFilenameFromPlanName(planName: string | undefined | null) {
  const safe = slugify(planName || 'plan');
  return `marketing-brief-${safe}.pdf`;
}

export async function POST(req: Request) {
  const baseUrl = await getBaseUrl();
  if (!baseUrl) {
    return Response.json({ error: 'Missing host' }, { status: 400 });
  }

  let body: { planId?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const planId = body.planId?.toString();
  const token = body.token?.toString();

  if (!planId && !token) {
    return Response.json({ error: 'Provide planId or token' }, { status: 400 });
  }

  const cookieHeader = req.headers.get('cookie');

  // Determine filename by fetching the plan JSON (prefer real name, but don't fail export on name lookup).
  let planName: string | undefined;
  try {
    if (token) {
      const res = await fetch(`${baseUrl}/api/shared/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as { config?: { app_name?: string } };
        planName = json?.config?.app_name;
      }
    } else if (planId) {
      const res = await fetch(`${baseUrl}/api/plans/${encodeURIComponent(planId)}`, {
        cache: 'no-store',
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      });
      if (res.ok) {
        const json = (await res.json()) as { config?: { app_name?: string } };
        planName = json?.config?.app_name;
      }
    }
  } catch {
    // ignore
  }

  const filename = getFilenameFromPlanName(planName);

  const targetUrl = token
    ? `${baseUrl}/shared/${encodeURIComponent(token)}?pdf=1`
    : `${baseUrl}/plan/${encodeURIComponent(planId as string)}/strategy/brief?pdf=1`;

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // For authenticated exports, carry cookies into Playwright so the page can render.
    if (planId && cookieHeader) {
      const host = new URL(baseUrl).host;
      const domain = host.split(':')[0];
      const cookies = parseCookieHeader(cookieHeader).map((c) => ({
        name: c.name,
        value: c.value,
        domain,
        path: '/',
      }));
      if (cookies.length) await context.addCookies(cookies);
    }

    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('body', { timeout: 60_000 });

    // Hide UI elements that don't belong in a PDF.
    await page.addStyleTag({
      content: `
        @media print {
          button, a { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        button, nav, header { display: none !important; }
      `,
    });

    // Give client-side data loads a moment to finish rendering.
    await page.waitForTimeout(750);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      preferCSSPageSize: true,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate PDF';
    return Response.json({ error: msg }, { status: 500 });
  } finally {
    try {
      await browser?.close();
    } catch {
      // ignore
    }
  }
}

```

# app/api/generate-all/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { updatePlanContent } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';
import {
  generateBrandVoice,
  generatePositioningAngles,
  generateCompetitiveAnalysis,
  generateDraft,
  generateEmailsSequence,
  atomizeContent,
  generateTranslations,
  type SupportedLanguage,
} from '@/lib/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type StepId =
  | 'brand-voice'
  | 'positioning-angles'
  | 'competitive-analysis'
  | 'generate-draft'
  | 'generate-emails'
  | 'atomize-content'
  | 'generate-translations';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'brand-voice', label: 'Brand Voice' },
  { id: 'positioning-angles', label: 'Positioning Angles' },
  { id: 'competitive-analysis', label: 'Competitive Analysis' },
  { id: 'generate-draft', label: 'Draft Copy (6 sections, bold)' },
  { id: 'generate-emails', label: 'Email Sequence' },
  { id: 'atomize-content', label: 'Atomize Content' },
  { id: 'generate-translations', label: 'Translations (es,de,fr,ja,pt)' },
];

function line(obj: unknown): string {
  return JSON.stringify(obj) + '\n';
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-all',
    maxRequests: 6,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const startedAt = Date.now();

  try {
    const body = (await request.json()) as { planId?: string };
    const planId = typeof body.planId === 'string' ? body.planId : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const wantsStream = request.headers.get('x-stream') === '1';

    const summary: {
      planId: string;
      generated: Record<StepId, boolean>;
      errors: Partial<Record<StepId, string>>;
      durationMs?: number;
    } = {
      planId,
      generated: {
        'brand-voice': false,
        'positioning-angles': false,
        'competitive-analysis': false,
        'generate-draft': false,
        'generate-emails': false,
        'atomize-content': false,
        'generate-translations': false,
      },
      errors: {},
    };

    const run = async (emit?: (o: unknown) => void) => {
      const pipelineGenerated: Record<string, unknown> = {};

      const save = () => {
        updatePlanContent(planId, {
          stagesPatch: {
            pipeline: {
              generatedAt: new Date().toISOString(),
              generated: pipelineGenerated,
            },
          },
        });
      };

      for (let i = 0; i < STEPS.length; i++) {
        const step = STEPS[i];
        emit?.({
          type: 'step:start',
          step: i + 1,
          total: STEPS.length,
          id: step.id,
          label: step.label,
        });

        try {
          switch (step.id) {
            case 'brand-voice': {
              const brandVoice = await generateBrandVoice(planId);
              pipelineGenerated.brandVoice = brandVoice;
              break;
            }
            case 'positioning-angles': {
              const positioning = await generatePositioningAngles(planId);
              pipelineGenerated.positioning = positioning;
              break;
            }
            case 'competitive-analysis': {
              const result = await generateCompetitiveAnalysis(planId);
              pipelineGenerated.competitive = result;
              break;
            }
            case 'generate-draft': {
              const { draft } = await generateDraft({
                planId,
                sections: [
                  'app_store_description',
                  'short_description',
                  'keywords',
                  'whats_new',
                  'feature_bullets',
                  'landing_page_hero',
                ],
                tone: 'bold',
              });
              pipelineGenerated.draftBold = draft;
              break;
            }
            case 'generate-emails': {
              const emails = await generateEmailsSequence({
                planId,
                sequenceType: 'welcome',
                emailCount: 7,
              });
              pipelineGenerated.emailsWelcome = emails;
              break;
            }
            case 'atomize-content': {
              const atoms = await atomizeContent({ planId });
              pipelineGenerated.atoms = atoms;
              break;
            }
            case 'generate-translations': {
              const targetLanguages: SupportedLanguage[] = [
                'es',
                'de',
                'fr',
                'ja',
                'pt-BR',
              ];
              const translations = await generateTranslations({
                planId,
                targetLanguages,
                sections: [
                  'app_store_description',
                  'short_description',
                  'keywords',
                ],
              });
              pipelineGenerated.translations = translations;
              break;
            }
          }

          summary.generated[step.id] = true;
          save();
          emit?.({
            type: 'step:complete',
            step: i + 1,
            total: STEPS.length,
            id: step.id,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          summary.errors[step.id] = msg;
          emit?.({
            type: 'step:error',
            step: i + 1,
            total: STEPS.length,
            id: step.id,
            error: msg,
          });
        }
      }

      summary.durationMs = Date.now() - startedAt;
      emit?.({ type: 'done', summary });
      return summary;
    };

    if (!wantsStream) {
      const final = await run();
      return NextResponse.json(final);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const emit = (o: unknown) =>
          controller.enqueue(encoder.encode(line(o)));
        emit({ type: 'start', total: STEPS.length, planId });
        run(emit)
          .catch((e) => {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            controller.enqueue(encoder.encode(line({ type: 'fatal', error: msg })));
          })
          .finally(() => controller.close());
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('generate-all error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-assets/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAssets } from '@/lib/asset-generator';
import { AssetConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, tagline, icon, url, features, colors } = body as AssetConfig;

    if (!name) {
      return NextResponse.json({ error: 'App name is required' }, { status: 400 });
    }

    const config: AssetConfig = {
      name,
      tagline: tagline || '',
      icon: icon || '🚀',
      url: url || '',
      features: features || [],
      colors: {
        background: colors?.background || '#0f172a',
        text: colors?.text || '#e2e8f0',
        primary: colors?.primary || '#6366f1',
        secondary: colors?.secondary || '#8b5cf6',
      },
    };

    const assets = generateAssets(config);
    return NextResponse.json({ assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate assets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/generate-draft/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent, getPlanContent } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

type DraftSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets'
  | 'landing_page_hero';

interface GenerateDraftRequest {
  planId: string;
  sections: DraftSection[];
  tone: Tone;
}

const VALID_TONES: Tone[] = ['professional', 'casual', 'bold', 'minimal'];
const VALID_SECTIONS: DraftSection[] = [
  'app_store_description',
  'short_description',
  'keywords',
  'whats_new',
  'feature_bullets',
  'landing_page_hero',
];

function sectionLabel(section: DraftSection): string {
  switch (section) {
    case 'app_store_description':
      return 'App Store description';
    case 'short_description':
      return 'Short description';
    case 'keywords':
      return 'Keywords';
    case 'whats_new':
      return "What's New";
    case 'feature_bullets':
      return 'Feature bullets';
    case 'landing_page_hero':
      return 'Landing page hero copy';
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-draft',
    maxRequests: 12,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = (await request.json()) as Partial<GenerateDraftRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const tone: Tone =
      body.tone && VALID_TONES.includes(body.tone) ? body.tone : 'professional';

    const requestedSections = Array.isArray(body.sections) ? body.sections : [];
    const sections = requestedSections.filter((s): s is DraftSection =>
      VALID_SECTIONS.includes(s as DraftSection)
    );

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "sections"' },
        { status: 400 }
      );
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const systemPrompt = `You are an expert app store copywriter.

Write a complete first-draft of app listing / landing page copy based on the provided app marketing plan.
Tone: ${tone}.

Output MUST be valid JSON only (no markdown, no commentary). The JSON must be an object where each key is one of the requested sections, and the value is a string.

Sections requested:
${sections.map((s) => `- ${s}: ${sectionLabel(s)}`).join('\n')}

Writing requirements by section:
- app_store_description: 800-2000 characters. Use short paragraphs, benefits-first, include a light CTA.
- short_description: 60-80 characters (store-friendly). No quotes.
- keywords: comma-separated keywords (15-30), no hashtags.
- whats_new: 2-4 short bullet lines describing updates (even if fictional, keep plausible).
- feature_bullets: 5-8 bullets, each max ~12 words.
- landing_page_hero: 1 headline + 1 subheadline + 1 primary CTA label, separated by newlines.

Use the app's differentiators and audience. Avoid making unverifiable claims (e.g., "#1", "guaranteed").`;

    const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userContent }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      // Strip markdown code fences if present (common Gemini behaviour)
      let cleaned = text.replace(/^\`\`\`(?:json)?\s*\n?/i, '').replace(/\n?\`\`\`\s*$/i, '').trim();
      // If Gemini omitted the outer braces, try wrapping
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        cleaned = '{' + cleaned + '}';
      }
      parsed = JSON.parse(cleaned);
    } catch {
      // Second attempt: extract JSON object with regex
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('Failed to parse Gemini JSON (both attempts):', text.slice(0, 500));
          return NextResponse.json(
            { error: 'Model returned invalid JSON. Please try again.' },
            { status: 502 }
          );
        }
      } else {
        console.error('Failed to parse Gemini JSON (no JSON found):', text.slice(0, 500));
        return NextResponse.json(
          { error: 'Model returned invalid JSON. Please try again.' },
          { status: 502 }
        );
      }
    }

    const draft: Record<string, string> = {};
    if (parsed && typeof parsed === 'object') {
      for (const s of sections) {
        const val = (parsed as Record<string, unknown>)[s];
        if (typeof val === 'string') {
          draft[s] = val.trim();
        }
      }
    }

    if (Object.keys(draft).length === 0) {
      return NextResponse.json(
        { error: 'Model did not return the requested sections. Please try again.' },
        { status: 502 }
      );
    }

    const usage = data?.usageMetadata;
    const tokens =
      typeof usage?.totalTokenCount === 'number'
        ? usage.totalTokenCount
        : typeof usage?.promptTokenCount === 'number' &&
            typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null;

    saveContent(planId, 'draft', tone, JSON.stringify(draft));

    // Persist the generated draft (keyed by tone)
    const existingDrafts = (getPlanContent(planId).drafts || {}) as Record<string, unknown>;
    existingDrafts[tone] = draft;
    updatePlanContent(planId, 'drafts', existingDrafts);

    return NextResponse.json({
      draft,
      metadata: {
        model: 'gemini-2.5-flash',
        tokens,
        tone,
      },
    });
  } catch (err) {
    console.error('generate-draft error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-emails/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent, getPlanContent } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

type SequenceType = 'welcome' | 'launch' | 'nurture';

interface GenerateEmailsRequest {
  planId: string;
  sequenceType?: SequenceType;
  emailCount?: number;
}

const VALID_SEQUENCE_TYPES: SequenceType[] = ['welcome', 'launch', 'nurture'];

function cleanAndParseJson(text: string): unknown {
  // Strip markdown code fences if present (common Gemini behaviour)
  let cleaned = text
    .replace(/^\`\`\`(?:json)?\s*\n?/i, '')
    .replace(/\n?\`\`\`\s*$/i, '')
    .trim();

  // If Gemini omitted the outer braces, try wrapping
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    cleaned = '{' + cleaned + '}';
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found');
    return JSON.parse(jsonMatch[0]);
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-emails',
    maxRequests: 10,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = (await request.json()) as Partial<GenerateEmailsRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const sequenceType: SequenceType =
      body.sequenceType && VALID_SEQUENCE_TYPES.includes(body.sequenceType)
        ? body.sequenceType
        : 'welcome';

    const emailCountRaw = typeof body.emailCount === 'number' ? body.emailCount : undefined;
    const emailCount =
      typeof emailCountRaw === 'number' && Number.isFinite(emailCountRaw)
        ? Math.max(1, Math.min(20, Math.round(emailCountRaw)))
        : 7;

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const welcomePurposes = [
      'DELIVER - deliver the lead magnet',
      'CONNECT - quick origin story + set expectations',
      'VALUE - teach one useful thing they can do today',
      'VALUE - another quick win (framework/checklist)',
      'BRIDGE - reframe the problem + why your solution works',
      'SOFT ASK - invite them to try / reply / low-friction CTA',
      'DIRECT ASK - clear offer + deadline/urgency (ethical)',
    ];

    const systemPrompt = `You are a direct-response email marketer.

Write a ${sequenceType} email sequence for the given app marketing plan.

Rules:
- Output MUST be valid JSON only (no markdown, no commentary).
- Write emails that sound like a real person (short sentences, contractions, no corporate fluff).
- Benefit-led, specific, and grounded in the plan's features/differentiators.
- Avoid unverifiable claims (no #1, guaranteed). If you add urgency, keep it ethical.
- Each email body must be in Markdown.
- Include a clear CTA per email: { text, action } where action describes what the link should do (e.g. "open onboarding", "book a demo", "read the blog post", "reply to this email").
- Include a sendDelay per email (e.g. "immediately", "+1 day", "+3 days").

Sequence requirements:
- For sequenceType=welcome, follow this exact purpose progression (7 emails):
  1) ${welcomePurposes[0]}
  2) ${welcomePurposes[1]}
  3) ${welcomePurposes[2]}
  4) ${welcomePurposes[3]}
  5) ${welcomePurposes[4]}
  6) ${welcomePurposes[5]}
  7) ${welcomePurposes[6]}
- If emailCount is not 7, keep the same progression but compress/expand logically.
- Subject lines: punchy, not spammy (no ALL CAPS, no excessive punctuation).
- Preview text: 35-90 characters.

Return JSON shape:
{
  "sequence": {
    "type": "welcome" | "launch" | "nurture",
    "description": "...",
    "emails": [
      {
        "number": 1,
        "purpose": "...",
        "subjectLine": "...",
        "previewText": "...",
        "body": "...",
        "cta": { "text": "...", "action": "..." },
        "sendDelay": "..."
      }
    ]
  },
  "metadata": { "model": "gemini-2.5-flash", "tokens": 0, "sequenceType": "..." }
}

Do not include any keys besides sequence and metadata.`;

    const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}\n\nREQUEST:\nsequenceType=${sequenceType}\nemailCount=${emailCount}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = cleanAndParseJson(text);
    } catch {
      console.error('Failed to parse Gemini JSON:', text.slice(0, 500));
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const usage = data?.usageMetadata;
    const tokens =
      typeof usage?.totalTokenCount === 'number'
        ? usage.totalTokenCount
        : typeof usage?.promptTokenCount === 'number' &&
            typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null;

    // Ensure metadata tokens/model are present (don't trust model for this)
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const metadataRaw = (obj.metadata && typeof obj.metadata === 'object'
        ? (obj.metadata as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      metadataRaw.model = 'gemini-2.5-flash';
      metadataRaw.tokens = tokens;
      metadataRaw.sequenceType = sequenceType;
      obj.metadata = metadataRaw;
    }

    // Light validation to avoid UI crashes
    let emails: unknown = null;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const seq = obj.sequence;
      if (seq && typeof seq === 'object') {
        emails = (seq as Record<string, unknown>).emails;
      }
    }

    if (Array.isArray(emails) && emails.length > 0) {
      saveContent(planId, 'emails', null, JSON.stringify(parsed));
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Model did not return an email sequence. Please try again.' },
        { status: 502 }
      );
    }

    // Persist the generated email sequence (keyed by sequenceType)
    const existingEmails = (getPlanContent(planId).emails || {}) as Record<string, unknown>;
    existingEmails[sequenceType] = parsed;
    updatePlanContent(planId, 'emails', existingEmails);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('generate-emails error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-hero-bg/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * POST /api/generate-hero-bg
 *
 * Body:
 * {
 *   imageBrief: { hook, scene, subject, mood, palette, composition, avoid[] },
 *   aspectRatio?: "1:1" | "9:16",
 *   publicBase?: string
 * }
 *
 * Generates a background image (PNG) using Imagen 3 and saves it to /app/data/images.
 */

const IMAGES_DIR = '/app/data/images';

type ImageBrief = {
  hook?: string;
  scene?: string;
  subject?: string;
  mood?: string;
  palette?: string;
  composition?: string;
  avoid?: string[];
};

function safeLine(label: string, value: unknown) {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? `${label}: ${s}` : '';
}

function buildImagenPrompt(brief: ImageBrief) {
  const avoid = Array.isArray(brief.avoid)
    ? brief.avoid.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
    : [];

  const lines = [
    'Create a high-quality background image for a social post (no foreground UI).',
    safeLine('Scene', brief.scene),
    safeLine('Subject', brief.subject),
    safeLine('Mood', brief.mood),
    safeLine('Color palette', brief.palette),
    safeLine('Composition', brief.composition),
    brief.hook ? `Creative intent: evoke the hook "${brief.hook.trim()}" without using any text.` : '',
    avoid.length ? `Avoid: ${avoid.join('; ')}.` : '',
    // Hard constraints
    'Hard constraints:',
    '- No text, typography, captions, subtitles, words, letters, numbers.',
    '- No logos, watermarks, signatures, UI elements, app screens, frames, phone mockups.',
    '- Do not include people or faces.',
    '- Background should have clear negative space for overlaid text.',
    'Style: modern, cinematic, tasteful, realistic lighting, high detail, sharp, 4k.',
  ].filter(Boolean);

  return lines.join('\n');
}

function extractBase64Png(payload: unknown): string | null {
  const data = payload as {
    predictions?: Array<{ bytesBase64Encoded?: string; image?: { bytesBase64Encoded?: string }; imageBytes?: string }>;
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
    output?: Array<{ data?: string }>;
  };
  // Imagen predict responses have varied shapes across versions; handle common cases.
  const p0 = data?.predictions?.[0];
  const candidates = [
    p0?.bytesBase64Encoded,
    p0?.image?.bytesBase64Encoded,
    p0?.imageBytes,
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data,
    data?.output?.[0]?.data,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 100) return c;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const body = await request.json();
    const imageBrief = (body?.imageBrief || null) as ImageBrief | null;
    const aspectRatio = (body?.aspectRatio === '9:16' ? '9:16' : '1:1') as '1:1' | '9:16';
    const baseUrl = (body?.publicBase as string | undefined) || request.nextUrl.origin;

    if (!imageBrief) {
      return NextResponse.json({ error: 'Missing imageBrief' }, { status: 400 });
    }

    const prompt = buildImagenPrompt(imageBrief);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
          safetyFilterLevel: 'BLOCK_ONLY_HIGH',
          personGeneration: 'DONT_ALLOW',
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Imagen request failed', status: res.status, details: text.slice(0, 2000) },
        { status: 502 }
      );
    }

    const json = await res.json();
    const b64 = extractBase64Png(json);

    if (!b64) {
      return NextResponse.json(
        { error: 'No image returned from Imagen', details: JSON.stringify(json).slice(0, 2000) },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(b64, 'base64');

    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    const filename = `${crypto.randomUUID()}.png`;
    const filePath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/api/images/${filename}`;

    return NextResponse.json({
      publicUrl,
      fullPublicUrl: `${baseUrl}${publicUrl}`,
      prompt,
    });
  } catch (err) {
    console.error('generate-hero-bg error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-plan/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { generateMarketingPlan, scrapedToConfig } from '@/lib/plan-generator';
import { savePlan } from '@/lib/db';
import { AppConfig, ScrapedApp } from '@/lib/types';
import { guardApiRoute } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-plan',
    maxRequests: 20,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { scraped, config: userConfig, goals, tone } = body as {
      scraped: ScrapedApp;
      config?: Partial<AppConfig>;
      goals?: string[];
      tone?: string;
    };

    if (!scraped || !scraped.name) {
      return NextResponse.json({ error: 'Scraped app data is required' }, { status: 400 });
    }

    // Build config from scraped data, merging any user overrides
    const baseConfig = scrapedToConfig(scraped);
    const config: AppConfig = {
      ...baseConfig,
      ...userConfig,
      differentiators: userConfig?.differentiators?.length ? userConfig.differentiators : baseConfig.differentiators,
      distribution_channels: userConfig?.distribution_channels?.length ? userConfig.distribution_channels : baseConfig.distribution_channels,
      competitors: userConfig?.competitors?.length ? userConfig.competitors : baseConfig.competitors,
    };

    const plan = generateMarketingPlan(config, scraped, goals, tone);

    // Auto-save to SQLite (DB-first: only return success if persisted)
    try {
      savePlan(plan);
    } catch (dbErr) {
      console.error('Failed to save plan to database:', dbErr);
      return NextResponse.json(
        { error: 'Failed to save plan. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/generate-post-image/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';
import { generateSocialTemplates } from '@/lib/socialTemplates';
import type { MarketingPlan } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Generate a single social post image and save it to /app/data/images/
 * (Railway persistent volume), then return a public URL that Buffer can fetch.
 *
 * POST /api/generate-post-image
 * { planId, platform: "instagram-post" | "instagram-story", caption?, style?, visualMode? }
 *
 * visualMode: "screenshot" | "hero" | "hybrid" (default: screenshot)
 *
 * Returns:
 * {
 *   filename: "abc123.png",
 *   publicUrl: "/api/images/abc123.png",
 *   fullPublicUrl: "https://.../api/images/abc123.png",
 *   width,
 *   height,
 *   platform,
 *   style
 * }
 */

const IMAGES_DIR = '/app/data/images';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = body.planId;
    const platform = body.platform || 'instagram-post';
    const style = body.style || 'gradient';
    const visualMode = body.visualMode || 'screenshot';
    const imageBrief = body.imageBrief || null;
    const caption = body.caption || '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const stages = JSON.parse(row.stages || '{}');

    // Build a minimal MarketingPlan for the template generator
    const plan: MarketingPlan = {
      id: planId,
      config: {
        app_name: config.app_name || 'App',
        one_liner: caption || config.one_liner || '',
        category: config.category || '',
        app_url: config.app_url || '',
        app_type: config.app_type || 'website',
        ...config,
      },
      scraped: JSON.parse(row.scraped || '{}'),
      stages,
      generated: row.generated || '',
      createdAt: row.created_at,
    };

    // Internal base (always localhost for server-to-server calls)
    const internalBase = `http://localhost:${process.env.PORT || 3000}`;
    const baseUrl = (body.publicBase as string | undefined) || request.nextUrl.origin;

    // Best-effort AI hero background (used only for hero/hybrid modes)
    let bgImageUrl: string | undefined;
    if ((visualMode === 'hero' || visualMode === 'hybrid') && imageBrief) {
      try {
        const aspectRatio = platform === 'instagram-story' ? '9:16' : '1:1';
        const heroRes = await fetch(`${internalBase}/api/generate-hero-bg`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.API_KEY || '',
          },
          body: JSON.stringify({
            imageBrief,
            aspectRatio,
            publicBase: baseUrl,
          }),
        });

        if (heroRes.ok) {
          const heroJson = await heroRes.json();
          if (typeof heroJson?.fullPublicUrl === 'string' && heroJson.fullPublicUrl.startsWith('http')) {
            bgImageUrl = heroJson.fullPublicUrl;
          }
        }
      } catch (e) {
        console.warn('hero bg generation failed (fallback to gradient):', e);
      }
    }

    // Generate HTML template
    const templates = generateSocialTemplates({
      plan,
      platforms: [platform],
      style,
      visualMode,
      accentColor: config.accent_color || '#667eea',
      bgImageUrl,
      // Pass through any hook-based image brief (best-effort). Templates may ignore.
      imageBrief,
    });

    if (templates.length === 0) {
      return NextResponse.json({ error: 'No template generated' }, { status: 500 });
    }

    const template = templates[0];

    // Render to PNG via our render-png API — use localhost to avoid HTTPS SSL errors on Railway
    const renderRes = await fetch(`${internalBase}/api/render-png`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY || '',
      },
      body: JSON.stringify({
        html: template.html,
        width: template.width,
        height: template.height,
      }),
    });

    if (!renderRes.ok) {
      return NextResponse.json({ error: 'Failed to render image' }, { status: 502 });
    }

    const buffer = Buffer.from(await renderRes.arrayBuffer());

    // Ensure images dir exists on Railway persistent volume
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    const filename = `${crypto.randomUUID()}.png`;
    const filePath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/api/images/${filename}`;

    return NextResponse.json({
      filename,
      publicUrl,
      fullPublicUrl: `${baseUrl}${publicUrl}`,
      width: template.width,
      height: template.height,
      platform,
      style,
    });
  } catch (err) {
    console.error('generate-post-image error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-schedule/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPlan } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

/**
 * Auto-generate a week of scheduled content using AI.
 *
 * POST /api/generate-schedule
 * { planId, platform?, startDate?, days? }
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-schedule',
    maxRequests: 12,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { planId, platform = 'instagram', startDate, days = 7 } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const appName = config.app_name || scraped.name || 'Unknown App';

    const start = startDate ? new Date(startDate) : new Date();
    // Round to next day if no startDate
    if (!startDate) {
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
    }

    const optimalTimes: Record<string, string[]> = {
      instagram: ['09:00', '12:00', '17:00', '20:00'],
      tiktok: ['07:00', '10:00', '14:00', '19:00'],
    };

    const times = optimalTimes[platform] || optimalTimes.instagram;

    const systemPrompt = `You are an expert social media strategist. Generate a content schedule for ${days} days.

Create diverse, engaging content topics for ${platform}. Mix these categories:
- Tips & how-tos
- Feature highlights
- User testimonials / social proof
- Behind-the-scenes / team stories
- Industry trends & insights
- Engagement posts (polls, questions)
- Seasonal / timely content

Return valid JSON array:
[
  {
    "day": 1,
    "time": "HH:MM",
    "topic": "brief topic description",
    "content_type": "post|reel|story|carousel",
    "category": "tips|feature|testimonial|bts|trends|engagement|seasonal"
  }
]

Schedule 1-2 posts per day. Use these optimal times: ${times.join(', ')}.
Vary content types and categories across the week.`;

    const userContent = `APP: ${appName}
DESCRIPTION: ${config.one_liner || scraped.subtitle || ''}
CATEGORY: ${config.category || scraped.category || ''}
TARGET AUDIENCE: ${config.target_audience || ''}
PLATFORM: ${platform}
DAYS: ${days}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResp.ok) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const geminiData = await geminiResp.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let schedule: Array<{ day: number; time: string; topic: string; content_type: string }>;
    try {
      schedule = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return NextResponse.json({ error: 'Invalid AI JSON' }, { status: 502 });
      schedule = JSON.parse(match[0]);
    }

    // Insert into DB
    const db = getDb();
    const created: string[] = [];

    for (const item of schedule) {
      const date = new Date(start);
      date.setDate(date.getDate() + (item.day - 1));
      const [hours, minutes] = item.time.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      const scheduledAt = date.toISOString().replace('T', ' ').slice(0, 19);
      const id = crypto.randomUUID();

      db.prepare(`
        INSERT INTO content_schedule (id, plan_id, platform, content_type, topic, scheduled_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, planId, platform, item.content_type || 'post', item.topic, scheduledAt);

      created.push(id);
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      ids: created,
    });
  } catch (err) {
    console.error('generate-schedule error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-social-images/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';
import { getPlan, updatePlanContent } from '@/lib/db';
import type { MarketingPlan } from '@/lib/types';
import {
  generateSocialTemplates,
  type SocialPlatform,
  type SocialStyle,
} from '@/lib/socialTemplates';

let activeJobs = 0;
const MAX_CONCURRENT = 1;

function isPlatform(x: unknown): x is SocialPlatform {
  return (
    x === 'twitter' ||
    x === 'linkedin' ||
    x === 'instagram-post' ||
    x === 'instagram-story' ||
    x === 'facebook-og'
  );
}

function isStyle(x: unknown): x is SocialStyle {
  return x === 'gradient' || x === 'dark' || x === 'light';
}

export async function POST(request: NextRequest) {
  if (activeJobs >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: 'A social pack is already generating. Please try again shortly.' },
      { status: 429 }
    );
  }

  activeJobs++;
  try {
    const body = await request.json();
    const planId = typeof body?.planId === 'string' ? body.planId : '';
    const platformsRaw = body?.platforms;
    const styleRaw = body?.style;
    const accentColor =
      typeof body?.accentColor === 'string' ? body.accentColor : '#667eea';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const platforms = Array.isArray(platformsRaw)
      ? platformsRaw.filter(isPlatform)
      : [];

    if (platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing "platforms" (non-empty array)' },
        { status: 400 }
      );
    }

    const style: SocialStyle = isStyle(styleRaw) ? styleRaw : 'gradient';

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const plan: MarketingPlan = {
      id: row.id,
      config: JSON.parse(row.config || '{}'),
      scraped: JSON.parse(row.scraped || '{}'),
      generated: row.generated,
      createdAt: row.created_at,
      stages: JSON.parse(row.stages || '{}'),
    };

    const templates = generateSocialTemplates({
      plan,
      platforms,
      style,
      accentColor,
    });

    // Render templates to png via Playwright (single browser, sequential pages)
    let chromium;
    try {
      const pw = await import('playwright');
      chromium = pw.chromium;
    } catch {
      return NextResponse.json(
        {
          error:
            'Playwright is not installed. Run: npm install playwright-core && npx playwright-core install chromium',
        },
        { status: 500 }
      );
    }

    const browser = await chromium.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const pngBuffers: { filename: string; buffer: Buffer }[] = [];

      for (const t of templates) {
        const context = await browser.newContext({
          viewport: { width: t.width, height: t.height },
        });
        const page = await context.newPage();

        await page.setContent(t.html, {
          waitUntil: 'networkidle',
          timeout: 15000,
        });

        const screenshot = await page.screenshot({
          type: 'png',
          timeout: 15000,
        });

        pngBuffers.push({
          filename: t.filename.endsWith('.png') ? t.filename : `${t.filename}.png`,
          buffer: Buffer.from(screenshot),
        });

        await context.close();
      }

      const passthrough = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 6 } });

      const chunks: Buffer[] = [];
      passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));

      const finishPromise = new Promise<Buffer>((resolve, reject) => {
        passthrough.on('end', () => resolve(Buffer.concat(chunks)));
        passthrough.on('error', reject);
        archive.on('error', reject);
      });

      archive.pipe(passthrough);

      for (const { filename, buffer } of pngBuffers) {
        archive.append(Readable.from(buffer), { name: filename });
      }

      await archive.finalize();
      const zipBuffer = await finishPromise;

      // Save metadata about generated images
      updatePlanContent(planId, 'socialImages', {
        platforms,
        style,
        accentColor,
        files: pngBuffers.map(p => p.filename),
        generatedAt: new Date().toISOString(),
      });

      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="social-images.zip"',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate social pack';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    activeJobs--;
  }
}

```

# app/api/generate-social-post/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

interface GenerateSocialPostRequest {
  planId: string;
  platform: 'instagram' | 'tiktok';
  contentType: 'post' | 'reel' | 'story' | 'carousel';
  topic?: string; // optional theme/angle
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<GenerateSocialPostRequest>;

    const planId = body.planId;
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const platform = body.platform || 'instagram';
    const contentType = body.contentType || 'post';
    const topic = body.topic || '';

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const platformGuidelines: Record<string, string> = {
      instagram: `Instagram guidelines:
- Caption: 150-300 words, engaging hook in first line (before "...more")
- Use line breaks for readability
- 20-30 relevant hashtags (mix of broad + niche)
- Include a clear CTA
- Emoji usage: moderate, strategic
- For reels: suggest a hook, scene breakdown, trending audio direction
- For carousels: suggest 5-8 slide titles + key points per slide
- For stories: suggest 3-5 story frames with interactive elements (polls, questions)`,
      tiktok: `TikTok guidelines:
- Caption: 50-150 words, punchy and direct
- 3-5 hashtags max (trending + niche)
- Hook must grab attention in first 1-2 seconds
- Suggest a trending format/sound direction
- Include text overlay suggestions
- For posts: suggest visual concept
- Keep tone casual, authentic, slightly edgy`,
    };

    const systemPrompt = `You are an expert social media content creator specialising in app marketing on ${platform}.

${platformGuidelines[platform] || platformGuidelines.instagram}

Create a single ${contentType} for the app described below. Return valid JSON only.

Response schema:
{
  "caption": "string - the full post caption",
  "hashtags": ["string array"],
  "hook": "string - the attention-grabbing first line/moment",
  "media_concept": "string - what visual/video to create",
  "media_specs": {
    "format": "string - image/video/carousel",
    "aspect_ratio": "string - 1:1, 9:16, 4:5",
    "suggested_duration_seconds": number | null,
    "text_overlays": ["string array - text to show on screen"],
    "scene_breakdown": ["string array - scene descriptions for video"]
  },
  "cta": "string - call to action",
  "best_posting_time": "string - suggested time like '9:00 AM' or '7:30 PM'",
  "best_posting_day": "string - e.g. 'Tuesday' or 'Weekend'",
  "engagement_tips": ["string array - 2-3 tips to boost engagement"]
}`;

    const userContent = `APP: ${config.app_name || scraped.name || 'Unknown'}
ONE-LINER: ${config.one_liner || scraped.subtitle || ''}
CATEGORY: ${config.category || scraped.category || ''}
TARGET AUDIENCE: ${config.target_audience || ''}
PRICING: ${config.pricing || scraped.price || ''}
DIFFERENTIATORS: ${config.differentiators || ''}
RATING: ${scraped.rating || 'N/A'}
URL: ${config.app_url || scraped.url || ''}

CONTENT TYPE: ${contentType}
${topic ? `TOPIC/ANGLE: ${topic}` : 'Generate a topic that would resonate with the target audience.'}

Generate a single compelling ${contentType} for ${platform}.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini error:', geminiResponse.status, errText);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let post: Record<string, unknown>;
    try {
      post = JSON.parse(text);
    } catch {
      // Try to extract JSON
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
      }
      post = JSON.parse(match[0]);
    }

    return NextResponse.json({
      post,
      metadata: {
        platform,
        contentType,
        model: 'gemini-2.0-flash',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('generate-social-post error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-translations/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent, getPlanContent } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

type TranslationSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets';

interface GenerateTranslationsRequest {
  planId: string;
  targetLanguages: string[];
  sections: TranslationSection[];
}

const VALID_SECTIONS: TranslationSection[] = [
  'app_store_description',
  'short_description',
  'keywords',
  'whats_new',
  'feature_bullets',
];

const SUPPORTED_LANGUAGES = [
  'es',
  'fr',
  'de',
  'ja',
  'ko',
  'pt-BR',
  'it',
  'zh-Hans',
  'nl',
  'ar',
] as const;

function sectionLabel(section: TranslationSection): string {
  switch (section) {
    case 'app_store_description':
      return 'App Store description';
    case 'short_description':
      return 'Short description';
    case 'keywords':
      return 'Keywords';
    case 'whats_new':
      return "What's New";
    case 'feature_bullets':
      return 'Feature bullets';
  }
}

function languageLabel(code: string): string {
  switch (code) {
    case 'es':
      return 'Spanish (es)';
    case 'fr':
      return 'French (fr)';
    case 'de':
      return 'German (de)';
    case 'ja':
      return 'Japanese (ja)';
    case 'ko':
      return 'Korean (ko)';
    case 'pt-BR':
      return 'Portuguese (Brazil) (pt-BR)';
    case 'it':
      return 'Italian (it)';
    case 'zh-Hans':
      return 'Chinese (Simplified) (zh-Hans)';
    case 'nl':
      return 'Dutch (nl)';
    case 'ar':
      return 'Arabic (ar)';
    default:
      return code;
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-translations',
    maxRequests: 10,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = (await request.json()) as Partial<GenerateTranslationsRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const requestedLanguages = Array.isArray(body.targetLanguages)
      ? body.targetLanguages
      : [];
    const targetLanguages = requestedLanguages.filter((l): l is (typeof SUPPORTED_LANGUAGES)[number] =>
      (SUPPORTED_LANGUAGES as readonly string[]).includes(l)
    );

    if (targetLanguages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "targetLanguages"' },
        { status: 400 }
      );
    }

    const requestedSections = Array.isArray(body.sections) ? body.sections : [];
    const sections = requestedSections.filter((s): s is TranslationSection =>
      VALID_SECTIONS.includes(s as TranslationSection)
    );

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "sections"' },
        { status: 400 }
      );
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const systemPrompt = `You are an expert app store localisation copywriter.

Task:
- Produce LOCALISED app store copy (not literal translation) for the requested languages.
- Adapt idioms, cultural references, and app store conventions for each locale.
- Keep meaning consistent with the product, but make it feel native.

Output rules:
- Output MUST be valid JSON only (no markdown, no commentary).
- The JSON MUST be an object with a top-level key "translations".
- translations[language_code][section] = string.
- Only include the requested languages and requested sections.

Languages requested:
${targetLanguages.map((l) => `- ${l}: ${languageLabel(l)}`).join('\n')}

Sections requested:
${sections.map((s) => `- ${s}: ${sectionLabel(s)}`).join('\n')}

Section requirements:
- app_store_description: 800-2000 characters (or natural equivalent length). Short paragraphs, benefits-first, light CTA.
- short_description: ~60-80 characters (store-friendly, no quotes). Localise length appropriately.
- keywords: comma-separated keywords (15-30). Use locale-appropriate search terms. No hashtags.
- whats_new: 2-4 short bullet lines describing updates (plausible). Use local style.
- feature_bullets: 5-8 bullets, each max ~12 words, benefit-forward.

Quality/safety:
- Avoid unverifiable claims (e.g., "#1", "guaranteed").
- Keep brand/product names in original form.
- For Arabic, write natural Modern Standard Arabic and keep punctuation readable.`;

    const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userContent }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        {
          error: `Gemini API error (${geminiResponse.status}). Please try again.`,
        },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error(
        'Unexpected Gemini response shape:',
        JSON.stringify(data).slice(0, 500)
      );
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      let cleaned = text.replace(/^\`\`\`(?:json)?\s*\n?/i, '').replace(/\n?\`\`\`\s*$/i, '').trim();
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        cleaned = '{' + cleaned + '}';
      }
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('Failed to parse Gemini JSON (both attempts):', text.slice(0, 500));
          return NextResponse.json(
            { error: 'Model returned invalid JSON. Please try again.' },
            { status: 502 }
          );
        }
      } else {
        console.error('Failed to parse Gemini JSON (no JSON found):', text.slice(0, 500));
        return NextResponse.json(
          { error: 'Model returned invalid JSON. Please try again.' },
          { status: 502 }
        );
      }
    }

    const translations: Record<string, Record<string, string>> = {};
    const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    const t = obj?.translations;

    if (t && typeof t === 'object') {
      for (const lang of targetLanguages) {
        const langObj = (t as Record<string, unknown>)[lang];
        if (!langObj || typeof langObj !== 'object') continue;

        for (const section of sections) {
          const val = (langObj as Record<string, unknown>)[section];
          if (typeof val === 'string' && val.trim().length > 0) {
            translations[lang] ||= {};
            translations[lang][section] = val.trim();
          }
        }
      }
    }

    if (Object.keys(translations).length === 0) {
      return NextResponse.json(
        { error: 'Model did not return the requested translations. Please try again.' },
        { status: 502 }
      );
    }

    for (const [lang, content] of Object.entries(translations)) {
      saveContent(planId, 'translations', lang, JSON.stringify(content));
    }

    // Persist the generated translations (merge with existing)
    const existingTranslations = (getPlanContent(planId).translations || {}) as Record<string, Record<string, string>>;
    for (const lang of Object.keys(translations)) {
      existingTranslations[lang] = { ...existingTranslations[lang], ...translations[lang] };
    }
    updatePlanContent(planId, 'translations', existingTranslations);

    return NextResponse.json({
      translations,
      metadata: {
        model: 'gemini-2.5-flash',
        languages: targetLanguages,
        sections,
      },
    });
  } catch (err) {
    console.error('generate-translations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-variants/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { guardApiRoute } from '@/lib/api-guard';

interface GenerateVariantsRequest {
  text: string;
  context: string;
  count?: number;
}

function coerceCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 3;
  const int = Math.floor(value);
  return Math.min(6, Math.max(1, int));
}

function extractJsonArray(text: string): string[] | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed;
  } catch {
    // fallthrough
  }

  // Fallback: try to extract the first JSON array substring.
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;

  const maybe = trimmed.slice(start, end + 1);
  try {
    const parsed = JSON.parse(maybe);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed;
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-variants',
    maxRequests: 20,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = (await request.json()) as Partial<GenerateVariantsRequest>;

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or empty "text" field' }, { status: 400 });
    }

    const context = typeof body.context === 'string' ? body.context : '';
    const count = coerceCount(body.count);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `Generate ${count} distinct marketing copy variants for this template. Each should have a different angle/tone: one punchy and bold, one conversational and friendly, one data-driven and professional. Return ONLY a JSON array of strings, no markdown. Context about the app: ${context}.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: body.text }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      }),
    }).finally(() => clearTimeout(timeout));

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: 'Unexpected response from Gemini. Please try again.' }, { status: 502 });
    }

    const variants = extractJsonArray(rawText);
    if (!variants) {
      console.error('Could not parse variants JSON:', rawText.slice(0, 500));
      return NextResponse.json(
        { error: 'Gemini did not return valid JSON variants. Please try again.' },
        { status: 502 }
      );
    }

    const cleaned = variants
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, count);

    if (cleaned.length === 0) {
      return NextResponse.json(
        { error: 'No variants returned. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ variants: cleaned });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out. Please try again.' }, { status: 504 });
    }

    console.error('generate-variants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-video/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

const DEFAULT_MODEL = 'models/veo-2.0-generate-001';
const GENERATE_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning';

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    // Prefer env vars when set; fallback to repo key per project instruction.
    (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')
  );
}

type VeoTemplateConfig = {
  templates?: Record<
    string,
    {
      prompt: string;
      aspectRatio?: string;
      durationSeconds?: number;
    }
  >;
};

function loadTemplates(): VeoTemplateConfig {
  const configPath = path.join(process.cwd(), 'tools', 'veo-video.config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

/**
 * POST /api/generate-video
 * Body: { planId, template?, prompt?, aspectRatio? }
 * Returns immediately: { success: true, operationName }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const planId = body?.planId ? String(body.planId) : '';
    const templateName = body?.template ? String(body.template) : '';
    const customPrompt = body?.prompt ? String(body.prompt) : '';
    const bodyAspectRatio = body?.aspectRatio ? String(body.aspectRatio) : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    let prompt = customPrompt;
    let aspectRatio = bodyAspectRatio;

    if (templateName) {
      const config = loadTemplates();
      const tpl = config?.templates?.[templateName];
      if (!tpl) {
        return NextResponse.json(
          {
            error: `Unknown template "${templateName}"`,
            availableTemplates: Object.keys(config?.templates || {})
          },
          { status: 400 }
        );
      }
      prompt = prompt || tpl.prompt;
      aspectRatio = aspectRatio || tpl.aspectRatio || '';
    }

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Missing prompt (provide prompt or template)' },
        { status: 400 }
      );
    }

    const apiKey = getApiKey();

    const veoBody = {
      model: DEFAULT_MODEL,
      instances: [{ prompt }],
      parameters: {
        aspectRatio: aspectRatio || undefined,
        sampleCount: 1,
        durationSeconds: 6
      }
    };

    const res = await fetch(GENERATE_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(veoBody)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Veo generate failed (${res.status} ${res.statusText}). ${text}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const operationName = json?.name;
    if (!operationName) {
      return NextResponse.json(
        { error: `Unexpected Veo response (missing name): ${JSON.stringify(json)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, operationName });
  } catch (err) {
    console.error('generate-video error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/generate-video/status/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    // Prefer env vars when set; fallback to repo key per project instruction.
    (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')
  );
}

/**
 * GET /api/generate-video/status?operation=models/veo-2.0-generate-001/operations/xxx
 * Returns: { done: false } | { done: true, videoUrl }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationName = searchParams.get('operation') || '';

    if (!operationName) {
      return NextResponse.json({ error: 'Missing operation' }, { status: 400 });
    }

    const apiKey = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

    const res = await fetch(url, {
      headers: {
        'x-goog-api-key': apiKey
      }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Operation poll failed (${res.status} ${res.statusText}). ${text}` },
        { status: 502 }
      );
    }

    const json = await res.json();

    if (json?.error) {
      return NextResponse.json({ error: json.error }, { status: 502 });
    }

    if (json?.done !== true) {
      return NextResponse.json({ done: false });
    }

    const videoUri =
      json?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

    if (!videoUri) {
      return NextResponse.json(
        { done: true, error: 'Operation completed but video URI missing' },
        { status: 502 }
      );
    }

    // Return a temporary download link. (No proxying needed.)
    const videoUrl = videoUri.includes('?')
      ? `${videoUri}&alt=media`
      : `${videoUri}?alt=media`;

    return NextResponse.json({ done: true, videoUrl });
  } catch (err) {
    console.error('generate-video status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/health/route.ts

```ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: Date.now() });
}

```

# app/api/image-proxy/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';

export const runtime = 'nodejs';

// 1x1 transparent PNG
const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X9d8AAAAASUVORK5CYII=';
const TRANSPARENT_PNG = Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((x) => Number.parseInt(x, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;

  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local / metadata
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 0) return true; // 0.0.0.0/8 (invalid/non-routable)

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1') return true; // loopback
  if (normalized.startsWith('fe80:')) return true; // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local fc00::/7
  return false;
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must be http/https');
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  if (!hostname) throw new Error('Invalid hostname');

  // Basic hostname blocks
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Blocked host');
  }
  if (hostname === 'metadata.google.internal') {
    throw new Error('Blocked host');
  }

  // If hostname is an IP literal, validate directly
  const ipType = net.isIP(hostname);
  if (ipType === 4 && isPrivateIPv4(hostname)) throw new Error('Blocked IP');
  if (ipType === 6 && isPrivateIPv6(hostname)) throw new Error('Blocked IP');

  // Otherwise DNS resolve and validate all returned A/AAAA records
  if (ipType === 0) {
    const addrs = await dns.lookup(hostname, { all: true, verbatim: true });
    if (addrs.length === 0) throw new Error('DNS lookup failed');

    for (const addr of addrs) {
      if (addr.family === 4 && isPrivateIPv4(addr.address)) {
        throw new Error('Blocked IP');
      }
      if (addr.family === 6 && isPrivateIPv6(addr.address)) {
        throw new Error('Blocked IP');
      }
    }
  }

  return parsed;
}

function transparentPngResponse(status = 502) {
  return new NextResponse(TRANSPARENT_PNG, {
    status,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  let target: URL;
  try {
    target = await assertSafeUrl(urlParam);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid url param';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'marketing-tool-image-proxy/1.0',
        Accept: 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!upstream.ok || !upstream.body) {
      return transparentPngResponse(502);
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Keep it simple/safe: do not cache; upstream URLs can be volatile.
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return transparentPngResponse(502);
  } finally {
    clearTimeout(timeout);
  }
}

```

# app/api/images/[filename]/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IMAGES_DIR = '/app/data/images';

function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

export async function GET(_req: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;

    // Prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(IMAGES_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(safeName),
        'Content-Length': buffer.length.toString(),
        // Reasonable caching; images are content-addressed by random UUID
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('images GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/keyword-research/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { saveContent } from '@/lib/db';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { planId, appName, category } = await req.json();

    if (!planId || !appName) {
      return NextResponse.json({ error: 'planId and appName are required' }, { status: 400 });
    }

    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: 'PERPLEXITY_API_KEY not configured' }, { status: 500 });
    }

    const prompt = `You are an ASO/SEO keyword research expert. For the app "${appName}"${category ? ` in the "${category}" category` : ''}, provide keyword research data.

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "keywords": [
    { "keyword": "example keyword", "volume": 5000, "difficulty": 45, "relevance": 90 }
  ],
  "longTail": [
    { "keyword": "long tail example keyword", "volume": 500, "difficulty": 20, "relevance": 85 }
  ],
  "suggestions": "Brief strategic suggestions for keyword targeting."
}

Provide 10-15 main keywords and 8-12 long-tail keywords. Volume is estimated monthly search volume. Difficulty is 0-100 (higher = harder). Relevance is 0-100 (higher = more relevant to the app).`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a keyword research assistant. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Perplexity API error:', errText);
      return NextResponse.json({ error: 'Failed to fetch keyword data' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response (handle potential markdown fences)
    let jsonStr = content;
    const jsonMatch = content.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse Perplexity response:', content);
      return NextResponse.json({ error: 'Failed to parse keyword data' }, { status: 500 });
    }

    // Ensure structure
    const finalResult = {
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
      longTail: Array.isArray(result.longTail) ? result.longTail : [],
      suggestions: typeof result.suggestions === 'string' ? result.suggestions : '',
    };

    // Save to DB
    saveContent(planId, 'keyword-research', null, JSON.stringify(finalResult));

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error('Keyword research error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/orchestrate-pack/[runId]/retry/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPlan, getRun, updateRun } from '@/lib/db';
import { requireOrchestratorAuth } from '@/lib/auth-guard';
import { guardApiRoute } from '@/lib/api-guard';
import {
  executeOrchestrationRun,
  internalBaseUrl,
  getForwardedInternalAuthHeaders,
  parseRunInputJson,
  type OrchestratePackInput,
} from '@/lib/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const unauthorizedResponse = requireOrchestratorAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/orchestrate-pack/:runId/retry',
    maxRequests: 6,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { runId } = await params;
  const run = getRun(runId);

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const updatedAtMs = run.updated_at ? new Date(run.updated_at + 'Z').getTime() : 0;
  const isStaleRunning =
    run.status === 'running' && updatedAtMs && Date.now() - updatedAtMs > 10 * 60 * 1000;

  if (run.status !== 'failed' && !isStaleRunning) {
    return NextResponse.json(
      {
        error: 'Only failed runs can be retried (or stale running runs)',
        runId,
        status: run.status,
      },
      { status: 400 }
    );
  }

  // Atomic swap: prevent concurrent retries
  const db = getDb();
  const swap = db
    .prepare(
      "UPDATE orchestration_runs SET status = 'running', updated_at = datetime('now') WHERE id = ? AND status IN ('failed','running')"
    )
    .run(runId);

  if (swap.changes === 0) {
    return NextResponse.json({ error: 'Run is already being executed', runId }, { status: 409 });
  }

  let body: Partial<OrchestratePackInput> = {};
  try {
    body = (await request.json()) as Partial<OrchestratePackInput>;
  } catch {
    // Optional body
  }

  const previousInput = parseRunInputJson(run.input_json);
  const mergedInput: OrchestratePackInput = {
    planId: previousInput.planId || run.plan_id,
    goal: typeof body.goal === 'string' ? body.goal : previousInput.goal,
    tone: typeof body.tone === 'string' ? body.tone : previousInput.tone,
    channels: Array.isArray(body.channels)
      ? body.channels.filter((v): v is string => typeof v === 'string')
      : previousInput.channels,
    includeVideo:
      typeof body.includeVideo === 'boolean' ? body.includeVideo : previousInput.includeVideo,
  };

  if (!mergedInput.planId) {
    return NextResponse.json({ error: 'Run input missing planId', runId }, { status: 400 });
  }

  const row = getPlan(mergedInput.planId);
  if (!row) {
    return NextResponse.json({ error: 'Plan not found for run retry', runId }, { status: 404 });
  }

  try {
    const baseUrl = internalBaseUrl();
    const internalAuthHeaders = getForwardedInternalAuthHeaders(request.headers);

    const result = await executeOrchestrationRun({
      runId,
      input: mergedInput,
      internalBaseUrl: baseUrl,
      internalAuthHeaders,
      resumeFromFailed: true,
    });

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      currentStep: result.currentStep,
      lastError: result.lastError,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';

    updateRun(runId, {
      status: 'failed',
      currentStep: null,
      lastError: msg,
    });

    return NextResponse.json(
      {
        error: msg,
        runId,
        status: 'failed',
      },
      { status: 500 }
    );
  }
}

```

# app/api/orchestrate-pack/[runId]/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getRun } from '@/lib/db';
import { requireOrchestratorAuth } from '@/lib/auth-guard';
import {
  normalizeOrchestratePackInput,
  parseRunInputJson,
  parseRunOutputRefsJson,
  parseRunStepsJson,
} from '@/lib/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function toIsoTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stepsIncludeVideo(stepsJson: string): boolean {
  try {
    const parsed = JSON.parse(stepsJson);
    return Array.isArray(parsed) && parsed.some((item) => item?.id === 'generate-video');
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const unauthorizedResponse = requireOrchestratorAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { runId } = await params;
  const run = getRun(runId);

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const parsedInput = parseRunInputJson(run.input_json);
  const normalizedInput = normalizeOrchestratePackInput({
    planId: parsedInput.planId || run.plan_id,
    goal: parsedInput.goal,
    tone: parsedInput.tone,
    channels: parsedInput.channels,
    includeVideo: parsedInput.includeVideo,
  });

  const includeVideo = normalizedInput.includeVideo || stepsIncludeVideo(run.steps_json);
  const steps = parseRunStepsJson(run.steps_json, includeVideo);
  const outputRefs = parseRunOutputRefsJson(run.output_refs_json);

  return NextResponse.json({
    runId: run.id,
    planId: run.plan_id,
    status: run.status,
    currentStep: run.current_step,
    lastError: run.last_error,
    steps,
    outputRefs,
    createdAt: toIsoTimestamp(run.created_at),
    updatedAt: toIsoTimestamp(run.updated_at),
  });
}

```

# app/api/orchestrate-pack/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createRun, getPlan, updateRun } from '@/lib/db';
import { requireOrchestratorAuth } from '@/lib/auth-guard';
import { guardApiRoute } from '@/lib/api-guard';
import {
  buildInitialSteps,
  executeOrchestrationRun,
  internalBaseUrl,
  getForwardedInternalAuthHeaders,
  normalizeOrchestratePackInput,
  type OrchestratePackInput,
} from '@/lib/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const unauthorizedResponse = requireOrchestratorAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/orchestrate-pack',
    maxRequests: 6,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let runId: string | null = null;

  try {
    const body = (await request.json()) as Partial<OrchestratePackInput>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const normalizedInput = normalizeOrchestratePackInput({
      planId,
      goal: typeof body.goal === 'string' ? body.goal : undefined,
      tone: typeof body.tone === 'string' ? body.tone : undefined,
      channels: Array.isArray(body.channels)
        ? body.channels.filter((v): v is string => typeof v === 'string')
        : undefined,
      includeVideo: Boolean(body.includeVideo),
    });

    const run = createRun({
      planId,
      status: 'running',
      currentStep: null,
      stepsJson: JSON.stringify(buildInitialSteps(normalizedInput.includeVideo)),
      inputJson: JSON.stringify(normalizedInput),
      outputRefsJson: '{}',
      lastError: null,
    });

    runId = run.id;

    const baseUrl = internalBaseUrl();
    const internalAuthHeaders = getForwardedInternalAuthHeaders(request.headers);

    const result = await executeOrchestrationRun({
      runId,
      input: normalizedInput,
      internalBaseUrl: baseUrl,
      internalAuthHeaders,
    });

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      currentStep: result.currentStep,
      lastError: result.lastError,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';

    if (runId) {
      updateRun(runId, {
        status: 'failed',
        currentStep: null,
        lastError: msg,
      });
    }

    return NextResponse.json(
      {
        error: msg,
        runId,
        status: 'failed',
      },
      { status: 500 }
    );
  }
}

```

# app/api/plans/[id]/content/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getAllContent } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = getPlan(id);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const content = getAllContent(id);
    return NextResponse.json({ planId: id, content });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch plan content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/plans/[id]/overview/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getDb } from '@/lib/db';

export interface SectionStatus {
  hasContent: boolean;
  preview: string;
}

export interface OverviewResponse {
  plan: {
    id: string;
    config: {
      app_name: string;
      app_url: string;
      one_liner: string;
      app_type: string;
      category: string;
      pricing: string;
      distribution_channels: string[];
      icon?: string;
    };
    generated: string;
    stages: Record<string, string>;
    createdAt: string;
    updatedAt: string;
  };
  sections: Record<string, SectionStatus>;
  socialPostsCount: number;
  scheduleCount: number;
  wordCount: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = getPlan(id);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const db = getDb();

    // Get all plan_content types for this plan
    const contentRows = db
      .prepare('SELECT content_type FROM plan_content WHERE plan_id = ?')
      .all(id) as { content_type: string }[];
    const contentTypes = new Set(contentRows.map((r) => r.content_type));

    // Count social posts (table created lazily by post-to-buffer)
    let socialPostsCount = 0;
    try {
      const tableExists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='social_posts'")
        .get();
      if (tableExists) {
        const socialResult = db
          .prepare('SELECT COUNT(*) as count FROM social_posts WHERE plan_id = ?')
          .get(id) as { count: number } | undefined;
        socialPostsCount = socialResult?.count ?? 0;
      }
    } catch {
      // Table doesn't exist yet — that's fine
    }

    // Count scheduled (non-cancelled) items
    const scheduleResult = db
      .prepare(
        "SELECT COUNT(*) as count FROM content_schedule WHERE plan_id = ? AND status != 'cancelled'"
      )
      .get(id) as { count: number } | undefined;
    const scheduleCount = scheduleResult?.count ?? 0;

    // Parse stored JSON
    const stages = JSON.parse(row.stages || '{}') as Record<string, string>;
    const config = JSON.parse(row.config) as {
      app_name: string;
      app_url: string;
      one_liner: string;
      app_type: string;
      category: string;
      pricing: string;
      distribution_channels: string[];
      icon?: string;
    };

    const hasStage = (key: string) =>
      typeof stages[key] === 'string' && stages[key].trim().length > 0;

    const stagePreview = (key: string) =>
      hasStage(key) ? stages[key].slice(0, 120).replace(/\n+/g, ' ').trim() : '';

    // Section status map
    const sections: Record<string, SectionStatus> = {
      brief: {
        hasContent: !!(row.generated?.trim()),
        preview: row.generated?.slice(0, 120).replace(/\n+/g, ' ').trim() || '',
      },
      foundation: {
        hasContent:
          hasStage('foundation') ||
          contentTypes.has('brand-voice') ||
          contentTypes.has('positioning'),
        preview: stagePreview('foundation'),
      },
      draft: {
        hasContent: contentTypes.has('draft') || hasStage('structure'),
        preview: stagePreview('structure'),
      },
      copy: {
        hasContent: hasStage('assets') || contentTypes.has('variant-scores'),
        preview: stagePreview('assets'),
      },
      templates: {
        hasContent: hasStage('assets'),
        preview: stagePreview('assets'),
      },
      keywords: {
        hasContent: contentTypes.has('keyword-research'),
        preview: '',
      },
      distribute: {
        hasContent: hasStage('distribution') || contentTypes.has('atoms'),
        preview: stagePreview('distribution'),
      },
      emails: {
        hasContent: contentTypes.has('emails'),
        preview: '',
      },
      social: {
        hasContent: socialPostsCount > 0,
        preview: socialPostsCount > 0 ? `${socialPostsCount} post${socialPostsCount !== 1 ? 's' : ''} generated` : '',
      },
      schedule: {
        hasContent: scheduleCount > 0,
        preview: scheduleCount > 0 ? `${scheduleCount} item${scheduleCount !== 1 ? 's' : ''} scheduled` : '',
      },
      translate: {
        hasContent: contentTypes.has('translations'),
        preview: '',
      },
      serp: {
        hasContent: !!(config.app_url && config.one_liner),
        preview: config.app_url || '',
      },
    };

    // Approximate word count of the main generated field
    const wordCount = row.generated
      ? row.generated.split(/\s+/).filter(Boolean).length
      : 0;

    const response: OverviewResponse = {
      plan: {
        id: row.id,
        config,
        generated: row.generated,
        stages,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      sections,
      socialPostsCount,
      scheduleCount,
      wordCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch overview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/plans/[id]/performance-summary/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getScheduleItemsForPlan } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const items = getScheduleItemsForPlan(id);

    const rated = items.filter((i) => i.performance_rating);
    const unrated = items.filter((i) => !i.performance_rating);

    const dist = { great: 0, good: 0, ok: 0, poor: 0 };
    for (const item of rated) {
      if (item.performance_rating && item.performance_rating in dist) {
        dist[item.performance_rating as keyof typeof dist]++;
      }
    }

    const platformGreat: Record<string, number> = {};
    for (const item of rated.filter((i) => i.performance_rating === 'great')) {
      platformGreat[item.platform] = (platformGreat[item.platform] || 0) + 1;
    }

    const bestPlatform =
      Object.entries(platformGreat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        rated: rated.length,
        unrated: unrated.length,
        distribution: dist,
        bestPlatform,
      },
    });
  } catch (err) {
    console.error('performance-summary GET error:', err);
    return NextResponse.json(
      { error: 'Failed to load performance summary' },
      { status: 500 }
    );
  }
}

```

# app/api/plans/[id]/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, deletePlan } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = getPlan(id);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    const plan = {
      id: row.id,
      config: JSON.parse(row.config),
      scraped: JSON.parse(row.scraped),
      generated: row.generated,
      stages: JSON.parse(row.stages),
      createdAt: row.created_at,
      shareToken: row.share_token || null,
    };
    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deletePlan(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/plans/[id]/share/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createShareToken, removeShareToken, getPlan } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const token = createShareToken(id);
  return NextResponse.json({ shareUrl: `/shared/${token}`, token });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  removeShareToken(id);
  return NextResponse.json({ ok: true });
}

```

# app/api/plans/[id]/templates/[templateId]/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const { id, templateId } = await params;
    const plan = getPlan(id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | { content?: unknown }
      | null;

    const content = typeof body?.content === 'string' ? body.content : null;
    if (!content) {
      return NextResponse.json({ error: 'Missing template content' }, { status: 400 });
    }

    // Persist in plan_content so templates survive refresh + share links.
    saveContent(id, 'templates', templateId, content);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/plans/[id]/templates/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getContent, saveContent } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = getPlan(id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const rows = getContent(id, 'templates') as Array<{ contentKey: string | null; content: unknown }>;
    const templates: Record<string, string> = {};

    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (typeof r?.contentKey !== 'string') continue;
        if (typeof r?.content !== 'string') continue;
        templates[r.contentKey] = r.content;
      }
    }

    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = getPlan(id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | { templates?: unknown }
      | null;

    if (!body || typeof body.templates !== 'object' || body.templates === null) {
      return NextResponse.json({ error: 'Missing templates payload' }, { status: 400 });
    }

    const templates = body.templates as Record<string, unknown>;

    let saved = 0;
    for (const [templateId, content] of Object.entries(templates)) {
      if (!templateId) continue;
      if (typeof content !== 'string' || !content) continue;
      saveContent(id, 'templates', templateId, content);
      saved++;
    }

    return NextResponse.json({ success: true, saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


```

# app/api/plans/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllPlans, savePlan } from '@/lib/db';
import { MarketingPlan } from '@/lib/types';

export async function GET() {
  try {
    const rows = getAllPlans();
    const plans = rows.map((row) => ({
      id: row.id,
      config: JSON.parse(row.config),
      scraped: JSON.parse(row.scraped),
      generated: row.generated,
      stages: JSON.parse(row.stages),
      createdAt: row.created_at,
    }));
    return NextResponse.json(plans);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch plans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const plan = (await request.json()) as MarketingPlan;

    if (!plan.id || !plan.config || !plan.generated) {
      return NextResponse.json({ error: 'Invalid plan data' }, { status: 400 });
    }

    savePlan(plan);
    return NextResponse.json({ success: true, id: plan.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/positioning-angles/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/positioning-angles',
    maxRequests: 12,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const systemPrompt = `You are a direct-response positioning strategist.

Generate 3-5 positioning angles for THIS product using these frameworks:
1) The Specialist — position as the go-to for a specific niche
2) The Speed Advantage — emphasise time savings or quick results
3) The Anti-[Category] — position against the bloated/complex incumbents
4) The Methodology — a unique process or approach that creates trust
5) The Results-First — lead with concrete outcomes

Rules:
- Ground every angle in evidence from the plan and scraped copy.
- If competitors are listed, factor them into anti-positioning.
- Hooks and headlines must feel specific to THIS product, not template-y.

Output MUST be valid JSON matching this exact shape:
{
  "angles": [
    {
      "name": "The [X] Angle",
      "hook": "one-liner hook",
      "psychology": "why this works",
      "headlineDirections": ["headline 1", "headline 2", "headline 3"],
      "bestFor": "where to use (landing page / ads / social / etc)"
    }
  ],
  "antiPositioning": {
    "whatWeAreNot": ["not X", "not Y"],
    "whyItMatters": "explanation"
  },
  "recommendedPrimary": "angle name"
}

Constraints:
- 3-5 angles, each meaningfully different.
- 3 headlineDirections per angle.
- recommendedPrimary must exactly match one angle name.
- Avoid unverifiable claims.`;

    const userContent = `APP CONTEXT:\n${JSON.stringify(appContext)}\n\nSCRAPED INFO:\n${JSON.stringify(scraped)}\n\nPLAN STAGES:\n${JSON.stringify(stages)}\n\nFULL PLAN:\n${row.generated}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      const cleaned = text.replace(/^\`\`\`(?:json)?\s*\n?/i, '').replace(/\n?\`\`\`\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {
          return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
        }
      } else {
        return NextResponse.json({ error: 'Model returned invalid JSON. Please try again.' }, { status: 502 });
      }
    }

    saveContent(planId, 'positioning', null, JSON.stringify(parsed));

    // Persist the generated positioning
    updatePlanContent(planId, 'positioning', parsed);

    return NextResponse.json({ positioning: parsed, metadata: { model: 'gemini-2.5-flash' } });
  } catch (err) {
    console.error('positioning-angles error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/post-to-buffer/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface PostToBufferRequest {
  planId: string;
  platform: 'instagram' | 'tiktok';
  caption: string;
  hashtags?: string[];
  mediaUrl?: string; // optional image/video URL
  imageFilename?: string; // optional filename returned by /api/generate-post-image
  publishNow?: boolean; // true = post immediately, false = add to queue
}

// Zapier MCP endpoint for Buffer
const ZAPIER_MCP_URL = 'https://mcp.zapier.com/api/v1/connect';
const ZAPIER_TOKEN = process.env.ZAPIER_MCP_TOKEN || '';

// Public base URL for Buffer to fetch attachments from
function getPublicBaseUrl(request: NextRequest) {
  return process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PostToBufferRequest>;

    if (!body.caption) {
      return NextResponse.json({ error: 'Missing caption' }, { status: 400 });
    }

    if (!ZAPIER_TOKEN) {
      return NextResponse.json({ error: 'ZAPIER_MCP_TOKEN not configured' }, { status: 500 });
    }

    const platform = body.platform || 'instagram';
    const hashtags = body.hashtags || [];
    const fullText = hashtags.length > 0
      ? `${body.caption}\n\n${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`
      : body.caption;

    const method = body.publishNow ? 'now' : 'queue';

    const publicBaseUrl = getPublicBaseUrl(request);

    // Prefer imageFilename (served via our /api/images route) over raw mediaUrl
    const attachmentUrl = body.imageFilename
      ? `${publicBaseUrl}/api/images/${encodeURIComponent(body.imageFilename)}`
      : (body.mediaUrl || null);

    // Build instructions for Buffer via Zapier
    const channelInstruction = platform === 'instagram'
      ? 'Post to the Instagram channel'
      : 'Post to the TikTok channel';

    const zapierPayload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'buffer_add_to_queue',
        arguments: {
          instructions: `${channelInstruction}. Method: ${method}.`,
          output_hint: 'confirmation that the post was queued or sent, including any post ID or URL',
          text: fullText,
          method: method === 'now' ? 'Share Now' : 'Add to Queue',
          ...(attachmentUrl ? { attachment: attachmentUrl } : {}),
        },
      },
    };

    const zapierResponse = await fetch(`${ZAPIER_MCP_URL}?token=${ZAPIER_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(zapierPayload),
    });

    const responseText = await zapierResponse.text();

    // Parse SSE response - look for the result
    let result: unknown = null;
    const lines = responseText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.result) {
            result = parsed.result;
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }

    // If not SSE, try direct JSON
    if (!result) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { raw: responseText.slice(0, 500) };
      }
    }

    // Log to DB for tracking
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO social_posts (plan_id, platform, caption, hashtags, media_url, method, buffer_response, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      body.planId || null,
      platform,
      body.caption,
      JSON.stringify(hashtags),
      attachmentUrl,
      method,
      JSON.stringify(result),
      zapierResponse.ok ? 'queued' : 'failed'
    );

    return NextResponse.json({
      success: zapierResponse.ok,
      platform,
      method,
      attachmentUrl,
      bufferStatus: zapierResponse.status,
      result,
    });
  } catch (err) {
    console.error('post-to-buffer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: list posted content history
export async function GET() {
  try {
    const db = getDb();

    const posts = db.prepare('SELECT * FROM social_posts ORDER BY created_at DESC LIMIT 50').all();
    return NextResponse.json({ posts });
  } catch (err) {
    console.error('social-posts GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/process-schedule/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Process scheduled posts that are due.
 * Called by external cron. Idempotent — marks as 'generating' before processing.
 *
 * POST /api/process-schedule
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Atomically claim due posts
    const due = db.prepare(
      "SELECT * FROM content_schedule WHERE scheduled_at <= ? AND status = 'scheduled'"
    ).all(now) as Array<Record<string, string>>;

    if (due.length === 0) {
      return NextResponse.json({ processed: 0, results: [] });
    }

    // Mark all as generating
    const ids = due.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(
      `UPDATE content_schedule SET status = 'generating', updated_at = datetime('now') WHERE id IN (${placeholders})`
    ).run(...ids);

    const results: Array<{ id: string; status: string; error?: string }> = [];
    const origin = request.nextUrl.origin;

    for (const item of due) {
      try {
        const res = await fetch(`${origin}/api/auto-publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.API_KEY || '',
          },
          body: JSON.stringify({
            planId: item.plan_id,
            platform: item.platform,
            contentType: item.content_type,
            topic: item.topic || undefined,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          db.prepare(
            "UPDATE content_schedule SET status = 'posted', post_id = ?, updated_at = datetime('now') WHERE id = ?"
          ).run(data.postId || null, item.id);
          results.push({ id: item.id, status: 'posted' });
        } else {
          const errMsg = data.error || `HTTP ${res.status}`;
          db.prepare(
            "UPDATE content_schedule SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?"
          ).run(errMsg, item.id);
          results.push({ id: item.id, status: 'failed', error: errMsg });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        db.prepare(
          "UPDATE content_schedule SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(errMsg, item.id);
        results.push({ id: item.id, status: 'failed', error: errMsg });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error('process-schedule error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/render-png/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';

// Concurrency limiter: max 3 concurrent renders
let activeRenders = 0;
const MAX_CONCURRENT = 3;

export async function POST(request: NextRequest) {
  if (activeRenders >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: 'Too many concurrent renders. Please try again shortly.' },
      { status: 429 }
    );
  }

  activeRenders++;
  try {
    const body = await request.json();
    const { html, width, height } = body as {
      html: string;
      width: number;
      height: number;
    };

    if (!html || !width || !height) {
      return NextResponse.json(
        { error: 'Missing required fields: html, width, height' },
        { status: 400 }
      );
    }

    if (width > 4000 || height > 4000) {
      return NextResponse.json(
        { error: 'Dimensions too large (max 4000px)' },
        { status: 400 }
      );
    }

    let chromium;
    try {
      const pw = await import('playwright-core');
      chromium = pw.chromium;
    } catch {
      return NextResponse.json(
        {
          error:
            'Playwright is not installed. Run: npm install playwright-core && npx playwright-core install chromium',
        },
        { status: 500 }
      );
    }

    const browser = await chromium.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const context = await browser.newContext({
        viewport: { width, height },
      });
      const page = await context.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      const screenshot = await page.screenshot({
        type: 'png',
        timeout: 10000,
      });

      await context.close();

      return new NextResponse(new Uint8Array(screenshot), {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'attachment; filename="asset.png"',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to render PNG';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    activeRenders--;
  }
}

```

# app/api/render-zip/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';

interface AssetInput {
  html: string;
  width: number;
  height: number;
  filename: string;
}

// Concurrency limiter shared concept — zip can use up to 3 sequential renders
let activeZipRenders = 0;
const MAX_CONCURRENT_ZIP = 1; // Only 1 zip job at a time

export async function POST(request: NextRequest) {
  if (activeZipRenders >= MAX_CONCURRENT_ZIP) {
    return NextResponse.json(
      { error: 'A ZIP render is already in progress. Please try again shortly.' },
      { status: 429 }
    );
  }

  activeZipRenders++;
  try {
    const body = await request.json();
    const { assets } = body as { assets: AssetInput[] };

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: assets (non-empty array)' },
        { status: 400 }
      );
    }

    if (assets.length > 10) {
      return NextResponse.json(
        { error: 'Too many assets (max 10)' },
        { status: 400 }
      );
    }

    for (const asset of assets) {
      if (!asset.html || !asset.width || !asset.height || !asset.filename) {
        return NextResponse.json(
          { error: 'Each asset needs: html, width, height, filename' },
          { status: 400 }
        );
      }
      if (asset.width > 4000 || asset.height > 4000) {
        return NextResponse.json(
          { error: `Dimensions too large for ${asset.filename} (max 4000px)` },
          { status: 400 }
        );
      }
    }

    let chromium;
    try {
      const pw = await import('playwright-core');
      chromium = pw.chromium;
    } catch {
      return NextResponse.json(
        {
          error:
            'Playwright is not installed. Run: npm install playwright-core && npx playwright-core install chromium',
        },
        { status: 500 }
      );
    }

    const browser = await chromium.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      // Render all assets to PNG buffers
      const pngBuffers: { filename: string; buffer: Buffer }[] = [];

      for (const asset of assets) {
        const context = await browser.newContext({
          viewport: { width: asset.width, height: asset.height },
        });
        const page = await context.newPage();

        await page.setContent(asset.html, {
          waitUntil: 'networkidle',
          timeout: 10000,
        });

        const screenshot = await page.screenshot({
          type: 'png',
          timeout: 10000,
        });

        pngBuffers.push({
          filename: asset.filename.endsWith('.png')
            ? asset.filename
            : `${asset.filename}.png`,
          buffer: Buffer.from(screenshot),
        });

        await context.close();
      }

      // Create ZIP using archiver
      const passthrough = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 6 } });

      const chunks: Buffer[] = [];
      passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));

      const finishPromise = new Promise<Buffer>((resolve, reject) => {
        passthrough.on('end', () => resolve(Buffer.concat(chunks)));
        passthrough.on('error', reject);
        archive.on('error', reject);
      });

      archive.pipe(passthrough);

      for (const { filename, buffer } of pngBuffers) {
        archive.append(Readable.from(buffer), { name: filename });
      }

      await archive.finalize();
      const zipBuffer = await finishPromise;

      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="marketing-assets.zip"',
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to render ZIP';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    activeZipRenders--;
  }
}

```

# app/api/review-monitor/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getDb } from '@/lib/db';

/**
 * Review Monitor — automated review checking + sentiment + response suggestions
 * 
 * POST /api/review-monitor
 * { planId: string }
 * 
 * This is the "set and forget" endpoint. It:
 * 1. Scrapes latest reviews
 * 2. Compares against previously seen reviews
 * 3. Analyses sentiment on new ones
 * 4. Generates response suggestions for negative reviews
 * 5. Returns a summary + any alerts
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = body.planId;
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const appUrl = config.app_url || '';
    
    if (!appUrl) {
      return NextResponse.json({ error: 'No app URL in plan config' }, { status: 400 });
    }

    // Ensure review_snapshots table exists
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS review_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL,
        reviews TEXT NOT NULL,
        sentiment TEXT,
        alerts TEXT,
        response_suggestions TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Step 1: Scrape reviews via our own API
    const baseUrl = request.nextUrl.origin;
    const scrapeRes = await fetch(`${baseUrl}/api/scrape-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });

    if (!scrapeRes.ok) {
      const err = await scrapeRes.json().catch(() => ({}));
      return NextResponse.json({ 
        error: 'Failed to scrape reviews', 
        detail: err 
      }, { status: 502 });
    }

    const scrapeData = await scrapeRes.json();
    const reviews = scrapeData.reviews || [];

    if (reviews.length === 0) {
      return NextResponse.json({
        status: 'no_reviews',
        message: 'No reviews found to monitor',
      });
    }

    // Step 2: Get previous snapshot to find new reviews
    const prevSnapshot = db.prepare(
      'SELECT reviews FROM review_snapshots WHERE plan_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(planId) as { reviews: string } | undefined;

    let previousReviews: Array<{ author: string; title: string }> = [];
    if (prevSnapshot) {
      try {
        previousReviews = JSON.parse(prevSnapshot.reviews);
      } catch { /* ignore */ }
    }

    const prevKeys = new Set(previousReviews.map(r => `${r.author}::${r.title}`));
    const newReviews = reviews.filter((r: { author: string; title: string }) => 
      !prevKeys.has(`${r.author}::${r.title}`)
    );

    // Step 3: Analyse sentiment via our API
    const sentimentRes = await fetch(`${baseUrl}/api/review-sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });

    let sentiment = null;
    if (sentimentRes.ok) {
      sentiment = await sentimentRes.json();
    }

    // Step 4: Generate response suggestions for negative reviews (≤ 3 stars)
    const negativeReviews = reviews.filter((r: { rating: number }) => r.rating <= 3);
    let responseSuggestions: Array<{ review: string; suggestedResponse: string }> = [];

    if (negativeReviews.length > 0) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const prompt = `You are a customer support specialist for ${config.app_name || 'this app'}. 
Generate professional, empathetic responses for these negative reviews. Be helpful and solution-oriented.

Return valid JSON array:
[{ "reviewTitle": "string", "suggestedResponse": "string" }]

Reviews:
${negativeReviews.map((r: { title: string; body: string; rating: number }) => 
  `- "${r.title}" (${r.rating}★): ${r.body}`
).join('\n')}`;

        try {
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              responseSuggestions = JSON.parse(text);
            }
          }
        } catch { /* continue without suggestions */ }
      }
    }

    // Step 5: Build alerts
    const alerts: string[] = [];
    
    if (newReviews.length > 0) {
      alerts.push(`${newReviews.length} new review(s) since last check`);
    }
    
    if (negativeReviews.length > 0) {
      alerts.push(`${negativeReviews.length} negative review(s) (≤3★) need attention`);
    }

    const avgRating = reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length;
    if (avgRating < 4.0) {
      alerts.push(`Average rating is ${avgRating.toFixed(1)}★ — below 4.0 threshold`);
    }

    // Step 6: Save snapshot
    db.prepare(`
      INSERT INTO review_snapshots (plan_id, reviews, sentiment, alerts, response_suggestions)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      planId,
      JSON.stringify(reviews),
      JSON.stringify(sentiment),
      JSON.stringify(alerts),
      JSON.stringify(responseSuggestions)
    );

    return NextResponse.json({
      status: alerts.length > 0 ? 'attention_needed' : 'all_clear',
      summary: {
        totalReviews: reviews.length,
        newReviews: newReviews.length,
        negativeReviews: negativeReviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
      },
      alerts,
      newReviews: newReviews.slice(0, 10),
      sentiment: sentiment?.analysis || null,
      responseSuggestions,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('review-monitor error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: review monitoring history
export async function GET(request: NextRequest) {
  try {
    const planId = request.nextUrl.searchParams.get('planId');
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS review_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL,
        reviews TEXT NOT NULL,
        sentiment TEXT,
        alerts TEXT,
        response_suggestions TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    const snapshots = db.prepare(
      'SELECT id, alerts, created_at FROM review_snapshots WHERE plan_id = ? ORDER BY created_at DESC LIMIT 20'
    ).all(planId);

    return NextResponse.json({ snapshots });
  } catch (err) {
    console.error('review-monitor GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/review-sentiment/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';

type Review = {
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
};

type SentimentResult = {
  sentiment: { positive: number; neutral: number; negative: number };
  themes: Array<{ topic: string; count: number; sentiment: 'positive' | 'neutral' | 'negative' }>
  summary: string;
};

function safeJsonParse(text: string): unknown {
  const cleaned = text.replace(/^\`\`\`(?:json)?\s*\n?/i, '').replace(/\n?\`\`\`\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Model returned invalid JSON');
    return JSON.parse(m[0]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const reviews = Array.isArray(body.reviews) ? (body.reviews as Review[]) : [];

    if (!planId) return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    if (!reviews.length) return NextResponse.json({ error: 'Missing "reviews"' }, { status: 400 });

    const row = getPlan(planId);
    if (!row) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const config = JSON.parse(row.config || '{}');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a product marketing analyst.

Analyze the sentiment and themes in these App Store reviews.

Output MUST be valid JSON in exactly this shape:
{
  "sentiment": { "positive": 0, "neutral": 0, "negative": 0 },
  "themes": [
    { "topic": "topic label", "count": 0, "sentiment": "positive" }
  ],
  "summary": "2-4 sentences"
}

Rules:
- positive/neutral/negative are percentages that sum to 100 (integers).
- themes: 5-10 themes max. topic should be short (2-5 words). count is the number of reviews mentioning it.
- sentiment for each theme is one of: positive|neutral|negative.
- summary should be plain English, concrete, and reference what users actually said.
- Do NOT output markdown. JSON only.`;

    const userContent = `APP: ${config?.app_name || 'Unknown'}\n\nREVIEWS (JSON):\n${JSON.stringify(
      reviews.slice(0, 40).map((r) => ({
        author: r.author,
        rating: r.rating,
        title: r.title,
        body: r.body,
        date: r.date,
      })),
      null,
      2
    )}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: 'Unexpected response from Gemini.' }, { status: 502 });
    }

    const parsed = safeJsonParse(text) as SentimentResult;

    // Basic sanity
    const sentiment = parsed?.sentiment;
    const themes = Array.isArray(parsed?.themes) ? parsed.themes : [];
    const summary = typeof parsed?.summary === 'string' ? parsed.summary : '';

    const result: SentimentResult = {
      sentiment: {
        positive: Number.isFinite(sentiment?.positive) ? Math.round(sentiment.positive) : 0,
        neutral: Number.isFinite(sentiment?.neutral) ? Math.round(sentiment.neutral) : 0,
        negative: Number.isFinite(sentiment?.negative) ? Math.round(sentiment.negative) : 0,
      },
      themes: themes
        .filter(Boolean)
        .slice(0, 10)
        .map((t: Record<string, unknown>) => ({
          topic: typeof t.topic === 'string' ? t.topic : 'Theme',
          count: Number.isFinite(Number(t.count)) ? Number(t.count) : 0,
          sentiment:
            t.sentiment === 'positive' || t.sentiment === 'neutral' || t.sentiment === 'negative'
              ? t.sentiment
              : 'neutral',
        })),
      summary,
    };

    // Persist to plan_content
    saveContent(planId, 'review-sentiment', null, JSON.stringify({
      ...result,
      metadata: {
        model: 'gemini-2.5-flash',
        reviewCount: reviews.length,
        generatedAt: new Date().toISOString(),
      },
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('review-sentiment error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/score-variants/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';

type VariantScore = {
  text: string;
  clarity: number;
  emotion: number;
  urgency: number;
  uniqueness: number;
  overall: number;
  feedback: string;
};

type ScoreVariantsResult = {
  scores: VariantScore[];
  winner: number; // index into scores
};

function clampScore(n: unknown): number {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.max(1, Math.min(10, Math.round(num)));
}

function computeWinner(scores: VariantScore[]): number {
  if (scores.length === 0) return -1;
  let bestIdx = 0;
  let best = scores[0]?.overall ?? 0;
  for (let i = 1; i < scores.length; i++) {
    const v = scores[i]?.overall ?? 0;
    if (v > best) {
      best = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const planId = typeof body?.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const variantsRaw = Array.isArray(body?.variants) ? body.variants : null;
    if (!variantsRaw) {
      return NextResponse.json({ error: 'Missing "variants" (string[])' }, { status: 400 });
    }

    const variants: string[] = (variantsRaw as unknown[])
      .filter((v: unknown): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (variants.length < 2 || variants.length > 5) {
      return NextResponse.json(
        { error: 'Provide between 2 and 5 non-empty variants.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are an expert direct-response copy chief.

Score EACH copy variant (marketing headline/body) on a 1-10 scale for:
- clarity: instantly understandable, no confusion
- emotion: evokes feeling / desire / pain
- urgency: creates immediate motivation to act
- uniqueness: differentiated, memorable, not generic
- overall: holistic effectiveness as marketing copy

Return ONLY valid JSON in this exact shape:
{
  "scores": [
    {
      "text": "<exact variant text>",
      "clarity": 1,
      "emotion": 1,
      "urgency": 1,
      "uniqueness": 1,
      "overall": 1,
      "feedback": "1-2 sentences: why it scored this way + 1 improvement suggestion"
    }
  ],
  "winner": 0
}

Rules:
- scores must be the same length as the input variants.
- Keep the same order as input.
- "text" must match the input variant exactly.
- winner is the index (0-based) of the strongest overall variant.`;

    let appName = '';
    try {
      const cfg = JSON.parse(row.config || '{}');
      appName = typeof cfg?.app_name === 'string' ? cfg.app_name : '';
    } catch {
      appName = '';
    }

    const userContent = `PLAN CONTEXT (optional):\nApp name: ${appName}\n\nVARIANTS (in order):\n${variants.map((v, i) => `${i + 1}. ${v}`).join('\n\n')}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      const cleaned = text.replace(/^\`\`\`(?:json)?\s*\n?/i, '').replace(/\n?\`\`\`\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const obj = parsed as Partial<ScoreVariantsResult>;
    const scoresRaw = Array.isArray(obj?.scores) ? obj.scores : [];

    const scores: VariantScore[] = scoresRaw.slice(0, variants.length).map((s, idx: number) => {
      const row = s as Partial<VariantScore> | undefined;
      const safeText = typeof row?.text === 'string' ? row.text : variants[idx];
      return {
        text: safeText,
        clarity: clampScore(row?.clarity),
        emotion: clampScore(row?.emotion),
        urgency: clampScore(row?.urgency),
        uniqueness: clampScore(row?.uniqueness),
        overall: clampScore(row?.overall),
        feedback: typeof row?.feedback === 'string' ? row.feedback : '',
      };
    });

    // Ensure we have exactly one score object per variant.
    while (scores.length < variants.length) {
      scores.push({
        text: variants[scores.length],
        clarity: 1,
        emotion: 1,
        urgency: 1,
        uniqueness: 1,
        overall: 1,
        feedback: '',
      });
    }

    // Prefer model winner if valid, otherwise compute.
    const winnerFromModel = typeof obj?.winner === 'number' && Number.isInteger(obj.winner) ? obj.winner : -1;
    const winner = winnerFromModel >= 0 && winnerFromModel < scores.length ? winnerFromModel : computeWinner(scores);

    const result: ScoreVariantsResult = { scores, winner };

    // Persist snapshot
    saveContent(planId, 'variant-scores', null, JSON.stringify(result));

    return NextResponse.json(result);
  } catch (err) {
    console.error('score-variants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

```

# app/api/scrape-play-store/parser.ts

```ts
export type PlayStoreScrapeResult = {
  name: string;
  oneLiner: string;
  description: string;
  category: string;
  source: 'playstore';
  url: string;
  icon?: string;
  screenshots: string[];
  rating?: number;
  ratingCount?: number;
  pricing: string;
  developer?: string;
  features: string[];
  keywords: string[];
  whatsNew?: string;
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstMatch(re: RegExp, text: string): string | undefined {
  const m = re.exec(text);
  if (!m) return undefined;
  return m[1];
}

function safeJsonParse<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const key = s.trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function normalizePricing(price: unknown): string {
  if (price == null) return 'Unknown';
  if (typeof price === 'number') return price === 0 ? 'Free' : String(price);
  if (typeof price === 'string') {
    const p = price.trim();
    if (p === '0' || p.toLowerCase() === '0.00') return 'Free';
    if (p.toLowerCase() === 'free') return 'Free';
    return p || 'Unknown';
  }
  return 'Unknown';
}

type LdJson = Record<string, unknown>;
type SoftwareApplicationLike = {
  name?: unknown;
  author?: { name?: unknown } | unknown;
  publisher?: { name?: unknown } | unknown;
  brand?: { name?: unknown } | unknown;
  description?: unknown;
  aggregateRating?: { ratingValue?: unknown; ratingCount?: unknown; reviewCount?: unknown } | unknown;
  applicationCategory?: unknown;
  genre?: unknown;
  offers?: { price?: unknown; lowPrice?: unknown; highPrice?: unknown } | unknown;
  image?: unknown;
  screenshot?: unknown;
};

function extractLdJsonBlocks(html: string): LdJson[] {
  const blocks: LdJson[] = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    const decoded = decodeHtmlEntities(raw);
    const parsed = safeJsonParse<unknown>(decoded);
    if (!parsed) continue;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === 'object') blocks.push(item as LdJson);
      }
    } else if (parsed && typeof parsed === 'object') {
      blocks.push(parsed as LdJson);
    }
  }
  return blocks;
}

function pickSoftwareApplication(blocks: LdJson[]): LdJson | undefined {
  // Prefer SoftwareApplication / MobileApplication blocks.
  const preferred = blocks.find(
    (b) => b['@type'] === 'SoftwareApplication' || b['@type'] === 'MobileApplication'
  );
  return preferred ?? blocks[0];
}

function extractMetaContent(html: string, attr: string, value: string): string | undefined {
  // Example: <meta property="og:image" content="...">
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i'
  );
  const match = firstMatch(re, html);
  return match ? decodeHtmlEntities(match) : undefined;
}

function extractAllPlayImages(html: string): string[] {
  const matches = html.match(/https:\/\/play-lh\.googleusercontent\.com\/[^"'\s)<>]+/g) ?? [];
  const cleaned = matches.map((u) => decodeHtmlEntities(u));
  return uniq(cleaned);
}

function deriveOneLiner(description: string): string {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return sentence.length <= 140 ? sentence : `${sentence.slice(0, 137).trim()}...`;
}

export function parsePlayStoreHtml(url: string, html: string): PlayStoreScrapeResult {
  const ldBlocks = extractLdJsonBlocks(html);
  const app = (pickSoftwareApplication(ldBlocks) ?? {}) as SoftwareApplicationLike;
  const authorName =
    app.author && typeof app.author === 'object' && 'name' in app.author && typeof (app.author as { name?: unknown }).name === 'string'
      ? (app.author as { name: string }).name.trim()
      : '';
  const publisherName =
    app.publisher && typeof app.publisher === 'object' && 'name' in app.publisher && typeof (app.publisher as { name?: unknown }).name === 'string'
      ? (app.publisher as { name: string }).name.trim()
      : '';
  const brandName =
    app.brand && typeof app.brand === 'object' && 'name' in app.brand && typeof (app.brand as { name?: unknown }).name === 'string'
      ? (app.brand as { name: string }).name.trim()
      : '';
  const aggregate =
    app.aggregateRating && typeof app.aggregateRating === 'object'
      ? (app.aggregateRating as { ratingValue?: unknown; ratingCount?: unknown; reviewCount?: unknown })
      : {};
  const offersObj =
    app.offers && typeof app.offers === 'object'
      ? (app.offers as { price?: unknown; lowPrice?: unknown; highPrice?: unknown })
      : {};

  const name: string =
    (typeof app.name === 'string' && app.name.trim()) ||
    decodeHtmlEntities(firstMatch(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html) ?? '') ||
    '';

  const developer: string | undefined =
    authorName ||
    publisherName ||
    brandName ||
    extractMetaContent(html, 'name', 'author');

  const descriptionFromLd = typeof app.description === 'string' ? decodeHtmlEntities(app.description) : undefined;
  const descriptionFromMeta = extractMetaContent(html, 'name', 'description');
  const description = stripTags(decodeHtmlEntities(descriptionFromLd ?? descriptionFromMeta ?? '')).trim();

  const rating: number | undefined =
    typeof aggregate.ratingValue === 'number'
      ? aggregate.ratingValue
      : typeof aggregate.ratingValue === 'string'
        ? Number(aggregate.ratingValue)
        : undefined;

  const ratingCount: number | undefined =
    typeof aggregate.ratingCount === 'number'
      ? aggregate.ratingCount
      : typeof aggregate.ratingCount === 'string'
        ? Number(aggregate.ratingCount)
        : typeof aggregate.reviewCount === 'number'
          ? aggregate.reviewCount
          : typeof aggregate.reviewCount === 'string'
            ? Number(aggregate.reviewCount)
            : undefined;

  const category: string =
    (typeof app.applicationCategory === 'string' && app.applicationCategory.trim()) ||
    (typeof app.genre === 'string' && app.genre.trim()) ||
    (extractMetaContent(html, 'itemprop', 'genre') ?? '').trim() ||
    (extractMetaContent(html, 'property', 'og:category') ?? '').trim() ||
    'Unknown';

  // Pricing
  const price = offersObj.price ?? offersObj.lowPrice ?? offersObj.highPrice;
  const pricing = normalizePricing(price);

  // Icon
  const iconFromLd =
    typeof app.image === 'string'
      ? decodeHtmlEntities(app.image)
      : Array.isArray(app.image)
        ? (app.image.find((x: unknown): x is string => typeof x === 'string') as string | undefined)
        : undefined;
  const iconFromMeta = extractMetaContent(html, 'property', 'og:image') ?? extractMetaContent(html, 'name', 'twitter:image');
  const icon = iconFromMeta ?? iconFromLd;

  // Screenshots
  const screenshotsFromLd: string[] = Array.isArray(app.screenshot)
    ? app.screenshot.filter((x: unknown): x is string => typeof x === 'string').map((x: string) => decodeHtmlEntities(x))
    : typeof app.screenshot === 'string'
      ? [decodeHtmlEntities(app.screenshot)]
      : [];

  const allImages = extractAllPlayImages(html);
  const screenshotsFallback = allImages
    .filter((u) => !icon || u !== icon)
    // Heuristic: screenshots are often wider; keep ones with "=w" or "=s" sizing params.
    .filter((u) => /=[sw]\d+/i.test(u) || /\bw\d+\b/i.test(u))
    .slice(0, 10);

  const screenshots = uniq([...screenshotsFromLd, ...screenshotsFallback]).slice(0, 10);

  // What's new / recent changes (best-effort)
  const recentChangesRaw =
    firstMatch(/"recentChanges"\s*:\s*"([^"]+)"/i, html) ||
    firstMatch(/"whatsNew"\s*:\s*"([^"]+)"/i, html);
  const whatsNew = recentChangesRaw ? stripTags(decodeHtmlEntities(recentChangesRaw)).trim() : undefined;

  const oneLiner = deriveOneLiner(description);

  return {
    name: name || 'Unknown',
    oneLiner,
    description,
    category,
    source: 'playstore',
    url,
    icon,
    screenshots,
    rating: Number.isFinite(rating) ? rating : undefined,
    ratingCount: Number.isFinite(ratingCount) ? ratingCount : undefined,
    pricing,
    developer,
    features: [],
    keywords: [],
    ...(whatsNew ? { whatsNew } : {}),
  };
}

```

# app/api/scrape-play-store/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { parsePlayStoreHtml } from './parser';

function isValidPlayStoreUrl(input: string): boolean {
  try {
    const u = new URL(input);
    if (u.hostname !== 'play.google.com') return false;
    if (!u.pathname.startsWith('/store/apps/details')) return false;
    const id = u.searchParams.get('id');
    return !!id && /^[a-zA-Z0-9._]+$/.test(id);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = (await request.json()) as { url?: unknown };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isValidPlayStoreUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid Google Play Store URL. Expected https://play.google.com/store/apps/details?id=...' },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      // Play Store can be picky; send a browser-ish UA.
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Play Store page (HTTP ${res.status})` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const parsed = parsePlayStoreHtml(url, html);

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scrape Play Store URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/scrape-reviews/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

type Review = {
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
};

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(input: string): string {
  // Minimal entity decoding (good enough for App Store content)
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseAppStoreReviewsFromHtml(html: string): {
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number | null;
} {
  const reviews: Review[] = [];

  // Attempt to parse review articles (Apple uses we-customer-review blocks)
  const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
  for (const a of articles) {
    if (!/we-customer-review/i.test(a)) continue;

    const authorMatch = a.match(/we-customer-review__user[^>]*>\s*([^<]+?)\s*</i);
    const titleMatch = a.match(/we-customer-review__title[^>]*>\s*([^<]+?)\s*</i);

    const timeMatch = a.match(/<time[^>]*datetime="([^"]+)"/i);

    // rating is frequently present as aria-label="4 out of 5"
    const ratingMatch = a.match(/aria-label="\s*([0-5])\s*out of\s*5\s*"/i);

    // body: try typical container
    let body = '';
    const bodyBlockMatch = a.match(/we-customer-review__body[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (bodyBlockMatch?.[1]) body = stripHtml(bodyBlockMatch[1]);

    // Fallback body parse
    if (!body) {
      const pMatch = a.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch?.[1]) body = stripHtml(pMatch[1]);
    }

    const author = decodeEntities((authorMatch?.[1] || '').trim());
    const title = decodeEntities((titleMatch?.[1] || '').trim());
    const date = (timeMatch?.[1] || '').trim();
    const rating = ratingMatch?.[1] ? Number(ratingMatch[1]) : NaN;

    if (!author && !title && !body) continue;

    reviews.push({
      author: author || 'Anonymous',
      rating: Number.isFinite(rating) ? rating : 0,
      title: title || '(No title)',
      body: decodeEntities(body || ''),
      date: date || '',
    });

    if (reviews.length >= 12) break;
  }

  // Average rating
  let averageRating: number | null = null;
  const avgMatch = html.match(/"averageRating"\s*:\s*([0-9]+\.?[0-9]*)/i);
  if (avgMatch?.[1]) averageRating = Number(avgMatch[1]);

  if (averageRating === null) {
    const ariaAvg = html.match(/aria-label="\s*([0-9]+\.?[0-9]*)\s*out of\s*5\s*"/i);
    if (ariaAvg?.[1]) averageRating = Number(ariaAvg[1]);
  }

  // Total ratings/reviews count
  let totalReviews: number | null = null;
  const countMatch = html.match(/"ratingCount"\s*:\s*(\d+)/i);
  if (countMatch?.[1]) totalReviews = Number(countMatch[1]);

  if (totalReviews === null) {
    const textCount = html.match(/([0-9][0-9,\.]+)\s+(?:Ratings|reviews|Reviews)/i);
    if (textCount?.[1]) {
      const n = Number(textCount[1].replace(/[,\.]/g, ''));
      if (Number.isFinite(n)) totalReviews = n;
    }
  }

  return { reviews, averageRating, totalReviews };
}

async function perplexityFallback(appStoreUrl: string): Promise<{
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number | null;
}> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const prompt = `You are gathering evidence for marketing research.

Task: Find recent user reviews for the iOS App Store listing at this URL:
${appStoreUrl}

Return ONLY valid JSON in this exact shape:
{
  "reviews": [
    {"author":"","rating":0,"title":"","body":"","date":""}
  ],
  "averageRating": 0,
  "totalReviews": 0
}

Rules:
- Provide 8-15 reviews if possible.
- rating must be an integer 1-5.
- date should be an ISO date string when possible (YYYY-MM-DD).
- If author/title unavailable, use "Anonymous" and "(No title)".
- Keep body concise but faithful (no paraphrase if you can quote).
- If you cannot find exact numbers for averageRating/totalReviews, set them to null.`;

  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a careful researcher. Output JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error('Perplexity error:', r.status, t);
    throw new Error(`Perplexity API error (${r.status})`);
  }

  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error('Unexpected Perplexity response');
  }

  const cleaned = text.replace(/^\`\`\`(?:json)?\s*\n?/i, '').replace(/\n?\`\`\`\s*$/i, '').trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Perplexity returned invalid JSON');
    parsed = JSON.parse(m[0]);
  }

  const reviews: Review[] = Array.isArray(parsed?.reviews)
    ? parsed.reviews
        .filter(Boolean)
        .slice(0, 20)
        .map((rv: Record<string, unknown>) => ({
          author: typeof rv.author === 'string' && rv.author.trim() ? rv.author.trim() : 'Anonymous',
          rating: Number.isFinite(Number(rv.rating)) ? Math.max(1, Math.min(5, Number(rv.rating))) : 0,
          title: typeof rv.title === 'string' && rv.title.trim() ? rv.title.trim() : '(No title)',
          body: typeof rv.body === 'string' ? rv.body.trim() : '',
          date: typeof rv.date === 'string' ? rv.date.trim() : '',
        }))
    : [];

  const averageRating = typeof parsed?.averageRating === 'number' ? parsed.averageRating : null;
  const totalReviews = typeof parsed?.totalReviews === 'number' ? parsed.totalReviews : null;

  return { reviews, averageRating, totalReviews };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const appStoreUrl = typeof body.appStoreUrl === 'string' ? body.appStoreUrl : '';

    if (!planId) return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    if (!appStoreUrl) return NextResponse.json({ error: 'Missing "appStoreUrl"' }, { status: 400 });

    const row = getPlan(planId);
    if (!row) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const url = appStoreUrl;

    let html = '';
    try {
      const r = await fetch(url, {
        headers: {
          // App Store is picky; a UA helps
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
      });

      if (r.ok) html = await r.text();
      else console.warn('App Store fetch failed:', r.status);
    } catch (e) {
      console.warn('App Store fetch error:', e);
    }

    let parsed = html ? parseAppStoreReviewsFromHtml(html) : { reviews: [], averageRating: null, totalReviews: null };

    // If parsing produced nothing useful, fall back to Perplexity research
    if (!parsed.reviews?.length) {
      parsed = await perplexityFallback(appStoreUrl);
    }

    const reviews = (parsed.reviews || []).map((r) => ({
      author: r.author || 'Anonymous',
      rating: Number.isFinite(r.rating) ? r.rating : 0,
      title: r.title || '(No title)',
      body: r.body || '',
      date: r.date || '',
    }));

    const avgFromReviews = reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
      : 0;

    const averageRating = typeof parsed.averageRating === 'number' ? parsed.averageRating : avgFromReviews;
    const totalReviews = typeof parsed.totalReviews === 'number' ? parsed.totalReviews : reviews.length;

    return NextResponse.json({ reviews, averageRating, totalReviews });
  } catch (err) {
    console.error('scrape-reviews error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/scrape/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalise URL — prepend https:// if no protocol given (e.g. www.lightscout.ai)
    const normalizedUrl = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const result = await scrapeUrl(normalizedUrl);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scrape URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

# app/api/shared/[token]/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlanByShareToken } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const row = getPlanByShareToken(token);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    config: JSON.parse(row.config),
    generated: row.generated,
    stages: JSON.parse(row.stages),
  });
}

```

# app/api/weekly-digest/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPlan, saveContent } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface WeeklyDigestRequest {
  planId: string;
}

export interface WeeklyDigest {
  summary: string;
  contentCreated: Array<{
    type: string;
    key: string | null;
    description: string;
    updatedAt?: string;
  }>;
  recommendations: Array<{ title: string; detail: string }>;
  nextActions: Array<{ action: string; why: string; priority: 'high' | 'medium' | 'low' }>;
  generatedAt: string;
  competitiveLandscape?: string;
}

function parseGeminiJson(text: string): unknown {
  let cleaned = text
    .replace(/^\`\`\`(?:json)?\s*\n?/i, '')
    .replace(/\n?\`\`\`\s*$/i, '')
    .trim();

  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    cleaned = '{' + cleaned + '}';
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error('No JSON found');
    return JSON.parse(objMatch[0]);
  }
}

function truncate(s: string, max = 8000): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n…(truncated, ${s.length - max} chars omitted)`;
}

function asStringOrEmpty(x: unknown): string {
  return typeof x === 'string' ? x : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<WeeklyDigestRequest>;
    const planId = typeof body.planId === 'string' ? body.planId : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const db = getDb();

    // Last 7 days of activity (best-effort definition of "this period")
    const recentRows = db
      .prepare(
        `SELECT content_type, content_key, content, created_at, updated_at
         FROM plan_content
         WHERE plan_id = ?
           AND datetime(updated_at) >= datetime('now', '-7 days')
         ORDER BY datetime(updated_at) DESC`
      )
      .all(planId) as Array<{
      content_type: string;
      content_key: string | null;
      content: string;
      created_at: string;
      updated_at: string;
    }>;

    const allRows = db
      .prepare(
        `SELECT content_type, content_key, content, created_at, updated_at
         FROM plan_content
         WHERE plan_id = ?
         ORDER BY content_type, content_key`
      )
      .all(planId) as Array<{
      content_type: string;
      content_key: string | null;
      content: string;
      created_at: string;
      updated_at: string;
    }>;

    const config = (() => {
      try {
        return JSON.parse(row.config || '{}');
      } catch {
        return {};
      }
    })();

    const scraped = (() => {
      try {
        return JSON.parse(row.scraped || '{}');
      } catch {
        return {};
      }
    })();

    const stages = (() => {
      try {
        return JSON.parse(row.stages || '{}');
      } catch {
        return {};
      }
    })();

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const toPromptRow = (r: {
      content_type: string;
      content_key: string | null;
      content: string;
      created_at: string;
      updated_at: string;
    }) => {
      let parsed: unknown = r.content;
      try {
        parsed = JSON.parse(r.content);
      } catch {
        // keep string
      }

      let preview: string;
      if (typeof parsed === 'string') preview = parsed;
      else preview = JSON.stringify(parsed);

      return {
        type: r.content_type,
        key: r.content_key,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        preview: truncate(preview, 2500),
      };
    };

    const recentForPrompt = recentRows.slice(0, 40).map(toPromptRow);
    const indexForPrompt = allRows
      .slice(0, 120)
      .map((r) => ({ type: r.content_type, key: r.content_key, updatedAt: r.updated_at }));

    const hasCompetitiveIntel = allRows.some(
      (r) => r.content_type === 'competitive-intel' || r.content_type === 'competitive-analysis'
    );

    const systemPrompt = `You are a senior marketing strategist.\n\nGenerate a WEEKLY marketing digest for the plan.\n\nOutput rules:\n- Output MUST be valid JSON only (no markdown, no commentary).\n- Return an object with exactly this shape:\n  {\n    \"summary\": string,\n    \"contentCreated\": [{\"type\": string, \"key\": string|null, \"description\": string, \"updatedAt\"?: string }],\n    \"recommendations\": [{\"title\": string, \"detail\": string}],\n    \"nextActions\": [{\"action\": string, \"why\": string, \"priority\": \"high\"|\"medium\"|\"low\"}],\n    \"generatedAt\": string (ISO8601),\n    \"competitiveLandscape\"?: string\n  }\n\nDigest requirements:\n- Summarise what content was created/updated in the last 7 days, based on the provided recent activity.\n- Provide 4-8 actionable recommendations. Be specific and grounded in the plan context.\n- Provide 4-10 next actions, prioritised.\n- If competitive intel exists, include a competitiveLandscape summary; otherwise omit it.\n- Avoid unverifiable claims and avoid inventing metrics; if metrics are missing, say what to track next.`;

    const userContent = `APP CONTEXT:\n${truncate(JSON.stringify(appContext), 6000)}\n\nRECENT PLAN CONTENT ACTIVITY (last 7 days, previews):\n${truncate(JSON.stringify(recentForPrompt), 14000)}\n\nALL SAVED CONTENT INDEX (types/keys):\n${truncate(JSON.stringify(indexForPrompt), 8000)}\n\nSCRAPED INFO (may be noisy):\n${truncate(JSON.stringify(scraped), 6000)}\n\nPLAN STAGES (markdown snippets):\n${truncate(JSON.stringify(stages), 6000)}\n\nFULL PLAN MARKDOWN (brief):\n${truncate(asStringOrEmpty(row.generated), 12000)}\n\nNOTES:\ncompetitiveIntelExists=${hasCompetitiveIntel}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = parseGeminiJson(text);
    } catch {
      console.error('Failed to parse Gemini JSON:', text.slice(0, 500));
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;

    const createdRaw: unknown[] = Array.isArray(obj?.contentCreated)
      ? (obj?.contentCreated as unknown[])
      : [];

    const recommendationsRaw: unknown[] = Array.isArray(obj?.recommendations)
      ? (obj?.recommendations as unknown[])
      : [];

    const actionsRaw: unknown[] = Array.isArray(obj?.nextActions)
      ? (obj?.nextActions as unknown[])
      : [];

    const digest: WeeklyDigest = {
      summary: (obj && typeof obj.summary === 'string' ? obj.summary : '').trim(),
      contentCreated: createdRaw
        .map((x) => {
          const r = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
          return {
            type: typeof r.type === 'string' ? r.type : 'unknown',
            key: typeof r.key === 'string' ? r.key : r.key === null ? null : null,
            description: typeof r.description === 'string' ? r.description : '',
            updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
          };
        })
        .filter((x) => x.description.trim().length > 0),
      recommendations: recommendationsRaw
        .map((x) => {
          const r = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
          return {
            title: typeof r.title === 'string' ? r.title : '',
            detail: typeof r.detail === 'string' ? r.detail : '',
          };
        })
        .filter((x) => x.title.trim() && x.detail.trim()),
      nextActions: actionsRaw
        .map((x): { action: string; why: string; priority: 'high' | 'medium' | 'low' } => {
          const r = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
          const p = r.priority;
          const priority: 'high' | 'medium' | 'low' =
            p === 'high' || p === 'medium' || p === 'low' ? (p as 'high' | 'medium' | 'low') : 'medium';
          return {
            action: typeof r.action === 'string' ? r.action : '',
            why: typeof r.why === 'string' ? r.why : '',
            priority,
          };
        })
        .filter((x) => x.action.trim()),
      generatedAt: typeof obj?.generatedAt === 'string' ? obj.generatedAt : new Date().toISOString(),
      competitiveLandscape:
        typeof obj?.competitiveLandscape === 'string' ? obj.competitiveLandscape : undefined,
    };

    if (!digest.summary) {
      digest.summary = 'Weekly digest generated.';
    }

    saveContent(planId, 'weekly-digest', null, JSON.stringify(digest));

    return NextResponse.json({ digest });
  } catch (err) {
    console.error('weekly-digest error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

```

# app/favicon.ico

This is a binary file of the type: Binary

# app/global-error.tsx

```tsx
'use client';

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void _error;
  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}

```

# app/globals.css

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

:root {
  --card: oklch(1 0 0);
  --card-border: #334155;
  --accent: oklch(0.97 0 0);
  --accent-hover: #818cf8;
  --muted: oklch(0.97 0 0);
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--background);
}

::-webkit-scrollbar-thumb {
  background: var(--card-border);
  border-radius: 4px;
}

/* Markdown content styling */
.markdown-content h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  color: var(--foreground);
}

.markdown-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--foreground);
}

.markdown-content h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: var(--accent);
}

.markdown-content p {
  margin-bottom: 0.75rem;
  color: var(--muted-foreground);
  line-height: 1.7;
}

.markdown-content ul {
  list-style: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.markdown-content li {
  color: var(--muted-foreground);
  margin-bottom: 0.25rem;
  line-height: 1.6;
}

.markdown-content blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  color: var(--foreground);
}

.markdown-content strong {
  color: var(--foreground);
  font-weight: 600;
}

.markdown-content code {
  background: rgba(99, 102, 241, 0.15);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.markdown-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.875rem;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid var(--card-border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.markdown-content th {
  background: var(--card);
  font-weight: 600;
  color: var(--foreground);
}

.markdown-content td {
  color: var(--muted-foreground);
}

.markdown-content hr {
  border: none;
  border-top: 1px solid var(--card-border);
  margin: 2rem 0;
}

.markdown-content input[type="checkbox"] {
  margin-right: 0.5rem;
  accent-color: var(--accent);
}

/* Print / PDF export styles */
@media print {
  body {
    background: white;
    color: black;
  }

  nav,
  button,
  a[href*="/assets"],
  .no-print {
    display: none !important;
  }

  .markdown-content h2,
  .markdown-content h3,
  .markdown-content h4,
  .markdown-content strong,
  .markdown-content p,
  .markdown-content li,
  .markdown-content td,
  .markdown-content th,
  .markdown-content blockquote {
    color: black !important;
  }

  .markdown-content table {
    border-color: #ccc;
  }

  .markdown-content th {
    background: #f3f4f6;
  }

  .markdown-content code {
    background: #f3f4f6;
    color: #333;
  }

  .markdown-content blockquote {
    border-left-color: #666;
  }

  /* Expand all collapsible sections */
  [class*="rounded-2xl"] {
    border-color: #ddd !important;
    background: white !important;
  }

  [class*="border-slate"] {
    border-color: #ddd !important;
  }

  * {
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
  }
}

/* P3-5: Page transition animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter {
  animation: fadeIn 200ms ease-out both;
}
```

# app/layout.tsx

```tsx
import type { Metadata } from 'next';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeScript } from '@/components/theme/ThemeScript';

export const metadata: Metadata = {
  title: 'Marketing Tool — Vibe Marketing Brief Generator',
  description:
    'Paste any App Store, Google Play, or website URL and get a complete 5-stage marketing brief powered by the Vibe Marketing methodology. AI-enhanced copy, competitive analysis, and social media assets included.',
  metadataBase: new URL('https://marketing-tool-production.up.railway.app'),
  openGraph: {
    title: 'Marketing Tool — Vibe Marketing Brief Generator',
    description:
      'Paste any app or website URL → get a full marketing brief with AI copy, competitor research, and social assets.',
    type: 'website',
    siteName: 'Marketing Tool',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketing Tool — Vibe Marketing Brief Generator',
    description:
      'Paste any app or website URL → get a full marketing brief with AI copy, competitor research, and social assets.',
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    'marketing brief generator',
    'vibe marketing',
    'app store marketing',
    'AI copywriting',
    'competitive analysis',
    'social media assets',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

```

# app/marketing/page.tsx

```tsx
/**
 * /marketing — redirect to the plan dashboard.
 *
 * This route was referenced in navigation and QA docs but never existed.
 * Minimal fix: hard-redirect to /dashboard so users land somewhere useful.
 */
import { redirect } from 'next/navigation';

export default function MarketingPage() {
  redirect('/dashboard');
}

```

# app/not-found.tsx

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-xl bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-400 mb-6">
          The page you’re looking for doesn’t exist (or may have moved).
        </p>
        <Button asChild className="h-auto font-semibold px-5 py-3">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}

```

# app/plan/[id]/approvals/page.tsx

```tsx
'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePlan } from '@/hooks/usePlan';
import { PageSkeleton } from '@/components/Skeleton';
import DismissableTip from '@/components/DismissableTip';

type ApprovalQueueStatus = 'pending' | 'approved' | 'rejected';

type ApprovalItem = {
  id: string;
  plan_id: string;
  section_type: string;
  section_label: string;
  content: string;
  status: ApprovalQueueStatus;
  edited_content: string | null;
  created_at: string;
  updated_at: string;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

function badgeClasses(status: ApprovalQueueStatus) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200';
    case 'rejected':
      return 'bg-red-500/15 border-red-500/30 text-red-200';
    case 'pending':
    default:
      return 'bg-amber-500/15 border-amber-500/30 text-amber-200';
  }
}

export default function ApprovalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const { plan, loading: planLoading, error: planError, reload: loadPlan } = usePlan(id);

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState('');

  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState({
    sectionType: 'draft:professional',
    sectionLabel: 'app_store_description',
    content: '',
  });

  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = () => {
    setLoadingQueue(true);
    setQueueError('');
    fetch(`/api/approval-queue?planId=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load queue');
        return res.json();
      })
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
        setStats(data?.stats || { total: 0, pending: 0, approved: 0, rejected: 0 });
      })
      .catch((err) => setQueueError(err instanceof Error ? err.message : 'Failed to load queue'))
      .finally(() => setLoadingQueue(false));
  };

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sortedItems = useMemo(() => {
    const order: Record<ApprovalQueueStatus, number> = { pending: 0, rejected: 1, approved: 2 };
    return [...items].sort((a, b) => {
      const d = order[a.status] - order[b.status];
      if (d !== 0) return d;
      return (b.updated_at || '').localeCompare(a.updated_at || '');
    });
  }, [items]);

  const post = async (payload: object) => {
    const res = await fetch('/api/approval-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Request failed');
    return data;
  };

  const handleCreate = async () => {
    if (!newItem.content.trim()) {
      toastError('Please add some content');
      return;
    }

    setCreating(true);
    try {
      await post({
        action: 'add',
        planId: id,
        sectionType: newItem.sectionType,
        sectionLabel: newItem.sectionLabel,
        content: newItem.content,
      });
      setNewItem((p) => ({ ...p, content: '' }));
      toastSuccess('Added to queue');
      loadQueue();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to add item');
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (itemId: string, status: 'approved' | 'rejected') => {
    setBusyId(itemId);
    try {
      await post({ action: status === 'approved' ? 'approve' : 'reject', id: itemId });
      toastSuccess(status === 'approved' ? 'Approved' : 'Rejected');
      loadQueue();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveEdit = async (item: ApprovalItem) => {
    const value = editDraft[item.id] ?? (item.edited_content ?? item.content);
    setBusyId(item.id);
    try {
      await post({ action: 'update', id: item.id, editedContent: value });
      setEditing((p) => ({ ...p, [item.id]: false }));
      toastSuccess('Saved');
      loadQueue();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;
    setBusyId(itemId);
    try {
      await post({ action: 'delete', id: itemId });
      toastSuccess('Deleted');
      loadQueue();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setBusyId(null);
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
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <DismissableTip id="approvals-tip">Review and approve AI-generated content before it goes live — edit any section inline or regenerate it before adding to your posting queue.</DismissableTip>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">✅ Approvals</h1>
          <p className="text-slate-400">Approve, reject, and edit content before export.</p>
        </div>
        <Button
          onClick={loadQueue}
          variant="secondary"
          className="h-auto px-4 py-2.5"
        >
          ↻ Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Total</div>
          <div className="text-2xl font-semibold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Pending</div>
          <div className="text-2xl font-semibold text-amber-200 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Approved</div>
          <div className="text-2xl font-semibold text-emerald-200 mt-1">{stats.approved}</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Rejected</div>
          <div className="text-2xl font-semibold text-red-200 mt-1">{stats.rejected}</div>
        </div>
      </div>

      {/* Create */}
      <div className="bg-slate-800/30 border border-slate-700/60 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold text-white">Add to approval queue</div>
            <div className="text-xs text-slate-500">Tip: use sectionType like draft:professional, draft:bold, translation:es, etc.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <Label className="block text-xs text-slate-400 mb-1">Section type</Label>
            <Input
              value={newItem.sectionType}
              onChange={(e) => setNewItem((p) => ({ ...p, sectionType: e.target.value }))}
              className="bg-slate-950/40 border-slate-700/60 text-slate-200 focus-visible:ring-indigo-500/40"
            />
          </div>
          <div>
            <Label className="block text-xs text-slate-400 mb-1">Section label</Label>
            <Input
              value={newItem.sectionLabel}
              onChange={(e) => setNewItem((p) => ({ ...p, sectionLabel: e.target.value }))}
              className="bg-slate-950/40 border-slate-700/60 text-slate-200 focus-visible:ring-indigo-500/40"
            />
          </div>
        </div>

        <div className="mt-4">
          <Label className="block text-xs text-slate-400 mb-1">Content</Label>
          <Textarea
            value={newItem.content}
            onChange={(e) => setNewItem((p) => ({ ...p, content: e.target.value }))}
            placeholder="Paste generated content here…"
            className="min-h-[110px] bg-slate-950/40 border-slate-700/60 p-3 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500/40"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="h-auto px-5 py-2.5 disabled:bg-indigo-600/50"
          >
            {creating ? 'Adding…' : '➕ Add'}
          </Button>
        </div>
      </div>

      {/* Queue */}
      {queueError && (
        <div className="mb-6">
          <ErrorRetry error={queueError} onRetry={loadQueue} />
        </div>
      )}

      {loadingQueue ? (
        <div className="text-slate-400">Loading queue…</div>
      ) : sortedItems.length === 0 ? (
        <div className="bg-slate-900/20 border border-slate-700/40 rounded-2xl p-8 text-center text-slate-400">
          No items yet. Add content above, then approve it for export.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedItems.map((item) => {
            const isEditing = !!editing[item.id];
            const displayValue = (item.edited_content ?? item.content) || '';
            const currentEditValue = editDraft[item.id] ?? displayValue;
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl overflow-hidden border bg-slate-800/30 border-slate-700/60"
              >
                <div className="p-4 border-b border-slate-700/40 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-white truncate">{item.section_label}</div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${badgeClasses(item.status)}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs text-slate-500">{item.section_type}</span>
                    </div>
                    {item.edited_content && (
                      <div className="text-xs text-slate-500 mt-1">Edited version set</div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      onClick={() => handleApprove(item.id, 'approved')}
                      disabled={isBusy}
                      variant="ghost"
                      size="sm"
                      className="h-auto bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-100 px-3 py-1.5 rounded-lg"
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      onClick={() => handleApprove(item.id, 'rejected')}
                      disabled={isBusy}
                      variant="ghost"
                      size="sm"
                      className="h-auto bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-100 px-3 py-1.5 rounded-lg"
                    >
                      ✕ Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setEditing((p) => ({ ...p, [item.id]: !p[item.id] }));
                        setEditDraft((p) => ({ ...p, [item.id]: displayValue }));
                      }}
                      disabled={isBusy}
                      variant="secondary"
                      size="sm"
                      className="h-auto text-slate-200 px-3 py-1.5 rounded-lg"
                    >
                      {isEditing ? 'Close' : '✏️ Edit'}
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      disabled={isBusy}
                      variant="secondary"
                      size="sm"
                      className="h-auto text-slate-200 px-3 py-1.5 rounded-lg"
                      title="Delete"
                    >
                      🗑
                    </Button>
                  </div>
                </div>

                <div className="p-4">
                  {isEditing ? (
                    <>
                      <Textarea
                        value={currentEditValue}
                        onChange={(e) => setEditDraft((p) => ({ ...p, [item.id]: e.target.value }))}
                        className="min-h-[140px] bg-slate-950/40 border-slate-700/50 p-3 text-slate-200 focus-visible:ring-indigo-500/40"
                      />
                      <div className="flex justify-between items-center gap-3 mt-3 flex-wrap">
                        <Button
                          onClick={async () => {
                            await navigator.clipboard.writeText(currentEditValue);
                            toastSuccess('Copied');
                          }}
                          variant="secondary"
                          size="sm"
                          className="h-auto text-slate-200 px-3 py-1.5 rounded-lg"
                        >
                          📋 Copy
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setEditing((p) => ({ ...p, [item.id]: false }));
                              setEditDraft((p) => ({ ...p, [item.id]: displayValue }));
                            }}
                            disabled={isBusy}
                            variant="secondary"
                            size="sm"
                            className="h-auto text-slate-200 px-3 py-1.5 rounded-lg"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleSaveEdit(item)}
                            disabled={isBusy}
                            size="sm"
                            className="h-auto px-3 py-1.5 rounded-lg"
                          >
                            {isBusy ? 'Saving…' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-200 whitespace-pre-wrap break-words">
                      {displayValue || <span className="text-slate-500">(Empty)</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Export only includes approved items (plus brief/assets).
      </div>
    </div>
  );
}

```

# app/plan/[id]/assets/page.tsx

```tsx
'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import Link from 'next/link';
import { GeneratedAsset, AssetConfig } from '@/lib/types';
import {
  generateSocialTemplates,
  type SocialPlatform,
  type SocialStyle,
} from '@/lib/socialTemplates';
import { usePlan } from '@/hooks/usePlan';
import DismissableTip from '@/components/DismissableTip';

type CompositeDevice = 'iphone-15' | 'iphone-15-pro' | 'android';

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className || 'h-4 w-4'}`}
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function AssetPreview({ asset }: { asset: GeneratedAsset }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [renderingPng, setRenderingPng] = useState(false);
  const [renderError, setRenderError] = useState('');

  const handleDownloadHtml = () => {
    const blob = new Blob([asset.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.type}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(asset.html);
  };

  const handleDownloadPng = async () => {
    setRenderingPng(true);
    setRenderError('');
    try {
      const res = await fetch('/api/render-png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: asset.html,
          width: asset.width,
          height: asset.height,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Render failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asset.type}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setRenderError(
        err instanceof Error ? err.message : 'Failed to render PNG'
      );
    } finally {
      setRenderingPng(false);
    }
  };

  // Scale to fit container
  const scale = Math.min(1, 600 / asset.width);
  const scaledHeight = asset.height * scale;

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">{asset.label}</h3>
            <p className="text-xs text-slate-500">
              {asset.width}×{asset.height}px
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopyHtml}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              📋 Copy HTML
            </button>
            <button
              onClick={handleDownloadHtml}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              📄 HTML
            </button>
            <button
              onClick={handleDownloadPng}
              disabled={renderingPng}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {renderingPng ? (
                <>
                  <Spinner className="h-3 w-3" />
                  Rendering…
                </>
              ) : (
                '⬇️ Download PNG'
              )}
            </button>
          </div>
        </div>
        {renderError && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {renderError}
          </div>
        )}
      </div>
      <div
        className="p-4 bg-slate-900/50 flex justify-center"
        style={{ minHeight: scaledHeight + 16 }}
      >
        <div
          style={{
            width: asset.width,
            height: asset.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={asset.html}
            width={asset.width}
            height={asset.height}
            style={{ border: 'none', borderRadius: '8px' }}
            sandbox="allow-same-origin"
            title={asset.label}
          />
        </div>
      </div>
    </div>
  );
}

type ComposerItem = {
  id: string;
  imageUrl: string;
  imageBase64?: string;
  headline: string;
  subheadline: string;
  badge: string;
  previewUrl?: string;
  loading?: boolean;
  error?: string;
};

function ScreenshotCompositorSection({
  planId,
  appName,
}: {
  planId: string;
  appName: string;
}) {
  const [device, setDevice] = useState<CompositeDevice>('iphone-15-pro');
  const [background, setBackground] = useState(
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  );
  const [textColor, setTextColor] = useState('#ffffff');

  const [items, setItems] = useState<ComposerItem[]>(() => [
    {
      id: crypto.randomUUID(),
      imageUrl: '',
      headline: 'Your headline here',
      subheadline: '',
      badge: '',
    },
  ]);

  const [generatingAll, setGeneratingAll] = useState(false);
  const [generateAllError, setGenerateAllError] = useState('');

  useEffect(() => {
    return () => {
      // revoke previews on unmount
      items.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<ComposerItem>) => {
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          if (patch.previewUrl && i.previewUrl && i.previewUrl !== patch.previewUrl) {
            URL.revokeObjectURL(i.previewUrl);
          }
          return { ...i, ...patch };
        })
      );
    },
    []
  );

  const handlePickFile = async (id: string, file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    updateItem(id, {
      imageBase64: dataUrl,
      imageUrl: '',
      error: '',
    });
  };

  const handlePreview = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    updateItem(id, { loading: true, error: '' });
    try {
      const res = await fetch('/api/composite-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: item.imageUrl || undefined,
          imageBase64: item.imageBase64 || undefined,
          headline: item.headline,
          subheadline: item.subheadline || undefined,
          badge: item.badge || undefined,
          device,
          backgroundColor: background,
          textColor,
          appName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Composite failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      updateItem(id, { previewUrl: url });
    } catch (err) {
      updateItem(id, {
        error: err instanceof Error ? err.message : 'Failed to generate preview',
      });
    } finally {
      updateItem(id, { loading: false });
    }
  };

  const handleDownloadPreview = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item?.previewUrl) return;
    const a = document.createElement('a');
    a.href = item.previewUrl;
    a.download = `composited-${id}.png`;
    a.click();
  };

  const handleGenerateAll = async () => {
    const usable = items.filter((i) => i.headline && (i.imageUrl || i.imageBase64));
    if (usable.length === 0) {
      setGenerateAllError('Add at least one screenshot with a headline and an image.');
      return;
    }

    setGeneratingAll(true);
    setGenerateAllError('');
    try {
      const res = await fetch('/api/composite-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          device,
          backgroundColor: background,
          textColor,
          screenshots: usable.map((s) => ({
            imageUrl: s.imageUrl || undefined,
            imageBase64: s.imageBase64 || undefined,
            headline: s.headline,
            subheadline: s.subheadline || undefined,
            badge: s.badge || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Batch composite failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-screenshots.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setGenerateAllError(
        err instanceof Error ? err.message : 'Failed to generate ZIP'
      );
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mt-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">📱 Screenshot Compositor</h2>
          <p className="text-sm text-slate-400 mt-1">
            Wrap raw app screenshots in a device frame + headline (App Store size: 1290×2796)
          </p>
        </div>
        <button
          onClick={handleGenerateAll}
          disabled={generatingAll}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
        >
          {generatingAll ? (
            <>
              <Spinner className="h-4 w-4" />
              Generating…
            </>
          ) : (
            '📦 Generate All (ZIP)'
          )}
        </button>
      </div>

      {generateAllError && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {generateAllError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <label className="text-xs text-slate-400 flex flex-col gap-2">
          Device
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value as CompositeDevice)}
            className="bg-slate-900/60 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
          >
            <option value="iphone-15">iPhone 15</option>
            <option value="iphone-15-pro">iPhone 15 Pro</option>
            <option value="android">Android</option>
          </select>
        </label>

        <label className="text-xs text-slate-400 flex flex-col gap-2">
          Background (CSS)
          <input
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            className="bg-slate-900/60 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
            placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />
          <span className="text-[11px] text-slate-500">
            Tip: you can paste a CSS gradient or a hex color.
          </span>
        </label>

        <label className="text-xs text-slate-400 flex flex-col gap-2">
          Text color
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <input
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="flex-1 bg-slate-900/60 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
            />
          </div>
        </label>
      </div>

      <div className="mt-6 space-y-6">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="bg-slate-900/40 border border-slate-700/50 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-white">
                  Screenshot {idx + 1}
                </div>
                <div className="text-xs text-slate-500">
                  Provide either an image URL or upload a file.
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(item.id)}
                  disabled={item.loading}
                  className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  {item.loading ? (
                    <>
                      <Spinner className="h-3 w-3" />
                      Rendering…
                    </>
                  ) : (
                    '👀 Preview'
                  )}
                </button>
                <button
                  onClick={() => handleDownloadPreview(item.id)}
                  disabled={!item.previewUrl}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
                >
                  ⬇️ PNG
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Image URL
                  <input
                    value={item.imageUrl}
                    onChange={(e) =>
                      updateItem(item.id, {
                        imageUrl: e.target.value,
                        imageBase64: undefined,
                      })
                    }
                    className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                    placeholder="https://…"
                  />
                </label>

                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Upload file
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePickFile(item.id, file);
                    }}
                    className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                    Badge (optional)
                    <input
                      value={item.badge}
                      onChange={(e) => updateItem(item.id, { badge: e.target.value })}
                      className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                      placeholder="NEW"
                    />
                  </label>
                  <div className="text-xs text-slate-500 flex items-end pb-2">
                    Examples: NEW, FREE, ★ 4.9
                  </div>
                </div>

                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Headline
                  <input
                    value={item.headline}
                    onChange={(e) => updateItem(item.id, { headline: e.target.value })}
                    className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                    placeholder="Track your habits in seconds"
                  />
                </label>

                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Subheadline (optional)
                  <input
                    value={item.subheadline}
                    onChange={(e) =>
                      updateItem(item.id, { subheadline: e.target.value })
                    }
                    className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                    placeholder="Simple. Fast. Beautiful."
                  />
                </label>

                {item.error && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {item.error}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() =>
                      setItems((prev) =>
                        prev.filter((p) => {
                          if (p.id !== item.id) return true;
                          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
                          return false;
                        })
                      )
                    }
                    disabled={items.length <= 1}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    🗑️ Remove
                  </button>
                  <button
                    onClick={() =>
                      setItems((prev) => [
                        ...prev,
                        {
                          id: crypto.randomUUID(),
                          imageUrl: '',
                          headline: 'Another headline',
                          subheadline: '',
                          badge: '',
                        },
                      ])
                    }
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    ➕ Add
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-3 flex items-center justify-center">
                {item.previewUrl ? (
                  // Render at a sensible preview size
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt="Composited preview"
                    className="max-h-[560px] w-auto rounded-xl shadow-xl"
                  />
                ) : (
                  <div className="text-sm text-slate-500 text-center px-6">
                    Click <strong>Preview</strong> to render a PNG.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialTemplatePreview({
  template,
}: {
  template: {
    label: string;
    width: number;
    height: number;
    html: string;
  };
}) {
  const scale = Math.min(1, 360 / template.width);
  const scaledHeight = template.height * scale;

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-semibold text-white text-sm">{template.label}</div>
          <div className="text-[11px] text-slate-500">
            {template.width}×{template.height}
          </div>
        </div>
      </div>
      <div
        className="p-3 bg-slate-900/50 flex justify-center"
        style={{ minHeight: scaledHeight + 12 }}
      >
        <div
          style={{
            width: template.width,
            height: template.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <iframe
            srcDoc={template.html}
            width={template.width}
            height={template.height}
            style={{ border: 'none', borderRadius: '10px' }}
            sandbox="allow-same-origin"
            title={template.label}
          />
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { plan, loading: planLoading } = usePlan(id);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipError, setZipError] = useState('');

  // Color presets
  const [colors, setColors] = useState({
    background: '#0f172a',
    text: '#e2e8f0',
    primary: '#6366f1',
    secondary: '#8b5cf6',
  });

  // Social images
  const ALL_PLATFORMS: { key: SocialPlatform; label: string }[] = [
    { key: 'twitter', label: 'Twitter Card' },
    { key: 'linkedin', label: 'LinkedIn Post' },
    { key: 'instagram-post', label: 'Instagram Post' },
    { key: 'instagram-story', label: 'Instagram Story' },
    { key: 'facebook-og', label: 'Facebook OG' },
  ];

  const [socialPlatforms, setSocialPlatforms] = useState<Record<SocialPlatform, boolean>>({
    twitter: true,
    linkedin: true,
    'instagram-post': true,
    'instagram-story': true,
    'facebook-og': true,
  });
  const [socialStyle, setSocialStyle] = useState<SocialStyle>('gradient');
  const [accentColor, setAccentColor] = useState('#667eea');
  const [socialTemplates, setSocialTemplates] = useState<
    { label: string; width: number; height: number; html: string }[]
  >([]);
  const [downloadingSocialZip, setDownloadingSocialZip] = useState(false);
  const [socialZipError, setSocialZipError] = useState('');

  useEffect(() => {
    if (!plan) return;
    generateAssetsFromPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, colors]);

  useEffect(() => {
    if (!plan) return;
    const selected = (Object.entries(socialPlatforms) as [SocialPlatform, boolean][])
      .filter(([, on]) => on)
      .map(([k]) => k);

    const templates = generateSocialTemplates({
      plan,
      platforms: selected,
      style: socialStyle,
      accentColor,
    }).map((t) => ({
      label: t.label,
      width: t.width,
      height: t.height,
      html: t.html,
    }));

    setSocialTemplates(templates);
  }, [plan, socialPlatforms, socialStyle, accentColor]);

  const generateAssetsFromPlan = async () => {
    if (!plan) return;
    setLoading(true);
    setError('');
    try {
      const config: AssetConfig = {
        name: plan.config.app_name,
        tagline: plan.config.one_liner,
        icon: plan.config.icon || '🚀',
        url: plan.config.app_url,
        features: plan.config.differentiators,
        colors,
      };

      const res = await fetch('/api/generate-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || 'Failed to generate assets');
      setAssets(result.assets);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate assets'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (assets.length === 0) return;
    setDownloadingZip(true);
    setZipError('');
    try {
      const zipAssets = assets.map((a) => ({
        html: a.html,
        width: a.width,
        height: a.height,
        filename: `${a.type}.png`,
      }));

      const res = await fetch('/api/render-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: zipAssets }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Render failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'marketing-assets.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setZipError(
        err instanceof Error ? err.message : 'Failed to render ZIP'
      );
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadSocialPack = async () => {
    setDownloadingSocialZip(true);
    setSocialZipError('');
    try {
      const selected = (Object.entries(socialPlatforms) as [SocialPlatform, boolean][])
        .filter(([, on]) => on)
        .map(([k]) => k);

      if (selected.length === 0) {
        setSocialZipError('Select at least one platform.');
        return;
      }

      const res = await fetch('/api/generate-social-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          platforms: selected,
          style: socialStyle,
          accentColor,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error || 'Failed to generate social pack');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'social-images.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSocialZipError(
        err instanceof Error ? err.message : 'Failed to generate social pack'
      );
    } finally {
      setDownloadingSocialZip(false);
    }
  };

  if (planLoading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 animate-pulse">Loading plan…</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link
          href="/"
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  const COLOR_PRESETS = [
    {
      name: 'Indigo Dark',
      bg: '#0f172a',
      text: '#e2e8f0',
      primary: '#6366f1',
      secondary: '#8b5cf6',
    },
    {
      name: 'Ocean',
      bg: '#0c1222',
      text: '#e0f2fe',
      primary: '#0ea5e9',
      secondary: '#06b6d4',
    },
    {
      name: 'Emerald',
      bg: '#0f1f17',
      text: '#d1fae5',
      primary: '#10b981',
      secondary: '#34d399',
    },
    {
      name: 'Rose',
      bg: '#1a0f16',
      text: '#fce7f3',
      primary: '#f43f5e',
      secondary: '#ec4899',
    },
    {
      name: 'Amber',
      bg: '#1a1508',
      text: '#fef3c7',
      primary: '#f59e0b',
      secondary: '#eab308',
    },
    {
      name: 'Light',
      bg: '#f8fafc',
      text: '#1e293b',
      primary: '#6366f1',
      secondary: '#8b5cf6',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <DismissableTip id="assets-tip">Generate social media graphics and device mockups — download ready-to-post images sized for Instagram, TikTok, and other platforms.</DismissableTip>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">🎨 Visual Assets</h1>
          <p className="text-slate-400">
            {plan.config.app_name} — Marketing visuals
          </p>
        </div>
        {assets.length > 0 && !loading && (
          <button
            onClick={handleDownloadAllZip}
            disabled={downloadingZip}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          >
            {downloadingZip ? (
              <>
                <Spinner className="h-4 w-4" />
                Rendering all…
              </>
            ) : (
              '📦 Download All (ZIP)'
            )}
          </button>
        )}
      </div>

      {/* ZIP error */}
      {zipError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {zipError}
        </div>
      )}

      {/* Color Customization */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-white mb-3">Color Theme</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                setColors({
                  background: preset.bg,
                  text: preset.text,
                  primary: preset.primary,
                  secondary: preset.secondary,
                })
              }
              className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full border border-slate-500"
                style={{
                  background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                }}
              />
              {preset.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {(
            [
              { key: 'background' as const, label: 'Background' },
              { key: 'text' as const, label: 'Text' },
              { key: 'primary' as const, label: 'Primary' },
              { key: 'secondary' as const, label: 'Secondary' },
            ] as const
          ).map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 text-xs text-slate-400"
            >
              <input
                type="color"
                value={colors[key]}
                onChange={(e) =>
                  setColors({ ...colors, [key]: e.target.value })
                }
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Assets */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-slate-400">Generating assets...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {assets.map((asset) => (
            <AssetPreview key={asset.type} asset={asset} />
          ))}
        </div>
      )}

      {/* Screenshot compositor */}
      <ScreenshotCompositorSection planId={id} appName={plan.config.app_name} />

      {/* Social Images */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mt-10 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-white">📣 Social Images</h2>
            <p className="text-sm text-slate-400 mt-1">
              Platform-sized, branded PNGs generated from your plan.
            </p>
          </div>
          <button
            onClick={handleDownloadSocialPack}
            disabled={downloadingSocialZip}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          >
            {downloadingSocialZip ? (
              <>
                <Spinner className="h-4 w-4" />
                Generating…
              </>
            ) : (
              '📦 Generate Social Pack'
            )}
          </button>
        </div>

        {socialZipError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mt-4 text-red-400 text-sm">
            {socialZipError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <div className="text-xs font-semibold text-white mb-2">
              Platforms
            </div>
            <div className="space-y-2">
              {ALL_PLATFORMS.map((p) => (
                <label
                  key={p.key}
                  className="flex items-center justify-between gap-3 text-sm text-slate-300 bg-slate-900/40 border border-slate-700/60 rounded-xl px-3 py-2"
                >
                  <span>{p.label}</span>
                  <input
                    type="checkbox"
                    checked={socialPlatforms[p.key]}
                    onChange={(e) =>
                      setSocialPlatforms({
                        ...socialPlatforms,
                        [p.key]: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-indigo-500"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 text-xs font-semibold text-white mb-2">
              Style
            </div>
            <select
              value={socialStyle}
              onChange={(e) => setSocialStyle(e.target.value as SocialStyle)}
              className="w-full bg-slate-900/40 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200"
            >
              <option value="gradient">Gradient</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>

            <div className="mt-5 text-xs font-semibold text-white mb-2">
              Accent color
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-300 bg-slate-900/40 border border-slate-700/60 rounded-xl px-3 py-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer border-0"
              />
              <span className="text-xs text-slate-400">{accentColor}</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-white mb-2">
              Previews
            </div>
            {socialTemplates.length === 0 ? (
              <div className="text-sm text-slate-400">
                Select at least one platform.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {socialTemplates.map((t) => (
                  <SocialTemplatePreview
                    key={`${t.label}-${t.width}x${t.height}`}
                    template={t}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mt-8 mb-8">
        <h3 className="text-sm font-semibold text-white mb-2">💡 Tips</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>
            • Click <strong>&quot;⬇️ Download PNG&quot;</strong> on each asset
            for a pixel-perfect render
          </li>
          <li>
            • Use <strong>&quot;📦 Download All (ZIP)&quot;</strong> to get all
            assets in one file
          </li>
          <li>
            • Customize colors using the theme picker above — PNGs render with
            your chosen theme
          </li>
          <li>
            • Social templates use system fonts (Inter if available) — no external font loading
          </li>
        </ul>
      </div>
    </div>
  );
}

```

# app/plan/[id]/brief/page.tsx

```tsx
import { redirect } from 'next/navigation';

export default async function LegacyBriefRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/plan/${id}/strategy/brief`);
}

```

# app/plan/[id]/calendar/page.tsx

```tsx
'use client';

import { useEffect, useMemo, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';
import { PageSkeleton } from '@/components/Skeleton';
import DismissableTip from '@/components/DismissableTip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type ContentType = 'post' | 'reel' | 'story' | 'thread' | 'article';

interface CalendarPost {
  date: string;
  platform: string;
  content_type: ContentType;
  title: string;
  draft_copy: string;
  hashtags: string[];
  suggested_time: string;
  media_notes: string;
}

const DEFAULT_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'twitter', 'youtube'];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500/15 border-pink-500/40 text-pink-200',
  tiktok: 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-200',
  linkedin: 'bg-sky-500/15 border-sky-500/40 text-sky-200',
  twitter: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200',
  x: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200',
  youtube: 'bg-red-500/15 border-red-500/40 text-red-200',
  threads: 'bg-slate-500/15 border-slate-500/40 text-slate-200',
  facebook: 'bg-blue-500/15 border-blue-500/40 text-blue-200',
  reddit: 'bg-orange-500/15 border-orange-500/40 text-orange-200',
};

function platformClass(platform: string): string {
  const key = platform.toLowerCase();
  return (
    PLATFORM_COLORS[key] ||
    'bg-slate-700/20 border-slate-600/40 text-slate-200'
  );
}

function startOfWeekMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Mon=0
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const { plan, loading: planLoading, error: planError, reload: loadPlan } = usePlan(id);

  const [platforms, setPlatforms] = useState<string[]>([...DEFAULT_PLATFORMS]);
  const [weeks, setWeeks] = useState<number>(2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [calendar, setCalendar] = useState<CalendarPost[]>([]);
  const [selected, setSelected] = useState<CalendarPost | null>(null);

  const storageKey = useMemo(
    () => `calendar-${id}-${platforms.slice().sort().join(',')}-${weeks}`,
    [id, platforms, weeks]
  );


  const loadSavedCalendarFromDb = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${id}/content`);
      if (!res.ok) return;
      const json = await res.json();
      const items = (json?.content as Array<{ contentType: string; contentKey: string | null; content: unknown }>) || [];
      const found = items.find((x) => x.contentType === 'calendar');
      if (found && Array.isArray(found.content)) {
        setCalendar(found.content as CalendarPost[]);
      }
    } catch {
      // ignore
    }
  }, [id]);


  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { calendar?: CalendarPost[] };
        if (Array.isArray(parsed?.calendar)) {
          setCalendar(parsed.calendar);
          return;
        }
      } catch {
        /* ignore */
      }
    }
    void loadSavedCalendarFromDb();
  }, [storageKey, loadSavedCalendarFromDb]);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      return [...prev, p];
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          platforms: platforms.length ? platforms : DEFAULT_PLATFORMS,
          weeks,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to generate calendar');

      const cal = (json?.calendar as CalendarPost[]) || [];
      setCalendar(cal);
      sessionStorage.setItem(storageKey, JSON.stringify({ calendar: cal, metadata: json?.metadata }));
      toastSuccess('Calendar generated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate calendar';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const calendarByDate = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const item of calendar) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    }
    return map;
  }, [calendar]);

  const weekStarts = useMemo(() => {
    if (!calendar.length) {
      const next = new Date();
      // next Monday
      const day = next.getDay();
      const add = ((8 - day) % 7) || 7;
      next.setDate(next.getDate() + add);
      const start = startOfWeekMonday(next);
      return Array.from({ length: weeks }, (_, i) => addDays(start, i * 7));
    }

    // derive range from calendar
    const dates = calendar
      .map((c) => new Date(c.date + 'T00:00:00'))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const start = startOfWeekMonday(dates[0]);
    const end = startOfWeekMonday(dates[dates.length - 1]);

    const out: Date[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 7)) out.push(new Date(d));
    return out;
  }, [calendar, weeks]);

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
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <DismissableTip id="calendar-tip">Plan your content calendar with AI-scheduled posts across all platforms for the next 4 weeks — see what to post, when, and with what copy.</DismissableTip>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">📅 Content Calendar</h1>
          <p className="text-slate-400">{plan.config.app_name} — Generate a weekly posting plan</p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          {loading ? 'Generating…' : '✨ Generate Calendar'}
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-semibold text-white mb-2">Platforms</div>
            <div className="flex flex-wrap gap-2">
              {(Array.from(new Set([...DEFAULT_PLATFORMS, ...platforms]))).map((p) => (
                <label
                  key={p}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer select-none ${platforms.includes(p)
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                    : 'bg-slate-950/30 border-slate-700/40 text-slate-300'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={platforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                    className="accent-indigo-500"
                  />
                  <span className="capitalize">{p}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-500 mt-2">Tip: add or remove platforms before generating.</div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white mb-2">Weeks</div>
            <div className="flex items-center gap-3">
              <select
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="bg-slate-950/40 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {[1, 2, 3, 4].map((w) => (
                  <option key={w} value={w}>
                    {w} week{w === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500">Generate 1–4 weeks starting next Monday.</div>
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-300 mt-4">{error}</div>}
      </div>

      {calendar.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-10 text-center">
          <div className="text-slate-300 font-medium mb-2">No calendar yet</div>
          <div className="text-slate-500 text-sm">Click “Generate Calendar” to create a weekly schedule.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {weekStarts.map((weekStart) => {
            const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
            return (
              <div key={toIsoDate(weekStart)} className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700/60">
                  <div className="text-white font-semibold">
                    Week of {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-slate-500">Click a post to view the full draft copy.</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7">
                  {days.map((d) => {
                    const iso = toIsoDate(d);
                    const items = calendarByDate.get(iso) || [];

                    return (
                      <div key={iso} className="border-t md:border-t-0 md:border-l border-slate-700/50 p-3 min-h-[140px]">
                        <div className="text-xs text-slate-400 mb-2">{formatDayLabel(iso)}</div>
                        <div className="space-y-2">
                          {items.length === 0 ? (
                            <div className="text-xs text-slate-600">—</div>
                          ) : (
                            items.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => setSelected(item)}
                                className={`w-full text-left border rounded-xl px-3 py-2 transition-colors hover:bg-white/5 ${platformClass(
                                  item.platform
                                )}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-semibold truncate capitalize">{item.platform}</div>
                                  <div className="text-[11px] text-slate-300/80">{item.suggested_time}</div>
                                </div>
                                <div className="text-sm text-white font-medium mt-0.5 line-clamp-2">{item.title}</div>
                                <div className="text-[11px] text-slate-400 mt-1 capitalize">{item.content_type}</div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-700/60 pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <DialogDescription className="text-xs text-slate-400 mb-1">
                  {selected?.date} • <span className="capitalize">{selected?.platform}</span> •{' '}
                  <span className="capitalize">{selected?.content_type}</span> • {selected?.suggested_time}
                </DialogDescription>
                <DialogTitle className="text-lg font-semibold">{selected?.title}</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {selected && (
            <div className="space-y-6">
              <div>
                <div className="text-sm font-semibold text-white mb-2">Draft copy</div>
                <pre className="whitespace-pre-wrap text-sm text-slate-200 bg-slate-950/30 border border-slate-700/50 rounded-xl p-4">
                  {selected.draft_copy}
                </pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-white mb-2">Hashtags</div>
                  <div className="text-sm text-slate-200 bg-slate-950/30 border border-slate-700/50 rounded-xl p-3">
                    {(selected.hashtags || []).length ? (selected.hashtags || []).join(' ') : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-2">Media notes</div>
                  <div className="text-sm text-slate-200 bg-slate-950/30 border border-slate-700/50 rounded-xl p-3">
                    {selected.media_notes || '—'}
                  </div>
                </div>
              </div>

              {(selected.platform === 'instagram' || selected.platform === 'tiktok') && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/post-to-buffer', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            platform: selected.platform,
                            caption: selected.draft_copy,
                            hashtags: selected.hashtags,
                          }),
                        });
                        if (res.ok) {
                          toastSuccess('Queued to Buffer');
                        } else {
                          toastError('Failed to queue');
                        }
                      } catch {
                        toastError('Network error');
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    📤 Queue to Buffer
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/post-to-buffer', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            platform: selected.platform,
                            caption: selected.draft_copy,
                            hashtags: selected.hashtags,
                            publishNow: true,
                          }),
                        });
                        if (res.ok) {
                          toastSuccess('Posted now!');
                        } else {
                          toastError('Failed to post');
                        }
                      } catch {
                        toastError('Network error');
                      }
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    ⚡ Post Now
                  </button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 border-t border-slate-700/60 pt-4">
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

```

# app/plan/[id]/competitors/page.tsx

```tsx
'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import ErrorRetry from '@/components/ErrorRetry';
import { DraftSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';
import DismissableTip from '@/components/DismissableTip';

type Competitor = {
  name: string;
  url?: string;
  positioning?: string;
  pricing?: string;
  strengths?: string[];
  weaknesses?: string[];
  keyMessaging?: string[];
};

type Competitive = {
  competitors: Competitor[];
  gaps?: string[];
  opportunities?: string[];
  keywordGaps?: string[];
};

type ContentRow = {
  contentType: string;
  contentKey: string | null;
  content: unknown;
};

function CellList({ items, kind }: { items: string[]; kind: 'good' | 'bad' | 'neutral' }) {
  if (!items?.length) return <span className="text-slate-500 text-sm">—</span>;

  const icon = kind === 'bad' ? '❌' : kind === 'good' ? '✅' : '•';
  const color = kind === 'bad' ? 'text-red-200' : kind === 'good' ? 'text-emerald-200' : 'text-slate-200';

  return (
    <ul className={`space-y-1.5 text-sm ${color}`}>
      {items.slice(0, 8).map((it, i) => (
        <li key={`${it}-${i}`} className="flex items-start gap-2">
          <span className={kind === 'bad' ? 'text-red-400 mt-0.5 shrink-0' : kind === 'good' ? 'text-emerald-400 mt-0.5 shrink-0' : 'text-slate-400 mt-0.5 shrink-0'}>
            {icon}
          </span>
          <span className="text-slate-200">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function PricingBadge({ text, highlight }: { text: string; highlight?: 'good' | 'bad' }) {
  const base = 'inline-flex items-center text-xs px-2.5 py-1 rounded-full border';
  if (highlight === 'good') {
    return <span className={`${base} bg-emerald-950/40 border-emerald-800/50 text-emerald-200`}>{text}</span>;
  }
  if (highlight === 'bad') {
    return <span className={`${base} bg-red-950/30 border-red-900/60 text-red-200`}>{text}</span>;
  }
  return <span className={`${base} bg-slate-900/40 border-slate-700/50 text-slate-200`}>{text}</span>;
}

function isFreeish(pricing?: string) {
  const p = (pricing || '').toLowerCase();
  return p.includes('free') || p.includes('freemium');
}

function CompetitiveSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-60 bg-slate-800 rounded mb-3" />
      <div className="h-4 w-full bg-slate-900/50 rounded mb-6" />
      <div className="border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="h-12 bg-slate-800/40" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-slate-900/30 border-t border-slate-800/60" />
        ))}
      </div>
    </div>
  );
}

export default function CompetitorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { plan, loading: planLoading, error: planError, reload: loadPlan } = usePlan(id);

  const [competitive, setCompetitive] = useState<Competitive | null>(null);
  const [loadingCompetitive, setLoadingCompetitive] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [competitiveError, setCompetitiveError] = useState('');

  const { success: toastOk, error: toastErr } = useToast();

  const restoreCached = () => {
    try {
      const cached = sessionStorage.getItem(`competitive-analysis-${id}`);
      if (cached) setCompetitive(JSON.parse(cached));
    } catch {
      // ignore
    }
  };

  const persistCached = (value: Competitive | null) => {
    try {
      if (!value) {
        sessionStorage.removeItem(`competitive-analysis-${id}`);
      } else {
        sessionStorage.setItem(`competitive-analysis-${id}`, JSON.stringify(value));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    restoreCached();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load saved competitive analysis from DB (best-effort)
  useEffect(() => {
    fetch(`/api/plans/${id}/content`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const rows = (d?.content || []) as ContentRow[];
        const row = rows.find((x) => x.contentType === 'competitive-analysis');
        if (row?.content && typeof row.content === 'string') {
          try {
            const parsed = JSON.parse(row.content) as Competitive;
            setCompetitive(parsed);
            persistCached(parsed);
          } catch {
            // ignore
          }
        }
      })
      .catch(() => { })
      .finally(() => setLoadingSaved(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const generateCompetitive = async () => {
    setLoadingCompetitive(true);
    setCompetitiveError('');
    try {
      const r = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed to generate competitive analysis');
      setCompetitive(d.competitive);
      persistCached(d.competitive);
      toastOk('Competitive analysis generated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate competitive analysis';
      setCompetitiveError(msg);
      toastErr(msg);
    } finally {
      setLoadingCompetitive(false);
    }
  };

  const cols = useMemo(() => {
    const competitors = competitive?.competitors || [];
    const max = 6; // keep table readable
    return competitors.slice(0, max);
  }, [competitive]);

  const ourPricing = plan?.config?.pricing || '';
  const ourRating = typeof plan?.scraped?.rating === 'number' ? plan?.scraped?.rating : null;
  const ourFeatures = (plan?.scraped?.features?.length ? plan.scraped.features : plan?.config?.differentiators) || [];

  const ourFree = isFreeish(ourPricing);
  const anyCompetitorFree = cols.some((c) => isFreeish(c.pricing));

  if (planLoading) return <DraftSkeleton />;
  if (planError) return <div className="max-w-3xl mx-auto py-20"><ErrorRetry error={planError} onRetry={loadPlan} /></div>;
  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">← Start a new analysis</Link>
      </div>
    );
  }

  const hasResults = (competitive?.competitors?.length || 0) > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <DismissableTip id="competitors-tip">Analyse your top competitors — their positioning, pricing, strengths, and weaknesses — and identify gaps you can exploit in your messaging.</DismissableTip>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white break-words">🏆 Competitors</h1>
          <p className="text-slate-400 break-words">
            Side-by-side comparison for <span className="text-slate-200 font-semibold">{plan.config.app_name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateCompetitive}
            disabled={loadingCompetitive}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loadingCompetitive ? 'Analyzing…' : hasResults ? '🔄 Refresh' : '✨ Analyze'}
          </button>
          {hasResults && (
            <button
              onClick={() => {
                setCompetitive(null);
                persistCached(null);
              }}
              className="bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/50 text-slate-200 text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {competitiveError && (
        <div className="mb-6 bg-red-950/30 border border-red-900/60 rounded-2xl p-4 text-sm text-red-200">
          {competitiveError}
        </div>
      )}

      {(loadingCompetitive || loadingSaved) && !hasResults && <CompetitiveSkeleton />}

      {hasResults && (
        <section className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Comparison table</h2>
              <p className="text-sm text-slate-500">
                Scroll horizontally on mobile. Strengths are highlighted in green; weaknesses in red.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Showing {Math.min(cols.length, 6)} competitor{cols.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="min-w-[900px] w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-tl-xl px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Feature / Aspect
                  </th>
                  <th className="bg-slate-900/40 border border-slate-700/60 px-4 py-3 text-left text-xs font-semibold text-white">
                    {plan.config.app_name} <span className="text-slate-400 font-normal">(Our App)</span>
                  </th>
                  {cols.map((c, idx) => (
                    <th key={`${c.name}-${idx}`} className="bg-slate-900/40 border border-slate-700/60 px-4 py-3 text-left text-xs font-semibold text-white">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate">{c.name}</div>
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-300 hover:text-indigo-200 truncate block">
                              {c.url}
                            </a>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Pricing */}
                <tr>
                  <td className="sticky left-0 z-10 bg-slate-950/60 backdrop-blur border border-slate-800/60 px-4 py-4 text-sm font-semibold text-slate-200">
                    Pricing
                  </td>
                  <td className="border border-slate-800/60 px-4 py-4 align-top">
                    {ourPricing ? (
                      <PricingBadge
                        text={ourPricing}
                        highlight={ourFree && !anyCompetitorFree ? 'good' : !ourFree && anyCompetitorFree ? 'bad' : undefined}
                      />
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </td>
                  {cols.map((c, idx) => (
                    <td key={`pricing-${idx}`} className="border border-slate-800/60 px-4 py-4 align-top">
                      {c.pricing ? (
                        <PricingBadge
                          text={c.pricing}
                          highlight={!ourFree && isFreeish(c.pricing) ? 'good' : ourFree && !isFreeish(c.pricing) ? 'bad' : undefined}
                        />
                      ) : (
                        <span className="text-slate-500 text-sm">—</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr>
                  <td className="sticky left-0 z-10 bg-slate-950/60 backdrop-blur border border-slate-800/60 px-4 py-4 text-sm font-semibold text-slate-200">
                    Rating
                  </td>
                  <td className="border border-slate-800/60 px-4 py-4 align-top">
                    {ourRating !== null ? (
                      <div className="text-sm text-slate-200">
                        <span className="text-amber-300">★</span> {ourRating.toFixed(1)}
                        {typeof plan.scraped.ratingCount === 'number' && (
                          <span className="text-slate-500 text-xs ml-2">({plan.scraped.ratingCount.toLocaleString()} ratings)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </td>
                  {cols.map((_, idx) => (
                    <td key={`rating-${idx}`} className="border border-slate-800/60 px-4 py-4 align-top">
                      <span className="text-slate-500 text-sm">—</span>
                    </td>
                  ))}
                </tr>

                {/* Key Features */}
                <tr>
                  <td className="sticky left-0 z-10 bg-slate-950/60 backdrop-blur border border-slate-800/60 px-4 py-4 text-sm font-semibold text-slate-200">
                    Key Features
                  </td>
                  <td className="border border-slate-800/60 px-4 py-4 align-top">
                    <CellList items={ourFeatures} kind="good" />
                  </td>
                  {cols.map((c, idx) => (
                    <td key={`features-${idx}`} className="border border-slate-800/60 px-4 py-4 align-top">
                      <CellList items={c.keyMessaging || (c.positioning ? [c.positioning] : [])} kind="good" />
                    </td>
                  ))}
                </tr>

                {/* Strengths */}
                <tr>
                  <td className="sticky left-0 z-10 bg-slate-950/60 backdrop-blur border border-slate-800/60 px-4 py-4 text-sm font-semibold text-slate-200">
                    Strengths
                  </td>
                  <td className="border border-slate-800/60 px-4 py-4 align-top">
                    <CellList items={plan.config.differentiators || []} kind="good" />
                  </td>
                  {cols.map((c, idx) => (
                    <td key={`strengths-${idx}`} className="border border-slate-800/60 px-4 py-4 align-top">
                      <CellList items={c.strengths || []} kind="good" />
                    </td>
                  ))}
                </tr>

                {/* Weaknesses */}
                <tr>
                  <td className="sticky left-0 z-10 bg-slate-950/60 backdrop-blur border border-slate-800/60 rounded-bl-xl px-4 py-4 text-sm font-semibold text-slate-200">
                    Weaknesses
                  </td>
                  <td className="border border-slate-800/60 px-4 py-4 align-top">
                    <span className="text-slate-500 text-sm">—</span>
                  </td>
                  {cols.map((c, idx) => (
                    <td key={`weaknesses-${idx}`} className="border border-slate-800/60 px-4 py-4 align-top">
                      <CellList items={c.weaknesses || []} kind="bad" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Extra insights (optional, useful on this page) */}
          {(competitive?.opportunities?.length || competitive?.gaps?.length) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              {competitive?.opportunities?.length ? (
                <div className="bg-slate-900/40 border border-indigo-900/40 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-indigo-200 mb-2">💡 Opportunities</div>
                  <ul className="space-y-2">
                    {competitive.opportunities.slice(0, 8).map((o, i) => (
                      <li key={`${o}-${i}`} className="text-sm text-slate-200 flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {competitive?.gaps?.length ? (
                <div className="bg-slate-900/40 border border-blue-900/40 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-blue-200 mb-2">🔍 Gaps</div>
                  <ul className="space-y-2">
                    {competitive.gaps.slice(0, 8).map((g, i) => (
                      <li key={`${g}-${i}`} className="text-sm text-slate-200 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5 shrink-0">◇</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      )}

      {!hasResults && !loadingCompetitive && !loadingSaved && (
        <div className="text-center py-14 text-slate-500">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-sm">No competitor comparison yet. Click <span className="text-slate-200 font-medium">Analyze</span> to generate one.</p>
        </div>
      )}

      <div className="mt-10 text-center">
        <div className="inline-flex gap-3">
          <a
            href={`/plan/${id}`}
            className="bg-slate-800 hover:bg-slate-700 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            ← Back to Plan
          </a>
          <a
            href={`/plan/${id}/foundation`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            Foundation →
          </a>
        </div>
      </div>
    </div>
  );
}

```

# app/plan/[id]/content/page.tsx

```tsx
import { Languages, LayoutTemplate, Mail, PenLine } from 'lucide-react';

import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

export default async function ContentHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PlanPageShell
      title="Content"
      description="Build reusable copy assets from your strategy so distribution can run with minimal editing."
      helper="Recommended order: Copy Draft -> Email Sequences -> Templates -> Translations"
    >
      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/draft`}
          title="Copy Draft"
          description="Core marketing copy and listing draft variants"
          icon={PenLine}
        />
        <PlanLinkCard
          href={`/plan/${id}/emails`}
          title="Email Sequences"
          description="Welcome, launch, and lifecycle email sequences"
          icon={Mail}
        />
        <PlanLinkCard
          href={`/plan/${id}/templates`}
          title="Templates"
          description="Reusable templates for ads, landing pages, and outreach"
          icon={LayoutTemplate}
        />
        <PlanLinkCard
          href={`/plan/${id}/translate`}
          title="Translations"
          description="Localized variants for key markets and languages"
          icon={Languages}
        />
      </div>
    </PlanPageShell>
  );
}

```

# app/plan/[id]/digest/page.tsx

```tsx
'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';
import { PageSkeleton } from '@/components/Skeleton';
import DismissableTip from '@/components/DismissableTip';

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
  return <div className={`h-4 ${w} rounded bg-slate-800/70 animate-pulse`} />;
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
        <div className="text-slate-400 mb-4">Plan not found</div>
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
          <h1 className="text-2xl font-bold text-white">📊 Weekly Digest</h1>
          <p className="text-slate-400">{plan.config.app_name} — Summary & next steps for the week</p>
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
        <div className="bg-red-950/30 border border-red-900/40 text-red-200 rounded-2xl p-4 mb-8 text-sm">
          {error}
        </div>
      )}

      {loading && !digest ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <SkeletonLine w="w-2/3" />
            <SkeletonLine />
            <SkeletonLine w="w-5/6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/30 border border-slate-800/60 rounded-2xl p-4 space-y-2">
              <SkeletonLine w="w-1/2" />
              <SkeletonLine />
              <SkeletonLine w="w-5/6" />
            </div>
            <div className="bg-slate-950/30 border border-slate-800/60 rounded-2xl p-4 space-y-2">
              <SkeletonLine w="w-1/2" />
              <SkeletonLine />
              <SkeletonLine w="w-4/6" />
            </div>
          </div>
        </div>
      ) : !digest ? (
        <div className="bg-slate-900/40 border border-slate-800/70 rounded-2xl p-10 text-center">
          <div className="text-slate-200 font-medium mb-2">No digest yet</div>
          <div className="text-slate-500 text-sm">Click “Generate Digest” to summarise the last 7 days of work.</div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-white font-semibold">Summary</h2>
              <div className="text-xs text-slate-500">Generated: {new Date(digest.generatedAt).toLocaleString()}</div>
            </div>
            <div className="text-slate-200 mt-3 whitespace-pre-wrap">{digest.summary}</div>
          </div>

          {digest.competitiveLandscape && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold">Competitive landscape</h2>
              <div className="text-slate-200 mt-3 whitespace-pre-wrap">{digest.competitiveLandscape}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold">Content created</h2>
              <div className="text-xs text-slate-500 mt-1">From the last 7 days of saved artefacts</div>

              {digest.contentCreated.length === 0 ? (
                <div className="text-slate-400 text-sm mt-4">No recent saved content found.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {digest.contentCreated.map((item, idx) => (
                    <div key={idx} className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm text-white font-medium">
                          {item.type}
                          {item.key ? <span className="text-slate-400 font-normal"> • {item.key}</span> : null}
                        </div>
                        {item.updatedAt ? (
                          <div className="text-[11px] text-slate-500">{new Date(item.updatedAt).toLocaleDateString()}</div>
                        ) : null}
                      </div>
                      <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{item.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold">Recommendations</h2>
              {digest.recommendations.length === 0 ? (
                <div className="text-slate-400 text-sm mt-4">No recommendations returned.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {digest.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4">
                      <div className="text-sm text-white font-semibold">{rec.title}</div>
                      <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{rec.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold">Next actions</h2>
            {digest.nextActions.length === 0 ? (
              <div className="text-slate-400 text-sm mt-4">No next actions returned.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {digest.nextActions.map((a, idx) => (
                  <div key={idx} className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="text-sm text-white font-semibold">{a.action}</div>
                      <div className={`text-[11px] px-2 py-1 rounded-lg border ${priorityBadge(a.priority)}`}>
                        {a.priority.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{a.why}</div>
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

```

# app/plan/[id]/distribute/page.tsx

```tsx
'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';

interface CorePiece {
  title: string;
  content: string;
}

interface Atom {
  platform: string;
  format: string;
  content: string;
  hashtags?: string[];
  subreddits?: string[];
  characterCount?: number;
  notes?: string;
}

interface AtomizeResponse {
  corePiece: CorePiece;
  atoms: Atom[];
  metadata?: { model?: string; tokens?: number | null; atomCount?: number };
}

const DEFAULT_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'twitter', 'reddit', 'email'];

const platformMeta: Record<string, { icon: string; description: string }> = {
  instagram: { icon: '📸', description: 'Caption + 5 hashtags, 2,200 char limit' },
  tiktok: { icon: '🎬', description: 'Hook + script outline for 15–60s video' },
  linkedin: { icon: '💼', description: 'Professional post, up to 3,000 chars' },
  twitter: { icon: '🐦', description: 'Tweet thread, 280 chars per tweet' },
  reddit: { icon: '👽', description: 'Title + body post, community-aware' },
  email: { icon: '✉️', description: 'Subject line + email body' },
};

export default function DistributePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');

  const [platforms, setPlatforms] = useState<string[]>([...DEFAULT_PLATFORMS]);
  const [sourceContent, setSourceContent] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AtomizeResponse | null>(null);
  const [isCached, setIsCached] = useState(false);

  const [filter, setFilter] = useState<string>('all');

  const storageKey = `distribute-${id}`;

  const loadPlan = useCallback(() => {
    setPlanLoading(true);
    setPlanError('');
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch {
        /* fall through */
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
      .catch((err) => {
        setPlanError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setPlanLoading(false));
  }, [id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return;
    try {
      setData(JSON.parse(stored));
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      return [...prev, p];
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/atomize-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          sourceContent: sourceContent.trim() ? sourceContent : undefined,
          platforms: platforms.length ? platforms : DEFAULT_PLATFORMS,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to atomize content');

      sessionStorage.setItem(storageKey, JSON.stringify(json));
      setData(json);
      setIsCached(false);
      toastSuccess('Content atomized');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to atomize content';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20">
        <div className="text-slate-400">Loading…</div>
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
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  const atoms = data?.atoms || [];
  const filteredAtoms = filter === 'all' ? atoms : atoms.filter((a) => a.platform === filter);
  const platformsPresent = Array.from(new Set(atoms.map((a) => a.platform))).sort();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Turn one core piece of content into platform-native posts for Instagram, TikTok, LinkedIn, Twitter, Reddit, and email — generated in seconds from your marketing brief.
      </div>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">📣 Distribute</h1>
            {data && isCached && (
              <span className="text-xs text-slate-500">Cached · ↻ Regenerate to refresh</span>
            )}
          </div>
          <p className="text-slate-400">{plan.config.app_name} — One core piece, many posts</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-2.5">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Preview</div>
          <div className="text-sm text-slate-200 mt-1">
            <span className="text-slate-400">Channels:</span> {platforms.length ? platforms.join(', ') : DEFAULT_PLATFORMS.join(', ')}
          </div>
          <div className="text-sm text-slate-200">
            <span className="text-slate-400">Audience:</span> {plan.config.target_audience || '—'}
          </div>
          <div className="text-sm text-slate-200">
            <span className="text-slate-400">Content:</span> {sourceContent.trim() ? 'Platform-native posts (from your source)' : 'Core piece + platform-native posts'}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8 space-y-4">
        <div>
          <div className="text-sm font-semibold text-white mb-2">Platforms</div>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`text-xs border rounded-full px-3 py-1.5 transition-colors ${
                  platforms.includes(p)
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                    : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40 text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500 mt-2">Tip: leave source blank to auto-generate a core blog post/announcement.</div>
        </div>

        {!data && (
          <div>
            <div className="text-sm font-semibold text-white mb-2">What you’ll get</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(platforms.length ? platforms : DEFAULT_PLATFORMS).map((p) => {
                const meta = platformMeta[p] || { icon: '✨', description: 'Platform-native post' };
                return (
                  <div
                    key={p}
                    className="bg-slate-900/40 border border-slate-700/40 rounded-xl px-3 py-2.5"
                  >
                    <div className="text-xs text-white flex items-center gap-2">
                      <span aria-hidden>{meta.icon}</span>
                      <span className="font-medium capitalize">{p}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">{meta.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-sm font-semibold text-white mb-2">Optional source content</div>
          <textarea
            value={sourceContent}
            onChange={(e) => setSourceContent(e.target.value)}
            placeholder="Paste a blog post, launch announcement, or notes… (optional)"
            className="w-full min-h-[140px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Generating…' : data ? '↻ Regenerate' : '✨ Generate'}
          </button>
        </div>

        {data?.metadata?.tokens != null && (
          <div className="text-xs text-slate-500">
            Model: {data.metadata.model || 'gemini'} · Tokens: {String(data.metadata.tokens)} · Atoms: {String(data.metadata.atomCount ?? atoms.length)}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!data && (
        <div className="text-slate-500 text-sm">Click “Generate” to create a core piece and atomized content.</div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Core piece */}
          <div className="rounded-2xl overflow-hidden border bg-slate-800/30 border-slate-700/60">
            <div className="p-4 border-b border-slate-700/40 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Core piece</div>
                <div className="text-xs text-slate-500">{data.corePiece.title}</div>
              </div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(`# ${data.corePiece.title}\n\n${data.corePiece.content}`);
                  toastSuccess('Copied core piece');
                }}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                📋 Copy
              </button>
            </div>
            <div className="p-4">
              <textarea
                readOnly
                value={data.corePiece.content}
                className="w-full min-h-[260px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-slate-300">Filter:</div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-950/40 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
            >
              <option value="all">All</option>
              {platformsPresent.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500">Showing {filteredAtoms.length} of {atoms.length}</div>
          </div>

          {/* Atoms */}
          <div className="space-y-4">
            {filteredAtoms.map((atom, idx) => {
              const count = typeof atom.characterCount === 'number' ? atom.characterCount : (atom.content || '').length;
              return (
                <div
                  key={`${atom.platform}-${atom.format}-${idx}`}
                  className="rounded-2xl overflow-hidden border bg-slate-800/30 border-slate-700/60"
                >
                  <div className="p-4 border-b border-slate-700/40 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {atom.platform} · {atom.format}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {atom.notes || '—'}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[11px] bg-slate-950/40 border border-slate-700/40 text-slate-300 px-2 py-1 rounded-full">
                          {count} chars
                        </span>
                        {Array.isArray(atom.hashtags) && atom.hashtags.length > 0 && (
                          <span className="text-[11px] bg-slate-950/40 border border-slate-700/40 text-slate-300 px-2 py-1 rounded-full">
                            {atom.hashtags.slice(0, 5).join(' ')}{atom.hashtags.length > 5 ? ' …' : ''}
                          </span>
                        )}
                        {Array.isArray(atom.subreddits) && atom.subreddits.length > 0 && (
                          <span className="text-[11px] bg-slate-950/40 border border-slate-700/40 text-slate-300 px-2 py-1 rounded-full">
                            {atom.subreddits.slice(0, 3).join(' ')}{atom.subreddits.length > 3 ? ' …' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(atom.content);
                        toastSuccess('Copied');
                      }}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>

                  <div className="p-4">
                    <textarea
                      readOnly
                      value={atom.content}
                      className="w-full min-h-[160px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Atomized content is a draft — tweak for each platform before posting.
      </div>
    </div>
  );
}

```

# app/plan/[id]/distribution/page.tsx

```tsx
import Link from 'next/link';
import { headers } from 'next/headers';
import { Calendar, Clock, Linkedin, Megaphone, Plus, Youtube } from 'lucide-react';

import type { MarketingPlan } from '@/lib/types';
import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

function StatusPill({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/[0.06] dark:bg-slate-900/50">
      <span className="text-xs text-slate-700 dark:text-slate-300">{label}</span>
      <span
        className={
          'rounded-full border px-2 py-0.5 text-[11px] ' +
          (selected
            ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
            : 'border-slate-300 bg-slate-100 text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-slate-400')
        }
      >
        {selected ? 'Selected' : 'Not selected'}
      </span>
    </div>
  );
}

export default async function DistributionHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const baseUrl = host ? `${proto}://${host}` : `http://localhost:${process.env.PORT || 3000}`;

  const planRes = await fetch(`${baseUrl}/api/plans/${id}`, {
    headers: {
      'x-api-key': process.env.API_KEY || '',
    },
    cache: 'no-store',
  });

  const plan = (await planRes.json()) as MarketingPlan;
  const selected = new Set(
    (plan?.config?.distribution_channels || []).map((c) => String(c).toLowerCase())
  );

  return (
    <PlanPageShell
      title="Distribution"
      description="Generate and route channel-ready content with clear publish sequencing."
      helper="Recommended order: Social Posts -> Schedule -> Calendar"
    >
      <Link
        href={`/plan/${id}/social`}
        className="group mb-6 block rounded-2xl border border-indigo-300/60 bg-indigo-50 p-5 transition-colors hover:border-indigo-400/80 dark:border-indigo-500/25 dark:bg-indigo-950/20 dark:hover:border-indigo-400/40"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/15">
                <Plus className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                Create Social Post
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Generate captions, images, and video variations for your next campaign.
            </p>
          </div>
          <Megaphone className="h-5 w-5 text-slate-500 transition-colors group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatusPill label="Instagram" selected={selected.has('instagram')} />
          <StatusPill label="LinkedIn" selected={selected.has('linkedin')} />
          <StatusPill label="TikTok / Shorts" selected={selected.has('tiktok')} />
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">📸 Instagram</div>
          <div className="flex items-center gap-1.5">
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
          </div>
          <div className="flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5" />
            Shorts
          </div>
        </div>
      </Link>

      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/social`}
          title="Social Posts"
          description="Create posts, images, and video content for each channel"
          icon={Megaphone}
        />
        <PlanLinkCard
          href={`/plan/${id}/schedule`}
          title="Schedule"
          description="Plan and queue posts over time"
          icon={Clock}
        />
        <PlanLinkCard
          href={`/plan/${id}/calendar`}
          title="Calendar"
          description="See publishing cadence in one calendar view"
          icon={Calendar}
        />
      </div>
    </PlanPageShell>
  );
}

```

# app/plan/[id]/draft/page.tsx

```tsx
'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import { DraftSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

type DraftSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets'
  | 'landing_page_hero';

const SECTION_OPTIONS: {
  key: DraftSection;
  label: string;
  help: string;
}[] = [
  {
    key: 'app_store_description',
    label: 'App Store description',
    help: 'Full description for the store listing.',
  },
  {
    key: 'short_description',
    label: 'Short description',
    help: 'A concise store-friendly tagline.',
  },
  {
    key: 'keywords',
    label: 'Keywords',
    help: 'Comma-separated keywords for ASO.',
  },
  {
    key: 'whats_new',
    label: "What's New",
    help: 'Release notes / update text.',
  },
  {
    key: 'feature_bullets',
    label: 'Feature bullets',
    help: 'A bullet list of benefits/features.',
  },
  {
    key: 'landing_page_hero',
    label: 'Landing page hero copy',
    help: 'Headline, subheadline, and CTA.',
  },
];

const TONE_OPTIONS: { value: Tone; label: string; help: string; sample: string }[] = [
  {
    value: 'professional',
    label: 'Professional',
    help: 'Clear, credible, polished.',
    sample: '"Designed for teams who demand reliability — at every scale."',
  },
  {
    value: 'casual',
    label: 'Casual',
    help: 'Friendly, conversational.',
    sample: '"Honestly? It just works. And it\'s kind of amazing."',
  },
  {
    value: 'bold',
    label: 'Bold',
    help: 'Punchy, energetic, confident.',
    sample: '"Stop settling. Start winning. Your competitors already did."',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    help: 'Short, tight, no fluff.',
    sample: '"Fast. Simple. Done."',
  },
];

function sectionToTitle(section: DraftSection) {
  return SECTION_OPTIONS.find((s) => s.key === section)?.label || section;
}

export default function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);

  const [tone, setTone] = useState<Tone>('professional');
  const [selected, setSelected] = useState<Record<DraftSection, boolean>>({
    app_store_description: true,
    short_description: true,
    keywords: true,
    whats_new: true,
    feature_bullets: true,
    landing_page_hero: true,
  });

  const [draft, setDraft] = useState<Partial<Record<DraftSection, string>>>({});
  const [isCached, setIsCached] = useState(false);

  const storageKey = `draft-${id}`;
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState<Partial<Record<DraftSection, boolean>>>({});
  const [copiedAll, setCopiedAll] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const loadPlan = useCallback(() => {
    setPlanLoading(true);
    setPlanError('');
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch { /* fall through */ }
    }
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
        setPlanError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setPlanLoading(false));
  }, [id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      setDraft(JSON.parse(stored) as Partial<Record<DraftSection, string>>);
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const selectedSections = useMemo(() => {
    return SECTION_OPTIONS.map((s) => s.key).filter((k) => selected[k]);
  }, [selected]);

  const generate = async (sections: DraftSection[]) => {
    setError('');
    const res = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: id,
        sections,
        tone,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to generate draft');

    return data as { draft: Record<string, string> };
  };

  const handleGenerate = async () => {
    if (selectedSections.length === 0) {
      setError('Please select at least one section.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await generate(selectedSections);
      const patch = data.draft as Partial<Record<DraftSection, string>>;
      const nextDraft = { ...draft, ...patch };
      sessionStorage.setItem(storageKey, JSON.stringify(nextDraft));
      setDraft(nextDraft);
      setIsCached(false);
      toastSuccess('Draft generated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate draft';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (section: DraftSection) => {
    setRegenerating((p) => ({ ...p, [section]: true }));
    setError('');
    try {
      const data = await generate([section]);
      const value = data.draft?.[section];
      if (typeof value === 'string') {
        const nextDraft = { ...draft, [section]: value };
        sessionStorage.setItem(storageKey, JSON.stringify(nextDraft));
        setDraft(nextDraft);
        setIsCached(false);
      }
      toastSuccess(`Regenerated ${sectionToTitle(section)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to regenerate';
      setError(msg);
      toastError(msg);
    } finally {
      setRegenerating((p) => ({ ...p, [section]: false }));
    }
  };

  const handleCopyAll = async () => {
    const orderedKeys = SECTION_OPTIONS.map((s) => s.key).filter(
      (k) => typeof draft[k] === 'string' && (draft[k] || '').trim().length > 0
    );

    if (orderedKeys.length === 0) return;

    const text = orderedKeys
      .map((k) => `## ${sectionToTitle(k)}\n\n${draft[k]}\n`)
      .join('\n');

    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (planLoading) {
    return <DraftSkeleton />;
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
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link
          href="/"
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Generate polished App Store descriptions, landing page hero copy, and feature bullets — choose your tone and section, then copy straight to your listing.
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">📝 First Draft Generator</h1>
            {Object.keys(draft).length > 0 && isCached && (
              <span className="text-xs text-slate-500">Cached · ↻ Generate to refresh</span>
            )}
          </div>
          <p className="text-slate-400">
            {plan.config.app_name} — Generate a complete first draft for your listing
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCopyAll}
            disabled={Object.keys(draft).length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            {copiedAll ? '✓ Copied!' : '📋 Copy All'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Generating…' : '✨ Generate Draft'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Sections</h2>
            <div className="space-y-2">
              {SECTION_OPTIONS.map((s) => (
                <label
                  key={s.key}
                  className="flex items-start gap-3 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected[s.key]}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [s.key]: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm text-white">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.help}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Tone</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                    tone === t.value
                      ? 'bg-indigo-600/20 border-indigo-500/50'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40'
                  }`}
                >
                  <div className="text-sm text-white">{t.label}</div>
                  <div className="text-xs text-slate-500">{t.help}</div>
                  <div className="text-xs italic text-slate-400 mt-0.5">{t.sample}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tip: Generate everything once, then tweak the draft and regenerate per section.
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {SECTION_OPTIONS.map((s) => {
          const value = draft[s.key] || '';
          const hasValue = value.trim().length > 0;

          return (
            <div
              key={s.key}
              className={`rounded-2xl overflow-hidden border ${
                hasValue
                  ? 'bg-slate-800/30 border-slate-700/60'
                  : 'bg-slate-900/20 border-slate-700/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/40">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{s.label}</div>
                  <div className="text-xs text-slate-500">{s.help}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleRegenerate(s.key)}
                    disabled={!!regenerating[s.key]}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    title="Regenerate this section"
                  >
                    {regenerating[s.key] ? '…' : '🔄 Regenerate'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!hasValue) return;
                      await navigator.clipboard.writeText(value);
                    }}
                    disabled={!hasValue}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    title="Copy section"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div className="p-4">
                <textarea
                  value={value}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [s.key]: e.target.value,
                    }))
                  }
                  placeholder="Not generated yet…"
                  className="w-full min-h-[140px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Drafts are a starting point — review for accuracy before publishing.
      </div>
    </div>
  );
}

```

# app/plan/[id]/emails/page.tsx

```tsx
'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';

type SequenceType = 'welcome' | 'launch' | 'nurture';

interface EmailItem {
  number: number;
  purpose: string;
  subjectLine: string;
  previewText: string;
  body: string;
  cta?: { text: string; action: string };
  sendDelay?: string;
}

interface GenerateEmailsResponse {
  sequence: {
    type: SequenceType;
    description: string;
    emails: EmailItem[];
  };
  metadata?: {
    model?: string;
    tokens?: number | null;
    sequenceType?: string;
  };
}

const SEQUENCE_OPTIONS: { value: SequenceType; label: string; help: string }[] = [
  { value: 'welcome', label: 'Welcome', help: 'Onboarding + trust building + offer.' },
  { value: 'launch', label: 'Launch', help: 'Announcement + reasons to care + urgency.' },
  { value: 'nurture', label: 'Nurture', help: 'Ongoing value + relationship building.' },
];

export default function EmailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');

  const [sequenceType, setSequenceType] = useState<SequenceType>('welcome');
  const [emailCount, setEmailCount] = useState(7);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<GenerateEmailsResponse | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({ 1: true });

  const storageKey = `emails-${id}`;

  const loadPlan = useCallback(() => {
    setPlanLoading(true);
    setPlanError('');
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch {
        /* fall through */
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
      .catch((err) => {
        setPlanError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setPlanLoading(false));
  }, [id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Restore last generated
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        sequenceType?: SequenceType;
        emailCount?: number;
        data?: GenerateEmailsResponse;
      };
      if (parsed.sequenceType) setSequenceType(parsed.sequenceType);
      if (typeof parsed.emailCount === 'number') setEmailCount(parsed.emailCount);
      if (parsed.data) setData(parsed.data);
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          sequenceType,
          emailCount,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to generate emails');

      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ sequenceType, emailCount, data: json })
      );
      setData(json);
      setIsCached(false);

      const firstNum = (json?.sequence?.emails?.[0]?.number as number) || 1;
      setOpen({ [firstNum]: true });
      toastSuccess('Email sequence generated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate emails';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20">
        <div className="text-slate-400">Loading…</div>
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
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  const emails = data?.sequence?.emails || [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Generate a welcome email sequence, launch announcement series, or nurture drip campaign — tailored to your app&apos;s tone and audience.
      </div>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">✉️ Email Sequence</h1>
          <p className="text-slate-400">{plan.config.app_name} — Generate a direct-response sequence</p>
        </div>
        <div className="flex items-center gap-3">
          {data && isCached && (
            <span className="text-xs text-slate-500">Cached · ↻ Generate to refresh</span>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Generating…' : '✨ Generate'}
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold text-white mb-2">Sequence type</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SEQUENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSequenceType(opt.value)}
                  className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                    sequenceType === opt.value
                      ? 'bg-indigo-600/20 border-indigo-500/50'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40'
                  }`}
                >
                  <div className="text-sm text-white">{opt.label}</div>
                  <div className="text-xs text-slate-500">{opt.help}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white mb-2">Email count</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={20}
                value={emailCount}
                onChange={(e) => setEmailCount(Math.max(1, Math.min(20, Number(e.target.value) || 7)))}
                className="w-28 bg-slate-950/40 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <div className="text-xs text-slate-500">Default is 7 (welcome progression).</div>
            </div>
          </div>
        </div>

        {data?.metadata?.tokens != null && (
          <div className="mt-4 text-xs text-slate-500">
            Model: {data.metadata.model || 'gemini'} · Tokens: {String(data.metadata.tokens)}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!data && (
        <div className="text-slate-500 text-sm">Click “Generate” to create your sequence.</div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="bg-slate-900/20 border border-slate-700/30 rounded-2xl p-4">
            <div className="text-sm font-semibold text-white">{data.sequence.type.toUpperCase()} sequence</div>
            <div className="text-xs text-slate-500 mt-1">{data.sequence.description}</div>
          </div>

          {emails.map((email) => {
            const isOpen = !!open[email.number];
            const ctaText = email.cta?.text || '';
            const ctaAction = email.cta?.action || '';

            return (
              <div
                key={email.number}
                className="rounded-2xl overflow-hidden border bg-slate-800/30 border-slate-700/60"
              >
                <button
                  onClick={() => setOpen((prev) => ({ ...prev, [email.number]: !prev[email.number] }))}
                  className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      #{email.number} · {email.subjectLine}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {email.purpose}{email.sendDelay ? ` · ${email.sendDelay}` : ''}
                    </div>
                  </div>
                  <div className="text-slate-400 text-sm">{isOpen ? '▾' : '▸'}</div>
                </button>

                {isOpen && (
                  <div className="p-4 border-t border-slate-700/40 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500">Subject</div>
                        <div className="text-sm text-slate-100 mt-1">{email.subjectLine}</div>
                      </div>
                      <div className="bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500">Preview</div>
                        <div className="text-sm text-slate-100 mt-1">{email.previewText}</div>
                      </div>
                    </div>

                    <div className="bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                      <div className="text-xs text-slate-500 mb-2">Body (Markdown)</div>
                      <textarea
                        value={email.body || ''}
                        readOnly
                        className="w-full min-h-[220px] bg-transparent text-sm text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500">CTA text</div>
                        <div className="text-sm text-slate-100 mt-1">{ctaText || '—'}</div>
                      </div>
                      <div className="md:col-span-2 bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500">CTA action</div>
                        <div className="text-sm text-slate-100 mt-1">{ctaAction || '—'}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={async () => {
                          const text = `Subject: ${email.subjectLine}\nPreview: ${email.previewText}\nSend: ${email.sendDelay || ''}\nPurpose: ${email.purpose}\n\n${email.body}\n\nCTA: ${ctaText} (${ctaAction})`;
                          await navigator.clipboard.writeText(text);
                          toastSuccess(`Copied email #${email.number}`);
                        }}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Sequences are drafts — review for accuracy and compliance before sending.
      </div>
    </div>
  );
}

```

# app/plan/[id]/export/page.tsx

```tsx
import { Eye, Image, Package } from 'lucide-react';

import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

export default async function ExportHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PlanPageShell
      title="Export"
      description="Review and package outputs for handoff, sharing, and launch operations."
      helper="Recommended order: Assets -> Preview -> Distribution Export"
    >
      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/assets`}
          title="Assets"
          description="Download generated images and export-ready files"
          icon={Image}
        />
        <PlanLinkCard
          href={`/plan/${id}/preview`}
          title="Preview"
          description="Check listing and content output before distribution"
          icon={Eye}
        />
        <PlanLinkCard
          href={`/plan/${id}/distribute`}
          title="Distribution Export"
          description="Bundle channel-ready content for publishing workflows"
          icon={Package}
        />
      </div>
    </PlanPageShell>
  );
}

```

# app/plan/[id]/foundation/page.tsx

```tsx
'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import ErrorRetry from '@/components/ErrorRetry';
import { DraftSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';
import DismissableTip from '@/components/DismissableTip';

type BrandVoice = {
  voiceSummary: string;
  personalityTraits: Array<{ trait: string; description: string; example: string }>;
  vocabularyGuide: {
    wordsToUse: string[];
    wordsToAvoid: string[];
    phrasesToUse: string[];
    phrasesToAvoid: string[];
  };
  toneSpectrum: { formal: number; playful: number; technical: number; emotional: number };
};

type PositioningAngle = {
  name: string;
  hook: string;
  psychology: string;
  headlineDirections: string[];
  bestFor: string;
};

type Positioning = {
  angles: PositioningAngle[];
  antiPositioning: { whatWeAreNot: string[]; whyItMatters: string };
  recommendedPrimary: string;
};

type Competitor = {
  name: string;
  url: string;
  positioning: string;
  pricing: string;
  strengths: string[];
  weaknesses: string[];
  keyMessaging: string[];
};

type Competitive = {
  competitors: Competitor[];
  gaps: string[];
  opportunities: string[];
  keywordGaps: string[];
};

function Chips({ items }: { items: string[] }) {
  if (!items?.length) return <span className="text-slate-500 text-sm">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="text-xs bg-slate-900/50 border border-slate-700/50 text-slate-200 px-2.5 py-1 rounded-full">
          {item}
        </span>
      ))}
    </div>
  );
}

function ToneBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(10, value || 0));
  return (
    <div className="border border-slate-700/40 rounded-xl p-3">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>{label}</span>
        <span className="text-white font-semibold">{v}/10</span>
      </div>
      <div className="h-2 bg-slate-950/40 border border-slate-700/40 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500/70 transition-all" style={{ width: `${v * 10}%` }} />
      </div>
    </div>
  );
}

function GenerationError({ message, onRetry }: { message: string; onRetry: () => void }) {
  if (!message) return null;
  return (
    <div className="mt-5 rounded-2xl bg-red-950/30 border border-red-800/50 p-4">
      <div className="text-sm text-red-200">{message}</div>
      <button
        onClick={onRetry}
        className="mt-3 bg-red-800 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

export default function FoundationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { plan, loading: planLoading, error: planError, reload: loadPlan } = usePlan(id);

  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null);
  const [positioning, setPositioning] = useState<Positioning | null>(null);
  const [competitive, setCompetitive] = useState<Competitive | null>(null);
  const [isCached, setIsCached] = useState(false);

  const [loadingBV, setLoadingBV] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);
  const [loadingComp, setLoadingComp] = useState(false);

  const [brandVoiceError, setBrandVoiceError] = useState('');
  const [positioningError, setPositioningError] = useState('');
  const [competitiveError, setCompetitiveError] = useState('');

  const [expandedAngle, setExpandedAngle] = useState<string | null>(null);

  const { success: toastOk, error: toastErr } = useToast();

  // Restore cached results
  useEffect(() => {
    try {
      const c = sessionStorage.getItem(`foundation-${id}`);
      if (c) {
        const o = JSON.parse(c);
        if (o.brandVoice) setBrandVoice(o.brandVoice);
        if (o.positioning) setPositioning(o.positioning);
        if (o.competitive) setCompetitive(o.competitive);
        setIsCached(true);
      }
    } catch { /* ignore */ }
  }, [id]);

  const persist = (patch: Partial<{ brandVoice: BrandVoice | null; positioning: Positioning | null; competitive: Competitive | null }>) => {
    const payload = { brandVoice: patch.brandVoice ?? brandVoice, positioning: patch.positioning ?? positioning, competitive: patch.competitive ?? competitive };
    sessionStorage.setItem(`foundation-${id}`, JSON.stringify(payload));
  };

  const generateBrandVoice = async () => {
    setLoadingBV(true);
    setBrandVoiceError('');
    try {
      const r = await fetch('/api/brand-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');
      persist({ brandVoice: d.brandVoice });
      setBrandVoice(d.brandVoice);
      setIsCached(false);
      toastOk('Brand voice generated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setBrandVoiceError(msg);
      toastErr(msg);
    } finally {
      setLoadingBV(false);
    }
  };

  const generatePositioning = async () => {
    setLoadingPos(true);
    setPositioningError('');
    try {
      const r = await fetch('/api/positioning-angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');
      persist({ positioning: d.positioning });
      setPositioning(d.positioning);
      setIsCached(false);
      toastOk('Positioning angles generated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setPositioningError(msg);
      toastErr(msg);
    } finally {
      setLoadingPos(false);
    }
  };

  const generateCompetitive = async () => {
    setLoadingComp(true);
    setCompetitiveError('');
    try {
      const r = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');
      persist({ competitive: d.competitive });
      setCompetitive(d.competitive);
      setIsCached(false);
      toastOk('Competitive analysis generated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setCompetitiveError(msg);
      toastErr(msg);
    } finally {
      setLoadingComp(false);
    }
  };

  if (planLoading) return <DraftSkeleton />;
  if (planError) return <div className="max-w-3xl mx-auto py-20"><ErrorRetry error={planError} onRetry={loadPlan} /></div>;
  if (!plan) return (
    <div className="max-w-3xl mx-auto text-center py-20">
      <div className="text-slate-400 mb-4">Plan not found</div>
      <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">← Start a new analysis</Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <DismissableTip id="foundation-tip">Build your brand&apos;s strategic foundation — define your voice, personality traits, vocabulary guide, and positioning angles that guide all your marketing content.</DismissableTip>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">🧱 Foundation Layer</h1>
            {(brandVoice || positioning || competitive) && isCached && (
              <span className="text-xs text-slate-500">Cached · Regenerate to refresh</span>
            )}
          </div>
          <p className="text-slate-400">Brand voice, positioning angles &amp; competitive intel for {plan.config.app_name}</p>
        </div>
      </div>

      {/* Jump-links */}
      <nav className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/40 -mx-4 px-4 py-2.5 mb-8 flex items-center gap-3 overflow-x-auto">
        {[
          { id: 'brand-voice', label: '🎙️ Brand Voice' },
          { id: 'positioning', label: '🎯 Positioning' },
          { id: 'competitive', label: '⚔️ Competitive' },
        ].map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="text-sm text-slate-400 hover:text-white whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <section id="brand-voice" className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-8 scroll-mt-16">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">🎙️ Brand Voice</h2>
            <p className="text-sm text-slate-500">A usable voice profile for copy &amp; creative.</p>
          </div>
          <Button onClick={generateBrandVoice} disabled={loadingBV}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm px-5 py-2.5 rounded-xl">
            {loadingBV ? 'Generating…' : brandVoice ? <><RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Generate</>}
          </Button>
        </div>

        <GenerationError message={brandVoiceError} onRetry={generateBrandVoice} />

        {!brandVoice ? (
          <div className="mt-5 text-slate-500 text-sm">Not generated yet.</div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Summary */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
              <div className="text-sm font-semibold text-white mb-2">Voice summary</div>
              <div className="text-slate-200 text-sm leading-relaxed">{brandVoice.voiceSummary}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Traits */}
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                <div className="text-sm font-semibold text-white mb-3">Personality traits</div>
                <div className="space-y-3">
                  {brandVoice.personalityTraits?.map((t, i) => (
                    <div key={`${t.trait}-${i}`} className="border border-slate-700/40 rounded-xl p-3">
                      <div className="text-sm text-white font-semibold">{t.trait}</div>
                      <div className="text-xs text-slate-400 mt-1">{t.description}</div>
                      <div className="text-xs text-slate-300 mt-2 bg-slate-950/30 border border-slate-700/40 rounded-lg p-2 italic">&ldquo;{t.example}&rdquo;</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {/* Vocabulary */}
                <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-white mb-3">Vocabulary guide</div>
                  <div className="space-y-3">
                    <div><div className="text-xs text-slate-400 mb-2">✅ Words to use</div><Chips items={brandVoice.vocabularyGuide?.wordsToUse || []} /></div>
                    <div><div className="text-xs text-slate-400 mb-2">❌ Words to avoid</div><Chips items={brandVoice.vocabularyGuide?.wordsToAvoid || []} /></div>
                    <div><div className="text-xs text-slate-400 mb-2">✅ Phrases to use</div><Chips items={brandVoice.vocabularyGuide?.phrasesToUse || []} /></div>
                    <div><div className="text-xs text-slate-400 mb-2">❌ Phrases to avoid</div><Chips items={brandVoice.vocabularyGuide?.phrasesToAvoid || []} /></div>
                  </div>
                </div>

                {/* Tone */}
                <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-white mb-3">Tone spectrum</div>
                  <div className="grid grid-cols-2 gap-3">
                    <ToneBar label="Formal" value={brandVoice.toneSpectrum?.formal} />
                    <ToneBar label="Playful" value={brandVoice.toneSpectrum?.playful} />
                    <ToneBar label="Technical" value={brandVoice.toneSpectrum?.technical} />
                    <ToneBar label="Emotional" value={brandVoice.toneSpectrum?.emotional} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section id="positioning" className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-8 scroll-mt-16">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">🎯 Positioning Angles</h2>
            <p className="text-sm text-slate-500">3–5 distinct ways to frame the product.</p>
          </div>
          <Button onClick={generatePositioning} disabled={loadingPos}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm px-5 py-2.5 rounded-xl">
            {loadingPos ? 'Generating…' : positioning ? <><RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Generate</>}
          </Button>
        </div>

        <GenerationError message={positioningError} onRetry={generatePositioning} />

        {!positioning ? (
          <div className="mt-5 text-slate-500 text-sm">Not generated yet.</div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="bg-indigo-950/25 border border-indigo-800/40 rounded-2xl p-4 text-sm text-slate-200">
              <span className="text-indigo-300 font-semibold">Recommended primary:</span> {positioning.recommendedPrimary}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {positioning.angles?.map((a) => {
                const open = expandedAngle === a.name;
                return (
                  <div key={a.name} className="bg-slate-900/40 border border-slate-700/40 rounded-2xl overflow-hidden">
                    <button onClick={() => setExpandedAngle(open ? null : a.name)} className="w-full text-left p-4 hover:bg-slate-900/60 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-white font-semibold">{a.name}</div>
                          <div className="text-slate-300 text-sm mt-1">{a.hook}</div>
                        </div>
                        <span className="text-slate-400 text-sm shrink-0">{open ? '−' : '+'}</span>
                      </div>
                    </button>
                    {open && (
                      <div className="p-4 pt-0 space-y-3">
                        <div><div className="text-xs text-slate-400 mb-1">Why it works</div><div className="text-sm text-slate-200">{a.psychology}</div></div>
                        <div><div className="text-xs text-slate-400 mb-1">Headline directions</div>
                          <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1">
                            {a.headlineDirections?.map((h, i) => <li key={i}>{h}</li>)}
                          </ul>
                        </div>
                        <div><div className="text-xs text-slate-400 mb-1">Best for</div><div className="text-sm text-slate-200">{a.bestFor}</div></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
              <div className="text-sm font-semibold text-white mb-2">Anti-positioning</div>
              <div className="text-xs text-slate-400 mb-2">What we are NOT</div>
              <Chips items={positioning.antiPositioning?.whatWeAreNot || []} />
              <div className="text-xs text-slate-400 mt-4 mb-1">Why it matters</div>
              <div className="text-sm text-slate-200">{positioning.antiPositioning?.whyItMatters}</div>
            </div>
          </div>
        )}
      </section>

      <section id="competitive" className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-10 scroll-mt-16">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">⚔️ Competitive Analysis</h2>
            <p className="text-sm text-slate-500">Competitors, gaps, opportunities &amp; messaging.</p>
          </div>
          <Button onClick={generateCompetitive} disabled={loadingComp}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm px-5 py-2.5 rounded-xl">
            {loadingComp ? 'Generating…' : competitive ? <><RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Generate</>}
          </Button>
        </div>

        <GenerationError message={competitiveError} onRetry={generateCompetitive} />

        {!competitive ? (
          <div className="mt-5 text-slate-500 text-sm">Not generated yet.</div>
        ) : (
          <div className="mt-5 space-y-6">
            {/* Comparison table */}
            <div className="overflow-x-auto border border-slate-700/40 rounded-2xl">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-slate-900/50 text-slate-300">
                  <tr>
                    <th className="text-left p-3 border-b border-slate-700/40">Competitor</th>
                    <th className="text-left p-3 border-b border-slate-700/40">Positioning</th>
                    <th className="text-left p-3 border-b border-slate-700/40">Pricing</th>
                    <th className="text-left p-3 border-b border-slate-700/40">Strengths</th>
                    <th className="text-left p-3 border-b border-slate-700/40">Weaknesses</th>
                  </tr>
                </thead>
                <tbody>
                  {competitive.competitors?.map((c) => (
                    <tr key={c.url || c.name} className="align-top">
                      <td className="p-3 border-b border-slate-700/30">
                        <div className="text-white font-semibold">{c.name}</div>
                        {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-300 hover:text-indigo-200 break-all">{c.url}</a>}
                        {c.keyMessaging?.length > 0 && (
                          <div className="mt-2"><div className="text-xs text-slate-500 mb-1">Key messaging</div>
                            <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">{c.keyMessaging.slice(0, 4).map((m, i) => <li key={i}>{m}</li>)}</ul>
                          </div>
                        )}
                      </td>
                      <td className="p-3 border-b border-slate-700/30 text-slate-200">{c.positioning}</td>
                      <td className="p-3 border-b border-slate-700/30 text-slate-200">{c.pricing}</td>
                      <td className="p-3 border-b border-slate-700/30"><ul className="list-disc pl-5 text-xs text-slate-200 space-y-1">{c.strengths?.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}</ul></td>
                      <td className="p-3 border-b border-slate-700/30"><ul className="list-disc pl-5 text-xs text-slate-200 space-y-1">{c.weaknesses?.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}</ul></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                <div className="text-sm font-semibold text-white mb-2">Gaps</div>
                <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1">{competitive.gaps?.map((g, i) => <li key={i}>{g}</li>)}</ul>
              </div>
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                <div className="text-sm font-semibold text-white mb-2">Opportunities</div>
                <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1">{competitive.opportunities?.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </div>
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                <div className="text-sm font-semibold text-white mb-2">Keyword gaps</div>
                <div className="text-xs text-slate-500 mb-2">Topics competitors miss or under-emphasise</div>
                <Chips items={competitive.keywordGaps || []} />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

```

# app/plan/[id]/keywords/page.tsx

```tsx
'use client';

import { useState, useEffect, use } from 'react';
import { MarketingPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface KeywordEntry {
  keyword: string;
  volume: number;
  difficulty: number;
  relevance: number;
}

interface KeywordData {
  keywords: KeywordEntry[];
  longTail: KeywordEntry[];
  suggestions: string;
}

function readSessionPlan(id: string): MarketingPlan | null {
  try {
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (!stored) return null;
    return JSON.parse(stored) as MarketingPlan;
  } catch {
    return null;
  }
}

function DifficultyBadge({ value }: { value: number }) {
  const color =
    value < 30
      ? 'bg-green-500/20 text-green-400'
      : value < 60
        ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-red-500/20 text-red-400';
  const label = value < 30 ? 'Easy' : value < 60 ? 'Medium' : 'Hard';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {value} — {label}
    </span>
  );
}

function RelevanceBadge({ value }: { value: number }) {
  const color =
    value >= 80
      ? 'text-blue-400'
      : value >= 50
        ? 'text-slate-300'
        : 'text-slate-500';
  return <span className={`font-medium ${color}`}>{value}%</span>;
}

function KeywordTable({ keywords, title }: { keywords: KeywordEntry[]; title: string }) {
  if (!keywords.length) return null;
  return (
    <Card className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Keyword</th>
              <th className="px-3 py-3 text-right font-medium text-slate-500 dark:text-slate-400">Volume</th>
              <th className="px-3 py-3 text-center font-medium text-slate-500 dark:text-slate-400">Difficulty</th>
              <th className="px-3 py-3 text-center font-medium text-slate-500 dark:text-slate-400">Relevance</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw, i) => (
              <tr key={i} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-3 text-slate-900 dark:text-white">{kw.keyword}</td>
                <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                  {(kw.volume ?? 0).toLocaleString()}
                </td>
                <td className="px-3 py-3 text-center">
                  <DifficultyBadge value={kw.difficulty ?? 0} />
                </td>
                <td className="px-3 py-3 text-center">
                  <RelevanceBadge value={kw.relevance ?? 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <Card className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-4 h-5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 mb-3">
            <div className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function KeywordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [plan, setPlan] = useState<MarketingPlan | null>(() => readSessionPlan(id));
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(() => !readSessionPlan(id));
  const [data, setData] = useState<KeywordData | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState('');

  const storageKey = `keywords-${id}`;

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        setData(JSON.parse(stored) as KeywordData);
        setIsCached(true);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (plan) {
      setPlanLoading(false);
      return;
    }
    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((p) => {
        setPlan(p);
        try { sessionStorage.setItem(`plan-${id}`, JSON.stringify(p)); } catch {}
      })
      .catch(() => setError('Failed to load plan'))
      .finally(() => setPlanLoading(false));
  }, [id, plan]);

  const runResearch = async () => {
    if (!plan) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          appName: plan.config.app_name || '',
          category: plan.config.category || '',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }
      const result: KeywordData = await res.json();
      try { sessionStorage.setItem(storageKey, JSON.stringify(result)); } catch {}
      setData(result);
      setIsCached(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const appName = plan?.config?.app_name || '';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <div className="mb-8 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300">
          Discover high-value ASO keywords for your app — filter by search volume, difficulty score, and relevance to find the terms that will boost your store ranking.
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Keyword Research</h1>
          {data && isCached && (
            <span className="text-xs text-slate-500">Cached · Re-run research to refresh</span>
          )}
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Discover high-value ASO/SEO keywords for{' '}
          <span className="font-medium text-slate-900 dark:text-white">{appName || 'your app'}</span>.
        </p>
      </div>

      {planLoading ? (
        <Skeleton />
      ) : (
        <>
          {!data && !loading && (
            <Card className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-4 text-slate-600 dark:text-slate-400">
                Click below to research relevant keywords using AI-powered analysis.
              </p>
              <Button onClick={runResearch} className="px-6 py-3">
                Research Keywords
              </Button>
            </Card>
          )}

          {loading && <Skeleton />}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500 dark:text-red-400">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-6">
              <KeywordTable keywords={data.keywords} title="Primary Keywords" />
              <KeywordTable keywords={data.longTail} title="Long-Tail Keywords" />

              {data.suggestions && (
                <Card className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
                  <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Strategy Suggestions</h2>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">{data.suggestions}</p>
                </Card>
              )}

              <div className="text-center">
                <Button onClick={runResearch} variant="secondary">
                  Re-run Research
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

```

# app/plan/[id]/layout.tsx

```tsx
import * as React from 'react';

import { PlanSidebar } from '@/components/PlanSidebar';
import { getPlan } from '@/lib/db';

/**
 * Plan page spacing conventions (UX-27)
 * - Page top padding: pt-6
 * - Section gap: mb-8
 * - Card internal padding: p-6
 * - Form field gap: space-y-4
 */

export default async function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let appName = 'Marketing Plan';
  try {
    const row = getPlan(id);
    if (row) {
      const config = JSON.parse(row.config) as { app_name?: string };
      if (config?.app_name) appName = config.app_name;
    }
  } catch {
    // Best-effort only — keep rendering.
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row dark:bg-slate-900">
      <PlanSidebar planId={id} appName={appName} />
      <main className="flex-1 overflow-auto min-w-0 pt-6 page-enter">{children}</main>
    </div>
  );
}

```

# app/plan/[id]/overview/page.tsx

```tsx
import { redirect } from 'next/navigation';

export default async function LegacyOverviewRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The redesign uses /plan/[id] as the primary overview dashboard.
  // Keep this route as an alias to avoid breaking old links.
  redirect(`/plan/${id}`);
}

```

# app/plan/[id]/page.tsx

```tsx
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
          ? 'bg-indigo-50 border-indigo-300/40 hover:border-indigo-400/60 dark:bg-indigo-950/25 dark:border-indigo-500/25 dark:hover:border-indigo-400/40'
          : 'bg-white border-slate-200 hover:border-indigo-300 dark:bg-slate-900/40 dark:border-white/[0.06] dark:hover:border-indigo-500/25')
      }
    >
      <div className="flex items-start gap-4 min-w-0">
        <div
          className={
            'w-10 h-10 rounded-xl flex items-center justify-center border ' +
            (highlight
              ? 'bg-indigo-500/15 border-indigo-500/30'
              : 'bg-indigo-500/10 border-indigo-300/30 dark:border-white/[0.06]')
          }
        >
          <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 truncate dark:text-white">
              {title}
            </h3>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{description}</p>
          {cta && status !== 'ready' && (
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors group-hover:text-indigo-500 dark:text-indigo-300 dark:group-hover:text-indigo-200">
              {cta} <ArrowRight className="w-3.5 h-3.5" />
            </div>
          )}
          {preview && status === 'ready' && (
            <p className="mt-2 text-xs text-slate-500 italic line-clamp-1">{preview}</p>
          )}
        </div>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-600 dark:group-hover:text-indigo-300" />
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/[0.06] dark:bg-slate-900/40">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</div>
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

    const stagesAny = (plan.stages ?? {}) as {
      keywords?: unknown;
      seo?: { keywords?: unknown };
      emails?: unknown;
    };

    const keywordsCount =
      safeCount(stagesAny.keywords) ||
      safeCount(stagesAny.seo?.keywords) ||
      safeCount(plan.scraped?.keywords);

    const featuresCount = plan.scraped?.features?.length || 0;

    const emailSequences = safeCount(stagesAny.emails) || (overview?.sections?.emails?.hasContent ? 1 : 0);

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
        <div className="mb-6 h-32 rounded-2xl border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-slate-900/50" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-slate-900/40"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-slate-900/40"
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
            {plan?.createdAt && (
              <div className="text-xs text-slate-500 mt-2">
                Created <span suppressHydrationWarning>{new Date(plan.createdAt).toLocaleDateString()}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <StatusBadge status={computed.statuses.strategy} />
              <span className="text-xs text-slate-500">Generated</span>
              <span className="text-slate-400 dark:text-slate-700">•</span>
              <StatusBadge status={computed.statuses.content} />
              <span className="text-xs text-slate-500">Content</span>
              <span className="text-slate-400 dark:text-slate-700">•</span>
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
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Your Marketing Plan
        </h2>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
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
      <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-slate-900/40">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">💡 Suggested Next Steps</h2>
        <ol className="space-y-2">
          <li>
            <Link
              href={`/plan/${id}/strategy/brief`}
              className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                1
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">Review your brief</span>
              <span className="ml-auto text-slate-400 dark:text-slate-600">→</span>
            </Link>
          </li>
          <li>
            <Link
              href={`/plan/${id}/distribution`}
              className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-indigo-500/10"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                2
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">
                Generate social posts, images, and video prompts
              </span>
              <span className="ml-auto text-indigo-600 dark:text-indigo-300">→</span>
            </Link>
          </li>
          <li>
            <Link
              href={`/plan/${id}/content`}
              className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                3
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-200">Build your content strategy</span>
              <span className="ml-auto text-slate-400 dark:text-slate-600">→</span>
            </Link>
          </li>
        </ol>
      </div>
    </div>
  );
}

```

# app/plan/[id]/performance/page.tsx

```tsx
'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { PageSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import ErrorRetry from '@/components/ErrorRetry';

type RatingFilter = 'all' | 'unrated' | 'great' | 'good' | 'ok' | 'poor';

type Rating = 'great' | 'good' | 'ok' | 'poor' | null;

interface ScheduleItem {
  id: string;
  plan_id: string;
  platform: string;
  content_type: string;
  topic: string | null;
  scheduled_at: string;
  status: string;
  post_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  performance_rating: Rating;
  performance_notes: string | null;
  performance_metrics: string | null;
}

interface PerformanceSummary {
  total: number;
  rated: number;
  unrated: number;
  distribution: { great: number; good: number; ok: number; poor: number };
  bestPlatform: string | null;
}

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📱',
  tiktok: '🎵',
  twitter: '🐦',
  linkedin: '💼',
  reddit: '📰',
  email: '📧',
};

const RATING_META: Record<Exclude<Rating, null>, { label: string; emoji: string; color: string }> = {
  great: { label: 'Great', emoji: '🔥', color: 'text-green-400 border-green-400/30 bg-green-500/10' },
  good: { label: 'Good', emoji: '👍', color: 'text-blue-400 border-blue-400/30 bg-blue-500/10' },
  ok: { label: 'OK', emoji: '😐', color: 'text-amber-400 border-amber-400/30 bg-amber-500/10' },
  poor: { label: 'Poor', emoji: '👎', color: 'text-red-400 border-red-400/30 bg-red-500/10' },
};

function titleCase(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function formatWhen(ts: string): string {
  const d = new Date(ts.replace(' ', 'T') + 'Z');
  const now = new Date();

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (sameDay(d, now)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';

  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function safeParseMetrics(raw: string | null): { views?: number; likes?: number; clicks?: number } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: { views?: number; likes?: number; clicks?: number } = {};
    for (const key of ['views', 'likes', 'clicks'] as const) {
      const v = parsed[key];
      if (typeof v === 'number') out[key] = v;
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) out[key] = Number(v);
    }
    return out;
  } catch {
    return {};
  }
}

export default function PerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);

  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [metricsOpen, setMetricsOpen] = useState<Record<string, boolean>>({});

  const cacheKey = `performance-${id}`;

  const persistCache = useCallback(
    (nextItems: ScheduleItem[], nextSummary: PerformanceSummary | null) => {
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ items: nextItems, summary: nextSummary, ts: Date.now() })
        );
      } catch {
        // ignore
      }
    },
    [cacheKey]
  );

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${id}/performance-summary`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load performance summary');
      const data = (await res.json()) as { items: ScheduleItem[]; summary: PerformanceSummary };
      setItems(data.items || []);
      setSummary(data.summary || null);
      persistCache(data.items || [], data.summary || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load performance summary');
    }
    setLoading(false);
  }, [id, persistCache]);

  useEffect(() => {
    // hydrate from session storage ASAP
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { items?: ScheduleItem[]; summary?: PerformanceSummary };
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items);
          setSummary(parsed.summary ?? null);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }

    fetchData();
  }, [cacheKey, fetchData]);

  const platforms = useMemo(() => {
    const set = new Set(items.map((i) => i.platform).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const bestPerformers = useMemo(() => {
    return items
      .filter((i) => i.performance_rating === 'great')
      .sort((a, b) => (a.scheduled_at < b.scheduled_at ? 1 : -1))
      .slice(0, 3);
  }, [items]);

  const filteredItems = useMemo(() => {
    let next = items;

    if (platformFilter !== 'all') {
      next = next.filter((i) => i.platform === platformFilter);
    }

    if (ratingFilter === 'unrated') {
      next = next.filter((i) => !i.performance_rating);
    } else if (ratingFilter !== 'all') {
      next = next.filter((i) => i.performance_rating === ratingFilter);
    }

    return next;
  }, [items, platformFilter, ratingFilter]);

  const savePerformance = useCallback(
    async (itemId: string, patch: { rating?: Rating; notes?: string | null; metrics?: { views?: number; likes?: number; clicks?: number } | null }) => {
      const res = await fetch(`/api/content-schedule/${itemId}/performance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const msg = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(msg?.error || 'Failed to save');
      }
    },
    []
  );

  const handleRating = useCallback(
    async (itemId: string, rating: Exclude<Rating, null>) => {
      // optimistic update
      setItems((prev) => {
        const next = prev.map((i) => (i.id === itemId ? { ...i, performance_rating: rating } : i));
        if (summary) {
          const rated = next.filter((i) => i.performance_rating).length;
          const dist = { great: 0, good: 0, ok: 0, poor: 0 };
          for (const it of next) {
            if (it.performance_rating && it.performance_rating in dist) {
              dist[it.performance_rating as keyof typeof dist]++;
            }
          }
          const platformGreat: Record<string, number> = {};
          for (const it of next.filter((i) => i.performance_rating === 'great')) {
            platformGreat[it.platform] = (platformGreat[it.platform] || 0) + 1;
          }
          const bestPlatform =
            Object.entries(platformGreat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

          const nextSummary: PerformanceSummary = {
            ...summary,
            total: next.length,
            rated,
            unrated: next.length - rated,
            distribution: dist,
            bestPlatform,
          };
          setSummary(nextSummary);
          persistCache(next, nextSummary);
        } else {
          persistCache(next, summary);
        }
        return next;
      });

      try {
        await savePerformance(itemId, { rating });
        toast.success('Saved');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to save');
        fetchData();
      }
    },
    [fetchData, persistCache, savePerformance, summary, toast]
  );

  const handleNotesBlur = useCallback(
    async (item: ScheduleItem) => {
      try {
        await savePerformance(item.id, { notes: item.performance_notes ?? null });
        toast.success('Saved');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to save');
        fetchData();
      }
    },
    [fetchData, savePerformance, toast]
  );

  const handleMetricsBlur = useCallback(
    async (item: ScheduleItem, metrics: { views?: number; likes?: number; clicks?: number }) => {
      try {
        await savePerformance(item.id, { metrics });
        toast.success('Saved');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to save');
        fetchData();
      }
    },
    [fetchData, savePerformance, toast]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
          <PageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
          <ErrorRetry error={error} onRetry={fetchData} />
      </div>
    );
  }

  const summaryVisible = !!summary && items.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Performance Tracker</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            See which posts worked — rate your content to learn what resonates.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-200">
            <div className="mb-2 text-lg font-semibold">No scheduled posts yet.</div>
            <div className="mb-4 text-slate-500 dark:text-slate-400">
              Generate a content schedule first, then come back here to track what worked.
            </div>
            <Link
              href={`/plan/${id}/schedule`}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Go to Schedule
            </Link>
          </div>
        ) : (
          <>
            {summaryVisible && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-8">
                <div className="flex flex-wrap gap-2 items-center text-sm">
                  <span className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/50 text-slate-200">
                    Total: {summary.total}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/50 text-slate-200">
                    Rated: {summary.rated}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/50 text-slate-200">
                    🔥 {summary.distribution.great}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/50 text-slate-200">
                    👍 {summary.distribution.good}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/50 text-slate-200">
                    😐 {summary.distribution.ok}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/50 text-slate-200">
                    👎 {summary.distribution.poor}
                  </span>
                </div>
                {summary.bestPlatform && (
                  <div className="mt-3 text-sm text-slate-400">
                    Best platform:{' '}
                    <span className="text-indigo-400 font-medium">{titleCase(summary.bestPlatform)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-slate-400 text-sm mr-1">Filters:</span>
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'unrated', label: 'Unrated' },
                    { key: 'great', label: '🔥' },
                    { key: 'good', label: '👍' },
                    { key: 'ok', label: '😐' },
                    { key: 'poor', label: '👎' },
                  ] as Array<{ key: RatingFilter; label: string }>
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setRatingFilter(f.key)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      ratingFilter === f.key
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-900/60 border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Platform:</span>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="all">All</option>
                  {platforms.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_EMOJI[p] || '📢'} {titleCase(p)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Best performers */}
            {bestPerformers.length > 0 && (
              <div className="mb-6">
                <div className="text-sm font-semibold text-indigo-400 mb-3">Best Performers</div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {bestPerformers.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4"
                    >
                      <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                        <span>{PLATFORM_EMOJI[item.platform] || '📢'}</span>
                        <span className="capitalize">{item.platform}</span>
                        <span>•</span>
                        <span className="capitalize">{item.content_type}</span>
                        <span>•</span>
                        <span>{formatWhen(item.scheduled_at)}</span>
                      </div>
                      <div className="text-slate-200 text-sm line-clamp-3">“{item.topic || 'Untitled post'}”</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const emoji = PLATFORM_EMOJI[item.platform] || '📢';
                const metrics = safeParseMetrics(item.performance_metrics);
                const isMetricsOpen = !!metricsOpen[item.id];

                return (
                  <div
                    key={item.id}
                    className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6"
                  >
                    <div className="text-xs text-slate-400 mb-2 flex flex-wrap items-center gap-2">
                      <span>{emoji}</span>
                      <span className="capitalize">{item.platform}</span>
                      <span>•</span>
                      <span className="capitalize">{item.content_type}</span>
                      <span>•</span>
                      <span>{formatWhen(item.scheduled_at)}</span>
                      <span>•</span>
                      <span className="capitalize">{item.status}</span>
                    </div>

                    <div className="text-slate-200 mb-4">“{item.topic || 'Untitled post'}”</div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {(Object.keys(RATING_META) as Array<Exclude<Rating, null>>).map((r) => {
                        const meta = RATING_META[r];
                        const active = item.performance_rating === r;
                        return (
                          <button
                            key={r}
                            onClick={() => handleRating(item.id, r)}
                            className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                              active
                                ? `${meta.color}`
                                : 'bg-slate-900/40 border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600'
                            }`}
                          >
                            {meta.emoji} {meta.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mb-4">
                      <div className="text-xs text-slate-400 mb-2">Notes</div>
                      <textarea
                        value={item.performance_notes || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItems((prev) => {
                            const next = prev.map((i) =>
                              i.id === item.id ? { ...i, performance_notes: v } : i
                            );
                            persistCache(next, summary);
                            return next;
                          });
                        }}
                        onBlur={() => {
                          const latest = items.find((i) => i.id === item.id);
                          if (latest) handleNotesBlur(latest);
                        }}
                        placeholder="Add notes…"
                        rows={2}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                      />
                    </div>

                    <div className="border-t border-slate-700/40 pt-4">
                      <button
                        onClick={() =>
                          setMetricsOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                      >
                        {isMetricsOpen ? 'Hide metrics' : 'Add metrics'}
                      </button>

                      {isMetricsOpen && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {(
                            [
                              { key: 'views', label: 'Views' },
                              { key: 'likes', label: 'Likes' },
                              { key: 'clicks', label: 'Clicks' },
                            ] as const
                          ).map((f) => (
                            <div key={f.key}>
                              <div className="text-xs text-slate-400 mb-1">{f.label}</div>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={metrics[f.key] ?? ''}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const val = raw === '' ? undefined : Number(raw);
                                  const nextMetrics = { ...metrics, [f.key]: val };

                                  setItems((prev) => {
                                    const next = prev.map((i) =>
                                      i.id === item.id
                                        ? {
                                            ...i,
                                            performance_metrics: JSON.stringify(nextMetrics),
                                          }
                                        : i
                                    );
                                    persistCache(next, summary);
                                    return next;
                                  });
                                }}
                                onBlur={() => {
                                  const latest = items.find((i) => i.id === item.id);
                                  const latestMetrics = safeParseMetrics(latest?.performance_metrics ?? null);
                                  handleMetricsBlur(item, latestMetrics);
                                }}
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                                placeholder="—"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
    </div>
  );
}

```

# app/plan/[id]/preview/page.tsx

```tsx
'use client';

import { useEffect, useMemo, useState, use } from 'react';
import type { MarketingPlan } from '@/lib/types';
import ErrorRetry from '@/components/ErrorRetry';
import DismissableTip from '@/components/DismissableTip';

function clampText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + '…';
}

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f-${i}`} className="text-amber-500">★</span>
      ))}
      {half && <span className="text-amber-500">☆</span>}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e-${i}`} className="text-slate-300">★</span>
      ))}
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 h-[50px] rounded-xl bg-slate-800/60 border border-slate-700 animate-pulse" />
      <div className="rounded-3xl border border-slate-700 bg-white overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex gap-5 items-start">
            <div className="w-20 h-20 rounded-2xl bg-slate-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-6 w-64 bg-slate-200 rounded animate-pulse" />
              <div className="mt-2 h-4 w-72 bg-slate-200 rounded animate-pulse" />
              <div className="mt-4 h-9 w-24 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[9/19.5] rounded-2xl bg-slate-200 animate-pulse"
              />
            ))}
          </div>

          <div className="mt-8 h-5 w-44 bg-slate-200 rounded animate-pulse" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>

          <div className="mt-8 h-5 w-44 bg-slate-200 rounded animate-pulse" />
          <div className="mt-3 h-16 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function PlanPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);

  const [appName, setAppName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [whatsNew, setWhatsNew] = useState('');
  const [rating, setRating] = useState<number>(4.7);
  const [ratingCount, setRatingCount] = useState<number>(12800);
  const [expanded, setExpanded] = useState(false);

  const screenshots = useMemo(() => {
    // Prefer real scraped screenshots if present; fall back to placeholders.
    const scraped = plan?.scraped?.screenshots ?? [];
    if (scraped.length > 0) return scraped.slice(0, 6);
    return Array.from({ length: 5 }).map((_, i) => `placeholder-${i}`);
  }, [plan]);

  const loadPlan = async () => {
    try {
      setPlanLoading(true);
      setPlanError(null);
      const res = await fetch(`/api/plans/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to load plan (${res.status})`);
      }
      const data = (await res.json()) as MarketingPlan;
      setPlan(data);

      // Seed editable fields.
      setAppName(data.config?.app_name || 'Your App');
      setSubtitle(
        data.config?.one_liner ||
        data.scraped?.shortDescription ||
        'A short, store-friendly one-liner that sells the value.'
      );
      setDescription(
        data.scraped?.description ||
        'Write a clear, benefit-led description. Focus on outcomes, not features — then back it up with proof.'
      );
      setWhatsNew(
        '• Improvements & bug fixes\n• Faster onboarding\n• Updated screenshots and copy'
      );
      setRating(data.scraped?.rating ? Number(data.scraped.rating) : 4.7);
      setRatingCount(data.scraped?.ratingCount ? Number(data.scraped.ratingCount) : 12800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plan';
      setPlanError(message);
    } finally {
      setPlanLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (planLoading) return <PreviewSkeleton />;

  if (planError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-slate-300">Plan not found</div>
    );
  }

  const shownDescription = expanded ? description : clampText(description, 520);

  return (
    <div className="max-w-6xl mx-auto">
      <DismissableTip id="preview-tip">See exactly how your app looks in the App Store and Google Play — with your real listing data, so you can spot issues before they go live.</DismissableTip>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">📱 App Store Preview</h1>
          <p className="text-slate-400">
            Tweak your copy inline and see a realistic iOS App Store listing preview.
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-800/40 border border-slate-700 rounded-xl px-3 py-2">
          Tip: Click any editable field
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl border border-slate-700 bg-white overflow-hidden shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
          {/* Header */}
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                {plan.config.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={plan.config.icon}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-slate-600 font-semibold">
                    {appName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full text-xl font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded px-1 -mx-1"
                  aria-label="App name"
                />
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full mt-1 text-sm text-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded px-1 -mx-1"
                  aria-label="Subtitle"
                />

                <div className="mt-4 flex items-center gap-3">
                  <button className="bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-full pointer-events-none cursor-default opacity-75" title="Preview only — not a real button">
                    Get
                  </button>
                  <div className="text-xs text-slate-500">In-App Purchases</div>
                </div>
              </div>
            </div>

            {/* Rating row */}
            <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                  {rating.toFixed(1)}
                </div>
                <div>
                  <Stars value={rating} />
                  <div className="text-xs text-slate-500 mt-0.5">
                    {ratingCount.toLocaleString()} Ratings
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500">Edit rating</div>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-20 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Rating"
                />
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={ratingCount}
                  onChange={(e) => setRatingCount(Number(e.target.value))}
                  className="w-28 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Rating count"
                />
              </div>
            </div>
          </div>

          {/* Screenshots */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-900">Preview</div>
              <div className="text-xs text-slate-500">iPhone</div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {screenshots.map((s) => (
                <div
                  key={s}
                  className="w-[160px] sm:w-[180px] aspect-[9/19.5] rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 overflow-hidden shrink-0"
                >
                  {typeof s === 'string' && s.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full p-4 flex flex-col justify-end">
                      <div className="text-[11px] text-slate-500">Screenshot {String(s).split('-').pop()}</div>
                      <div className="mt-2 h-2 w-20 bg-slate-200 rounded" />
                      <div className="mt-2 h-2 w-28 bg-slate-200 rounded" />
                      <div className="mt-2 h-2 w-16 bg-slate-200 rounded" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-slate-100">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-slate-900">Description</div>
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-blue-600 hover:text-blue-500 text-sm font-semibold"
                >
                  {expanded ? 'Less' : 'More'}
                </button>
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="mt-3 w-full text-sm text-slate-700 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap leading-6"
                aria-label="Description"
              />
              {!expanded && description.length > 520 && (
                <div className="text-xs text-slate-400 mt-1">
                  Showing {shownDescription.length} / {description.length} chars
                </div>
              )}
            </div>
          </div>

          {/* What's New */}
          <div className="border-t border-slate-100">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-slate-900">What’s New</div>
                <div className="text-xs text-slate-500">Version 1.4.0</div>
              </div>

              <textarea
                value={whatsNew}
                onChange={(e) => setWhatsNew(e.target.value)}
                rows={4}
                className="mt-3 w-full text-sm text-slate-700 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
                aria-label="What's new"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          Click any field on the card above to edit inline. This preview is visual-only — changes aren&apos;t saved back to the plan.
        </div>
      </div>
    </div>
  );
}

```

# app/plan/[id]/reviews/page.tsx

```tsx
'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import ErrorRetry from '@/components/ErrorRetry';
import { DraftSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';
import DismissableTip from '@/components/DismissableTip';

type Review = {
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
};

type Sentiment = {
  sentiment: { positive: number; neutral: number; negative: number };
  themes: Array<{ topic: string; count: number; sentiment: 'positive' | 'neutral' | 'negative' }>;
  summary: string;
};

function StarRow({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <div className="flex items-center gap-1" aria-label={`${r} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < r ? 'text-blue-300' : 'text-slate-700'}>
          ★
        </span>
      ))}
    </div>
  );
}

function SentimentBadge({ rating }: { rating: number }) {
  const s = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative';
  const cls =
    s === 'positive'
      ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200'
      : s === 'negative'
        ? 'bg-rose-950/40 border-rose-800/40 text-rose-200'
        : 'bg-slate-900/50 border-slate-700/50 text-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {s}
    </span>
  );
}

function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800/70 ${className}`} />;
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="space-y-2 flex-1">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-24" />
            </div>
            <Bone className="h-6 w-16 rounded-full" />
          </div>
          <Bone className="h-3 w-3/4 mb-2" />
          <Bone className="h-3 w-full mb-2" />
          <Bone className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

export default function ReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { plan, loading: planLoading, error: planError, reload: loadPlan } = usePlan(id);

  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState<number | null>(null);

  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [sentiment, setSentiment] = useState<Sentiment | null>(null);

  const { success: toastOk, error: toastErr } = useToast();

  // Restore cached page state
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`reviews-${id}`);
      if (cached) {
        const o = JSON.parse(cached);
        if (typeof o.appStoreUrl === 'string') setAppStoreUrl(o.appStoreUrl);
        if (Array.isArray(o.reviews)) setReviews(o.reviews);
        if (typeof o.averageRating === 'number') setAverageRating(o.averageRating);
        if (typeof o.totalReviews === 'number') setTotalReviews(o.totalReviews);
        if (o.sentiment) setSentiment(o.sentiment);
      }
    } catch {
      // ignore
    }
  }, [id]);

  const persist = (patch: Partial<{ appStoreUrl: string; reviews: Review[]; averageRating: number | null; totalReviews: number | null; sentiment: Sentiment | null }>) => {
    const payload = {
      appStoreUrl: patch.appStoreUrl ?? appStoreUrl,
      reviews: patch.reviews ?? reviews,
      averageRating: patch.averageRating ?? averageRating,
      totalReviews: patch.totalReviews ?? totalReviews,
      sentiment: patch.sentiment ?? sentiment,
    };
    sessionStorage.setItem(`reviews-${id}`, JSON.stringify(payload));
  };

  const canAnalyze = reviews.length > 0 && !analyzing;

  const ratingSummary = useMemo(() => {
    if (!reviews.length) return null;
    const avg = Math.round((reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) * 10) / 10;
    return avg;
  }, [reviews]);

  const scrapeReviews = async () => {
    setScraping(true);
    setSentiment(null);
    try {
      const r = await fetch('/api/scrape-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id, appStoreUrl }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');

      setReviews(Array.isArray(d.reviews) ? d.reviews : []);
      setAverageRating(typeof d.averageRating === 'number' ? d.averageRating : null);
      setTotalReviews(typeof d.totalReviews === 'number' ? d.totalReviews : null);
      persist({ reviews: d.reviews, averageRating: d.averageRating, totalReviews: d.totalReviews, sentiment: null, appStoreUrl });
      toastOk('Reviews loaded');
    } catch (e) {
      toastErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setScraping(false);
    }
  };

  const analyzeSentiment = async () => {
    setAnalyzing(true);
    try {
      const r = await fetch('/api/review-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id, reviews }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');
      setSentiment(d);
      persist({ sentiment: d });
      toastOk('Sentiment analysis ready');
    } catch (e) {
      toastErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (planLoading) return <DraftSkeleton />;
  if (planError)
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  if (!plan)
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto">
      <DismissableTip id="reviews-tip">Monitor your App Store reviews, analyse sentiment trends, and surface the most common user themes — so you know what&apos;s working and what to fix next.</DismissableTip>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">⭐ Review Monitoring</h1>
          <p className="text-slate-400">Scrape App Store reviews and extract themes &amp; sentiment for {plan.config.app_name}</p>
        </div>
      </div>

      <section className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-6 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">📥 Load reviews</h2>
            <p className="text-sm text-slate-500">Paste an App Store URL. We’ll attempt direct scraping, with research fallback if needed.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={scrapeReviews}
              disabled={scraping || !appStoreUrl.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              {scraping ? 'Scraping…' : reviews.length ? '🔄 Re-scrape' : 'Scrape Reviews'}
            </button>
            <button
              onClick={analyzeSentiment}
              disabled={!canAnalyze}
              className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/60 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors border border-slate-700"
            >
              {analyzing ? 'Analyzing…' : 'Analyze Sentiment'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-400">App Store URL</label>
            <input
              value={appStoreUrl}
              onChange={(e) => {
                setAppStoreUrl(e.target.value);
                persist({ appStoreUrl: e.target.value });
              }}
              placeholder="https://apps.apple.com/..."
              className="mt-1 w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
            />
          </div>
          <div className="bg-slate-950/30 border border-slate-800/60 rounded-2xl p-4">
            <div className="text-xs text-slate-500">Quick stats</div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-400">Loaded</span><span className="text-white font-semibold">{reviews.length}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Avg rating</span><span className="text-white font-semibold">{typeof averageRating === 'number' ? averageRating.toFixed(1) : ratingSummary?.toFixed(1) || '—'}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Total reviews</span><span className="text-white font-semibold">{typeof totalReviews === 'number' ? totalReviews.toLocaleString() : '—'}</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Reviews */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">🗣️ Reviews</h2>
            <div className="text-xs text-slate-500">Showing up to 12</div>
          </div>

          {scraping ? (
            <ReviewsSkeleton />
          ) : !reviews.length ? (
            <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-6 text-sm text-slate-500">
              No reviews loaded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 12).map((rv, i) => (
                <div key={`${rv.author}-${rv.title}-${i}`} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-white font-semibold truncate">{rv.title || '(No title)'}</div>
                        <SentimentBadge rating={rv.rating} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span className="text-slate-300">{rv.author || 'Anonymous'}</span>
                        <span>•</span>
                        <StarRow rating={rv.rating} />
                        {rv.date ? (
                          <>
                            <span>•</span>
                            <span>{rv.date}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {rv.body || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sentiment */}
        <section className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-white mb-3">🧠 Sentiment &amp; themes</h2>

          {!sentiment ? (
            <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-6 text-sm text-slate-500">
              Run “Analyze Sentiment” after you’ve loaded reviews.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-950/30 border border-slate-800/60 rounded-2xl p-4">
                <div className="text-xs text-slate-500">Overall sentiment</div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-200">Positive</span>
                    <span className="text-white font-semibold">{sentiment.sentiment.positive}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200">Neutral</span>
                    <span className="text-white font-semibold">{sentiment.sentiment.neutral}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rose-200">Negative</span>
                    <span className="text-white font-semibold">{sentiment.sentiment.negative}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/30 border border-slate-800/60 rounded-2xl p-4">
                <div className="text-xs text-slate-500 mb-2">Themes</div>
                <div className="space-y-2">
                  {sentiment.themes?.length ? (
                    sentiment.themes.map((t, i) => {
                      const cls =
                        t.sentiment === 'positive'
                          ? 'border-emerald-800/40 text-emerald-200 bg-emerald-950/20'
                          : t.sentiment === 'negative'
                            ? 'border-rose-800/40 text-rose-200 bg-rose-950/20'
                            : 'border-slate-700/60 text-slate-200 bg-slate-900/30';
                      return (
                        <div key={`${t.topic}-${i}`} className={`border rounded-xl px-3 py-2 ${cls}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold truncate">{t.topic}</div>
                            <div className="text-xs text-white/90">{t.count}</div>
                          </div>
                          <div className="text-xs opacity-80 mt-0.5">{t.sentiment}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-500">No themes returned.</div>
                  )}
                </div>
              </div>

              <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-4">
                <div className="text-xs text-blue-200/80 mb-2">Summary</div>
                <div className="text-sm text-slate-100 leading-relaxed">{sentiment.summary}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

```

# app/plan/[id]/schedule/page.tsx

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface ScheduleItem {
  id: string;
  plan_id: string;
  platform: string;
  content_type: string;
  topic: string | null;
  scheduled_at: string;
  status: string;
  post_id: string | null;
  error: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  generating: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  posted: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
};

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() + 1 + offset * 7); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function SchedulePage() {
  const params = useParams();
  const planId = params.id as string;

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');

  // Add form state
  const [addDate, setAddDate] = useState('');
  const [addTime, setAddTime] = useState('12:00');
  const [addPlatform, setAddPlatform] = useState('instagram');
  const [addType, setAddType] = useState('post');
  const [addTopic, setAddTopic] = useState('');

  const weekDates = getWeekDates(weekOffset);
  const from = formatDate(weekDates[0]);
  const to = formatDate(weekDates[6]) + ' 23:59:59';

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-schedule?planId=${planId}&from=${from}&to=${to}`);
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [planId, from, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSchedules();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchSchedules]);

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const res = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, platform, startDate, days: 7 }),
      });
      if (res.ok) {
        await fetchSchedules();
      }
    } catch { /* ignore */ }
    setGenerating(false);
  };

  const handleAdd = async () => {
    if (!addDate) return;
    const scheduledAt = `${addDate} ${addTime}:00`;
    await fetch('/api/content-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        platform: addPlatform,
        contentType: addType,
        topic: addTopic || undefined,
        scheduledAt,
      }),
    });
    setShowAddModal(false);
    setAddTopic('');
    fetchSchedules();
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/content-schedule?id=${id}`, { method: 'DELETE' });
    setSelectedItem(null);
    fetchSchedules();
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return schedules.filter(s => s.scheduled_at.startsWith(dateStr));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <div className="mb-8 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300">
          Schedule posts for auto-publishing across your connected platforms — set a date and time, then let the system handle generation and posting.
      </div>

      <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Content Schedule</h1>
          <div className="flex gap-2">
            <Select
              value={platform}
              onChange={e => setPlatform(e.target.value as 'instagram' | 'tiktok')}
              className="h-auto w-auto rounded-lg border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="instagram">📸 Instagram</option>
              <option value="tiktok">🎵 TikTok</option>
            </Select>
            <Button
              onClick={() => { setAddDate(formatDate(weekDates[0])); setShowAddModal(true); }}
              variant="secondary"
              className="h-auto px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Add Post
            </Button>
            <Button
              onClick={handleAutoGenerate}
              disabled={generating}
              className="h-auto px-4 py-2 rounded-lg text-sm font-medium"
            >
              {generating ? '⏳ Generating…' : '✨ Auto-generate Week'}
            </Button>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={() => setWeekOffset(w => w - 1)}
            variant="ghost"
            size="sm"
            className="h-auto px-3 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            ← Prev
          </Button>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {dayLabel(weekDates[0])} — {dayLabel(weekDates[6])}
          </span>
          <Button
            onClick={() => setWeekOffset(w => w + 1)}
            variant="ghost"
            size="sm"
            className="h-auto px-3 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Next →
          </Button>
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 dark:text-slate-400">Loading…</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map(date => {
              const items = getItemsForDate(date);
              const isToday = formatDate(date) === formatDate(new Date());
              return (
                <div
                  key={formatDate(date)}
                  className={`min-h-[160px] rounded-xl border p-3 ${
                    isToday
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className={`mb-2 text-xs font-medium ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                    {dayLabel(date)}
                  </div>
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`w-full text-left p-2 rounded-lg border text-xs transition-colors hover:brightness-110 ${
                          STATUS_COLORS[item.status] || STATUS_COLORS.scheduled
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span>{PLATFORM_EMOJI[item.platform] || '📱'}</span>
                          <span className="font-medium">{formatTime(item.scheduled_at)}</span>
                        </div>
                        <div className="truncate text-[11px] opacity-80">
                          {item.topic || item.content_type}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedItem(null)}>
            <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Scheduled Post</h3>
              <div className="space-y-4 text-sm">
                <div className="text-slate-700 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">Platform:</span> {PLATFORM_EMOJI[selectedItem.platform]} {selectedItem.platform}</div>
                <div className="text-slate-700 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">Type:</span> {selectedItem.content_type}</div>
                <div className="text-slate-700 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">Scheduled:</span> {selectedItem.scheduled_at}</div>
                <div className="text-slate-700 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">Topic:</span> {selectedItem.topic || '—'}</div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Status:</span>{' '}
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[selectedItem.status]}`}>
                    {selectedItem.status}
                  </span>
                </div>
                {selectedItem.error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs">
                    {selectedItem.error}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                {selectedItem.status === 'scheduled' && (
                  <Button
                    onClick={() => handleCancel(selectedItem.id)}
                    variant="destructive"
                    className="h-auto px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Cancel Post
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedItem(null)}
                  variant="secondary"
                  className="h-auto px-4 py-2 rounded-lg text-sm font-medium ml-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
            <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Add Scheduled Post</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Date</Label>
                  <Input
                    type="date"
                    value={addDate}
                    onChange={e => setAddDate(e.target.value)}
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Time</Label>
                  <Input
                    type="time"
                    value={addTime}
                    onChange={e => setAddTime(e.target.value)}
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Platform</Label>
                  <Select
                    value={addPlatform}
                    onChange={e => setAddPlatform(e.target.value)}
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="instagram">📸 Instagram</option>
                    <option value="tiktok">🎵 TikTok</option>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Content Type</Label>
                  <Select
                    value={addType}
                    onChange={e => setAddType(e.target.value)}
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="post">Post</option>
                    <option value="reel">Reel</option>
                    <option value="story">Story</option>
                    <option value="carousel">Carousel</option>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Topic (optional)</Label>
                  <Input type="text" value={addTopic} onChange={e => setAddTopic(e.target.value)}
                    placeholder="e.g. 5 tips for better productivity"
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAdd}
                  className="h-auto px-4 py-2 rounded-lg text-sm font-medium">
                  Add
                </Button>
                <Button onClick={() => setShowAddModal(false)}
                  variant="secondary"
                  className="h-auto px-4 py-2 rounded-lg text-sm font-medium">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

```

# app/plan/[id]/seo/page.tsx

```tsx
import { Monitor, Search, Sparkles } from 'lucide-react';

import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

export default async function SeoHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PlanPageShell
      title="SEO & ASO"
      description="Improve discoverability with keyword targeting, preview checks, and variant testing."
      helper="Recommended order: Keywords -> SERP Preview -> Variants"
    >
      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/keywords`}
          title="Keywords"
          description="Keyword ideas and targeting strategy"
          icon={Search}
        />
        <PlanLinkCard
          href={`/plan/${id}/serp`}
          title="SERP Preview"
          description="How your title and description look in search results"
          icon={Monitor}
        />
        <PlanLinkCard
          href={`/plan/${id}/variants`}
          title="Variants"
          description="Alternative positioning angles and copy variants"
          icon={Sparkles}
        />
      </div>
    </PlanPageShell>
  );
}

```

# app/plan/[id]/serp/page.tsx

```tsx
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { MarketingPlan } from '@/lib/types';
import { SerpPreview } from '@/components/SerpPreview';
import { SerpSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';

function readSessionPlan(id: string): MarketingPlan | null {
  try {
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (!stored) return null;
    return JSON.parse(stored) as MarketingPlan;
  } catch {
    return null;
  }
}

export default function SerpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [plan, setPlan] = useState<MarketingPlan | null>(() => readSessionPlan(id));
  const [loading, setLoading] = useState(() => !readSessionPlan(id));
  const [fetchError, setFetchError] = useState('');
  const [title, setTitle] = useState(() => {
    const p = readSessionPlan(id);
    if (!p) return '';
    return `${p.config.app_name || ''} — ${p.config.one_liner || ''}`;
  });
  const [url, setUrl] = useState(() => readSessionPlan(id)?.config.app_url || '');
  const [description, setDescription] = useState(() => readSessionPlan(id)?.config.one_liner || '');
  const [isCached, setIsCached] = useState(false);

  const storageKey = `serp-${id}`;

  const initializeFields = useCallback((planData: MarketingPlan) => {
    const appName = planData.config.app_name || '';
    const oneLiner = planData.config.one_liner || '';
    const appUrl = planData.config.app_url || '';

    setTitle(`${appName} — ${oneLiner}`);
    setUrl(appUrl);
    setDescription(oneLiner);
  }, []);

  const loadFromDb = useCallback(() => {
    setLoading(true);
    setFetchError('');
    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((data) => {
        setPlan(data);
        initializeFields(data);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setLoading(false));
  }, [id, initializeFields]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { title?: string; url?: string; description?: string };
      const timer = window.setTimeout(() => {
        if (typeof parsed.title === 'string') setTitle(parsed.title);
        if (typeof parsed.url === 'string') setUrl(parsed.url);
        if (typeof parsed.description === 'string') setDescription(parsed.description);
        setIsCached(true);
      }, 0);
      return () => window.clearTimeout(timer);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    // If we already loaded from sessionStorage, skip
    if (plan) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState calls are in async .then() callbacks, not synchronous
    loadFromDb();
  }, [plan, loadFromDb]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ title, url, description }));
    } catch {
      /* ignore */
    }
  }, [storageKey, title, url, description]);

  if (loading) {
    return <SerpSkeleton />;
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
        <p className="text-sm text-slate-500 mb-4">This plan may have been deleted or doesn&apos;t exist.</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Preview how your app appears in Google search results — tweak your title and meta description to maximise click-through from organic search.
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-4 min-w-0 mb-2">
          {plan.config.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white break-words">SERP Preview: {plan.config.app_name}</h1>
              {isCached && (
                <span className="text-xs text-slate-500">Cached</span>
              )}
            </div>
            <p className="text-slate-400 break-words">Preview how your site appears in Google search results</p>
          </div>
        </div>
      </div>

      <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm text-indigo-300 space-y-1">
            <p className="font-medium">SEO Best Practices:</p>
            <ul className="list-disc list-inside space-y-1 text-indigo-300/80">
              <li>Keep titles under 60 characters for full display</li>
              <li>Keep descriptions under 160 characters to avoid truncation</li>
              <li>Include your main keyword in both title and description</li>
              <li>Make the description compelling to improve click-through rate</li>
            </ul>
          </div>
        </div>
      </div>

      <SerpPreview
        title={title}
        url={url}
        description={description}
        editable={true}
        onTitleChange={setTitle}
        onUrlChange={setUrl}
        onDescriptionChange={setDescription}
      />

      <div className="mt-8 text-center">
        <div className="inline-flex gap-3">
          <a
            href={`/plan/${id}`}
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            ← Back to Plan
          </a>
          <a
            href={`/plan/${id}/assets`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            View Assets →
          </a>
        </div>
      </div>
    </div>
  );
}

```

# app/plan/[id]/social/page.tsx

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Platform = 'instagram' | 'tiktok';

interface SocialPost {
  id: number;
  plan_id: string;
  platform: string;
  caption: string;
  hashtags: string;
  method: string;
  status: string;
  created_at: string;
}

type GeneratedIdea = {
  caption: string;
  hashtags: string[];
};

type ImageResult = {
  filename: string;
  publicUrl: string;
  fullPublicUrl?: string;
};

export default function SocialPage() {
  const params = useParams();
  const planId = params.id as string;

  // Step 1
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

  // Step 2
  const [ideaGenerating, setIdeaGenerating] = useState(false);
  const [ideaError, setIdeaError] = useState<string>('');
  const [idea, setIdea] = useState<GeneratedIdea | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');

  // Step 3
  const [imageMode, setImageMode] = useState<'screenshot' | 'hero' | 'hybrid'>('hybrid');
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageError, setImageError] = useState('');
  const [image, setImage] = useState<ImageResult | null>(null);

  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoOperation, setVideoOperation] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null);
  const [videoElapsed, setVideoElapsed] = useState(0);

  // Step 4
  const [queueing, setQueueing] = useState(false);
  const [queueResult, setQueueResult] = useState<{ ok: boolean; message: string } | null>(null);

  // History
  const [history, setHistory] = useState<SocialPost[]>([]);

  // Visibility gates
  const canShowStep2 = selectedPlatform !== null;
  const canShowStep3AndStep4 = idea !== null;

  const hashtagsArray = useMemo(() => {
    if (!hashtagsInput.trim()) return [] as string[];
    return hashtagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [hashtagsInput]);

  // Load history on mount
  useEffect(() => {
    fetch('/api/post-to-buffer')
      .then((r) => r.json())
      .then((d) => setHistory(d.posts || []))
      .catch(() => {});
  }, []);

  // Elapsed timer for video progress bar
  useEffect(() => {
    if (!videoOperation || videoUrl || !videoStartTime) return;

    const timer = setInterval(() => {
      setVideoElapsed(Math.floor((Date.now() - videoStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [videoOperation, videoUrl, videoStartTime]);

  // Poll video status every 10s while operation exists and URL not ready
  useEffect(() => {
    if (!videoOperation || videoUrl) return;

    let cancelled = false;

    async function pollOnce() {
      try {
        const res = await fetch(
          `/api/generate-video/status?operation=${encodeURIComponent(videoOperation)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to poll video status');
        if (cancelled) return;

        if (data?.done === true && data?.videoUrl) {
          setVideoUrl(String(data.videoUrl));
          setVideoGenerating(false);
        }
      } catch (err) {
        if (cancelled) return;
        setVideoError(err instanceof Error ? err.message : 'Failed to poll status');
        setVideoGenerating(false);
      }
    }

    pollOnce();
    const t = setInterval(pollOnce, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [videoOperation, videoUrl]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function generateIdea() {
    if (!selectedPlatform) return;

    setIdeaGenerating(true);
    setIdeaError('');
    setQueueResult(null);

    try {
      const res = await fetch('/api/generate-social-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, platform: selectedPlatform }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      const p = data?.post || {};
      const nextCaption = typeof p.caption === 'string' ? p.caption : '';
      const nextHashtags = Array.isArray(p.hashtags) ? p.hashtags : [];

      setIdea({ caption: nextCaption, hashtags: nextHashtags });
      setCaption(nextCaption);
      setHashtagsInput(nextHashtags.join(', '));

      // Reset media when regenerating
      setImage(null);
      setImageError('');
      setVideoOperation('');
      setVideoUrl('');
      setVideoError('');
    } catch (err) {
      setIdeaError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIdeaGenerating(false);
    }
  }

  async function generateImage() {
    if (!selectedPlatform) return;
    if (!caption.trim()) {
      setImageError('Caption is empty — generate or write a caption first.');
      return;
    }

    setImageGenerating(true);
    setImageError('');
    setQueueResult(null);

    try {
      // Generate an image brief from the caption hook (best-effort). If it fails, we still render.
      let imageBrief: unknown = null;
      try {
        const briefRes = await fetch('/api/caption-to-image-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption, platform: selectedPlatform }),
        });
        if (briefRes.ok) imageBrief = await briefRes.json();
      } catch {
        // ignore
      }

      const res = await fetch('/api/generate-post-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, platform: 'instagram-post', caption, visualMode: imageMode, imageBrief }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate image');

      setImage({
        filename: String(data.filename),
        publicUrl: String(data.publicUrl),
        fullPublicUrl: data.fullPublicUrl ? String(data.fullPublicUrl) : undefined,
      });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setImageGenerating(false);
    }
  }

  async function generateVideo() {
    if (!selectedPlatform) return;
    if (!caption.trim()) {
      setVideoError('Caption is empty — generate or write a caption first.');
      return;
    }

    setVideoGenerating(true);
    setVideoError('');
    setVideoOperation('');
    setVideoUrl('');
    setVideoStartTime(null);
    setVideoElapsed(0);
    setQueueResult(null);

    try {
      // 1) Convert caption → Veo prompt
      const promptRes = await fetch('/api/caption-to-veo-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      const promptData = await promptRes.json();
      if (!promptRes.ok) throw new Error(promptData.error || 'Failed to create Veo prompt');

      const veoPrompt = String(promptData.prompt || '').trim();
      if (!veoPrompt) throw new Error('Empty Veo prompt returned');

      // 2) Start Veo video generation
      const aspectRatio = selectedPlatform === 'tiktok' ? '9:16' : '1:1';

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, prompt: veoPrompt, aspectRatio }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start video generation');

      setVideoOperation(String(data.operationName || ''));
      setVideoStartTime(Date.now());
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Failed to generate video');
      setVideoGenerating(false);
    }
  }

  async function queueToBuffer() {
    if (!selectedPlatform) return;

    setQueueing(true);
    setQueueResult(null);

    try {
      const res = await fetch('/api/post-to-buffer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          platform: selectedPlatform,
          caption,
          hashtags: hashtagsArray,
          ...(image?.filename ? { imageFilename: image.filename } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue');

      setQueueResult({ ok: true, message: `✅ Queued to ${selectedPlatform}` });

      // Refresh history
      const histRes = await fetch('/api/post-to-buffer');
      const histData = await histRes.json();
      setHistory(histData.posts || []);
    } catch (err) {
      setQueueResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to queue to Buffer',
      });
    } finally {
      setQueueing(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-6 text-slate-900 dark:text-white">

        {/* Page description */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300">
          Generate platform-native captions and hashtags for Instagram and TikTok, optionally create
          media, then queue directly via Buffer.
        </div>

        <h1 className="text-3xl font-bold mb-2">Social Publishing</h1>
        <p className="mb-8 text-slate-600 dark:text-slate-400">A simple 4-step flow to generate, create, and queue posts.</p>

        {/* ── Step 1 ─ Choose channel ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
          <h2 className="text-xl font-semibold mb-1">Step 1 · Choose channel</h2>
          <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">Pick the platform you want to post to.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedPlatform('instagram')}
              className={`text-left rounded-2xl border p-5 transition-all ${
                selectedPlatform === 'instagram'
                  ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500/30'
                  : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 dark:hover:border-slate-600'
              }`}
            >
              <div className="text-3xl mb-3">📸</div>
              <div className="text-lg font-semibold mb-1">Instagram</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Square-first content, rich captions and up to 30 hashtags.
              </div>
              {selectedPlatform === 'instagram' && (
                <div className="mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">✓ Selected</div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlatform('tiktok')}
              className={`text-left rounded-2xl border p-5 transition-all ${
                selectedPlatform === 'tiktok'
                  ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500/30'
                  : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 dark:hover:border-slate-600'
              }`}
            >
              <div className="text-3xl mb-3">🎵</div>
              <div className="text-lg font-semibold mb-1">TikTok</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Vertical-first, punchy copy and trending hashtags (3–5 max).
              </div>
              {selectedPlatform === 'tiktok' && (
                <div className="mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">✓ Selected</div>
              )}
            </button>
          </div>
        </section>

        {/* ── Step 2 ─ Generate post idea ─────────────────────────────────── */}
        {canShowStep2 && (
          <>
            <div className="my-8 h-px bg-slate-300 dark:bg-slate-800" />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
              <h2 className="text-xl font-semibold mb-1">Step 2 · Generate post idea</h2>
              <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
                AI will write a{' '}
                <span className="capitalize">{selectedPlatform}</span>-optimised caption and hashtags.
              </p>

              {!idea && (
                <button
                  type="button"
                  onClick={generateIdea}
                  disabled={ideaGenerating}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                  {ideaGenerating ? '✨ Generating…' : 'Generate Post Idea'}
                </button>
              )}

              {ideaError && (
                <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                  {ideaError}
                </div>
              )}

              {idea && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Caption
                      </label>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={6}
                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Hashtags{' '}
                        <span className="text-slate-500 font-normal">(comma-separated)</span>
                      </label>
                      <input
                        value={hashtagsInput}
                        onChange={(e) => setHashtagsInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500"
                        placeholder="e.g. appmarketing, saas, creator"
                      />
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-300/70 pt-4 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={generateIdea}
                      disabled={ideaGenerating}
                      className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 dark:disabled:bg-slate-800"
                    >
                      {ideaGenerating ? '✨ Regenerating…' : '↺ Regenerate'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Steps 3 & 4 — only visible after a post idea is generated ────── */}
        {canShowStep3AndStep4 && (
          <>
            {/* ── Step 3 ─ Create media (optional) ──────────────────────── */}
            <div className="my-8 h-px bg-slate-300 dark:bg-slate-800" />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
              <h2 className="text-xl font-semibold mb-1">
                Step 3 · Create media{' '}
                <span className="text-slate-500 font-normal text-base">(optional)</span>
              </h2>
              <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
                Generate an image or video tailored to your post idea.
              </p>

              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setImageMode('screenshot')}
                  className={`text-left rounded-xl border px-4 py-3 transition-all ${
                    imageMode === 'screenshot'
                      ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">Screenshot</div>
                  <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Real UI. Safe and accurate.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('hero')}
                  className={`text-left rounded-xl border px-4 py-3 transition-all ${
                    imageMode === 'hero'
                      ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">Hero image</div>
                  <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Inspiring visual. No screenshot.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('hybrid')}
                  className={`text-left rounded-xl border px-4 py-3 transition-all ${
                    imageMode === 'hybrid'
                      ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">Hybrid</div>
                  <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Hero + small UI card.</div>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={generateImage}
                  disabled={imageGenerating}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                  {imageGenerating ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Generating image…
                    </>
                  ) : (
                    <>🖼 Generate Image</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={generateVideo}
                  disabled={videoGenerating}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                  {videoGenerating ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Generating video…
                    </>
                  ) : (
                    <>🎬 Generate Video (Veo 2)</>
                  )}
                </button>
              </div>

              {imageError && (
                <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                  {imageError}
                </div>
              )}

              {videoError && (
                <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                  {videoError}
                </div>
              )}

              {/* Image preview */}
              {image && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">✅ Image ready</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.publicUrl}
                    alt="Generated post image"
                    className="w-full max-w-sm rounded-xl border border-slate-300 dark:border-slate-700"
                  />
                  <div className="text-xs text-slate-500 mt-2 break-all">{image.filename}</div>
                </div>
              )}

              {/* Video polling state — progress bar */}
              {videoOperation && !videoUrl && (() => {
                const TOTAL_SECONDS = 90;
                const progress = Math.min(videoElapsed / TOTAL_SECONDS, 0.95);
                const remaining = Math.max(TOTAL_SECONDS - videoElapsed, 0);
                const remainingLabel = remaining > 0 ? `~${remaining}s remaining` : 'Almost done…';

                return (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl animate-pulse">🎬</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-200">Generating video…</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Veo 2 typically takes ~90 seconds
                        </div>
                      </div>
                      <div className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {remainingLabel}
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-700">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-right text-xs text-slate-500 dark:text-slate-600">
                      {videoElapsed}s elapsed
                    </div>
                  </div>
                );
              })()}

              {/* Video download */}
              {videoUrl && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">✅ Video ready</div>
                  <a
                    href={`/api/download-video?uri=${encodeURIComponent(videoUrl)}`}
                    download="promo-video.mp4"
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                  >
                    ⬇️ Download MP4
                  </a>
                </div>
              )}
            </section>

            {/* ── Step 4 ─ Queue to Buffer ───────────────────────────────── */}
            <div className="my-8 h-px bg-slate-300 dark:bg-slate-800" />

            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
              <h2 className="text-xl font-semibold mb-1">Step 4 · Queue to Buffer</h2>
              <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
                {image
                  ? 'Your post will be queued with the generated image attached.'
                  : 'Your post will be queued as text + hashtags (no media).'}
              </p>

              <button
                type="button"
                onClick={queueToBuffer}
                disabled={queueing}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                {queueing ? 'Queueing…' : 'Add to Buffer Queue'}
              </button>

              {queueResult && (
                <div
                  className={`mt-4 rounded-xl border p-3 text-sm ${
                    queueResult.ok
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                  }`}
                >
                  {queueResult.message}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Posting History ─────────────────────────────────────────────── */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/30">
          <h2 className="text-lg font-semibold mb-4">Posting History</h2>
          {history.length === 0 ? (
            <p className="text-slate-500 text-sm">No posts yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium capitalize">{post.platform}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        post.status === 'queued'
                          ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : post.status === 'failed'
                            ? 'border border-red-300 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200'
                            : 'border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {post.status}
                    </span>
                    <span className="text-xs text-slate-500 ml-auto">{post.created_at}</span>
                  </div>
                  <div className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {post.caption}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}

```

# app/plan/[id]/strategy/brief/page.tsx

```tsx
'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { PlanDetailSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import ExportBundleButton from '@/components/ExportBundleButton';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="text-indigo-400 hover:text-indigo-300 underline"
    >
      {children}
    </a>
  ),
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-sm sm:text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1"
    >
      {copied ? '✓ Copied' : `📋 ${label || 'Copy'}`}
    </button>
  );
}

export default function StrategyBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { plan, loading, error, reload: loadPlan } = usePlan(id);

  const { error: toastError } = useToast();

  const [pdfExporting, setPdfExporting] = useState(false);


  if (loading) return <PlanDetailSkeleton />;

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
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← All Plans
        </Link>
      </div>
    );
  }

  const handleExportMarkdown = () => {
    const blob = new Blob([plan.generated], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-brief-${plan.config.app_name.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (pdfExporting) return;

    setPdfExporting(true);
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || 'Failed to export PDF');
      }

      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const match = /filename=\"?([^\";]+)\"?/i.exec(cd);
      const safeName = plan?.config?.app_name
        ? plan.config.app_name.toLowerCase().replace(/\s+/g, '-')
        : 'plan';
      const filename = match?.[1] || `marketing-brief-${safeName}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to export PDF';
      toastError(msg);
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/plan/${id}`} className="text-xs text-slate-500 hover:text-slate-300">
          ← Overview
        </Link>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">
          All Plans
        </Link>
      </div>

      <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          {(plan.scraped?.icon || plan.config?.icon) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={plan.scraped?.icon || plan.config?.icon}
              alt=""
              className="w-14 h-14 rounded-2xl"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-white break-words">{plan.config.app_name}</h1>
            <p className="text-sm text-slate-400 mt-1 break-words">
              {plan.config.one_liner || plan.scraped?.description}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <ExportBundleButton planId={id} appName={plan.config.app_name} />
              <button
                onClick={handleExportMarkdown}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                📥 Export .md
              </button>
              <button
                onClick={handleExportPdf}
                disabled={pdfExporting}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {pdfExporting ? 'Preparing…' : '📄 Export PDF'}
              </button>
              <CopyButton text={plan.generated} label="Copy brief" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-white/[0.06] rounded-2xl p-6">
        <div className="markdown-content text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {plan.generated}
          </ReactMarkdown>
        </div>
      </div>

    </div>
  );
}

```

# app/plan/[id]/strategy/page.tsx

```tsx
import { FileText, Target, Users } from 'lucide-react';

import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

export default async function StrategyHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PlanPageShell
      title="Strategy"
      description="Start here to lock positioning, audience, and competitive angle before generating more assets."
      helper="Recommended order: Brief -> Foundation -> Competitors"
    >
      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/strategy/brief`}
          title="Brief"
          description="Your core positioning, audience, and messaging summary"
          icon={FileText}
        />
        <PlanLinkCard
          href={`/plan/${id}/foundation`}
          title="Foundation"
          description="Value props, differentiators, and brand fundamentals"
          icon={Target}
        />
        <PlanLinkCard
          href={`/plan/${id}/competitors`}
          title="Competitors"
          description="Competitive landscape and positioning angles"
          icon={Users}
        />
      </div>
    </PlanPageShell>
  );
}

```

# app/plan/[id]/templates/page.tsx

```tsx
'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import type { MarketingPlan } from '@/lib/types';
import ErrorRetry from '@/components/ErrorRetry';
import { PageSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

type Template = {
  id:
    | 'app_store_short'
    | 'app_store_full'
    | 'twitter_bio'
    | 'instagram_bio'
    | 'linkedin_about'
    | 'google_play_short'
    | 'product_hunt_tagline'
    | 'press_release_opener';
  name: string;
  charLimit: number;
  description: string;
  template: string;
};

const TEMPLATES: Template[] = [
  {
    id: 'app_store_short',
    name: 'App Store Description (short)',
    charLimit: 170,
    description: 'A concise, store-friendly short description.',
    template:
      '{{app_name}} — {{one_liner}} Built for {{target_audience}}. Try it today: {{app_url}}',
  },
  {
    id: 'app_store_full',
    name: 'App Store Description (full)',
    charLimit: 4000,
    description: 'A longer, structured description with keyword-friendly sections.',
    template: `Meet {{app_name}}\n\n{{one_liner}}\n\nWhy you\'ll love it\n• Designed for {{target_audience}}\n• Clear, fast workflows that reduce friction\n• Simple pricing: {{pricing}}\n\nWhat you can do with {{app_name}}\n• [Feature 1] {{differentiator_1}}\n• [Feature 2] {{differentiator_2}}\n• [Feature 3] {{differentiator_3}}\n\nPerfect for\n• {{target_audience}}\n• Teams who want to ship faster\n\nGet started\nDownload {{app_name}} and see results in minutes.\n{{app_url}}\n\nKeywords (edit)\n{{keywords}}\n`,
  },
  {
    id: 'twitter_bio',
    name: 'Twitter/X Bio',
    charLimit: 160,
    description: 'Short, punchy bio suitable for X.',
    template: '{{app_name}}: {{one_liner}} | For {{target_audience}} | {{app_url}}',
  },
  {
    id: 'instagram_bio',
    name: 'Instagram Bio',
    charLimit: 150,
    description: 'Bio with clear benefit + CTA.',
    template: '{{app_name}}\n{{one_liner}}\nFor {{target_audience}}\n👇 {{app_url}}',
  },
  {
    id: 'linkedin_about',
    name: 'LinkedIn Page About',
    charLimit: 2000,
    description: 'A professional “About” section for your LinkedIn page.',
    template: `{{app_name}} is built for {{target_audience}}.\n\n{{one_liner}}\n\nWhat we\'re focused on\n• Practical outcomes over vanity metrics\n• Simple, reliable workflows\n• A product experience people actually enjoy\n\nWhy {{app_name}}\n{{differentiators_sentence}}\n\nPricing\n{{pricing}}\n\nLearn more: {{app_url}}`,
  },
  {
    id: 'google_play_short',
    name: 'Google Play Short Description',
    charLimit: 80,
    description: 'Ultra-short Play Store description.',
    template: '{{one_liner}}',
  },
  {
    id: 'product_hunt_tagline',
    name: 'Product Hunt tagline',
    charLimit: 60,
    description: 'A short PH tagline (keep it benefit-forward).',
    template: '{{one_liner}}',
  },
  {
    id: 'press_release_opener',
    name: 'Press Release opener',
    charLimit: 500,
    description: 'An opening paragraph you can paste into a press release.',
    template:
      'Today, {{app_name}} announced its launch — {{one_liner}} Built for {{target_audience}}, {{app_name}} helps teams move faster with a simple, reliable workflow. Learn more at {{app_url}}.',
  },
];

function clamp(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}…`;
}

function fillTemplate(template: string, plan: MarketingPlan | null) {
  const appName = plan?.config?.app_name || 'Your app';
  const oneLiner = plan?.config?.one_liner || 'A short one-line description';
  const targetAudience = plan?.config?.target_audience || 'your audience';
  const pricing = plan?.config?.pricing || 'Simple pricing';
  const appUrl = plan?.config?.app_url || plan?.scraped?.url || '';

  const differentiators = Array.isArray(plan?.config?.differentiators)
    ? plan!.config.differentiators
    : [];
  const d1 = differentiators[0] || 'A key differentiator';
  const d2 = differentiators[1] || 'Another differentiator';
  const d3 = differentiators[2] || 'A third differentiator';

  const keywords = (plan?.scraped?.keywords || [])
    .slice(0, 20)
    .join(', ') ||
    (plan?.scraped?.features || [])
      .slice(0, 12)
      .map((f) => f.toLowerCase())
      .join(', ');

  const differentiatorsSentence = differentiators.length
    ? differentiators.join(' • ')
    : 'Add your differentiators in the plan foundation to personalise this further.';

  return template
    .replaceAll('{{app_name}}', appName)
    .replaceAll('{{one_liner}}', oneLiner)
    .replaceAll('{{target_audience}}', targetAudience)
    .replaceAll('{{pricing}}', pricing)
    .replaceAll('{{app_url}}', appUrl || 'https://example.com')
    .replaceAll('{{differentiator_1}}', d1)
    .replaceAll('{{differentiator_2}}', d2)
    .replaceAll('{{differentiator_3}}', d3)
    .replaceAll('{{keywords}}', keywords || 'keyword 1, keyword 2, keyword 3')
    .replaceAll('{{differentiators_sentence}}', differentiatorsSentence);
}

function CharBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 px-2 py-1 text-xs text-slate-300">
      {value.toLocaleString()} chars
    </span>
  );
}

function PriorityNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/30 p-4 text-sm text-indigo-200">
      {text}
    </div>
  );
}

export default function TemplatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');
  const { success: toastSuccess, error: toastError } = useToast();

  const storageKey = `templates-${id}`;
  const [isCached, setIsCached] = useState(false);
  const [cachedPopulated, setCachedPopulated] = useState<Record<string, string> | null>(null);

  const [edited, setEdited] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadPlan = useCallback(() => {
    setPlanLoading(true);
    setPlanError('');

    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch {
        /* fall through */
      }
    }

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
        setPlanError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setPlanLoading(false));
  }, [id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    // Load persisted template edits (if any)
    fetch(`/api/plans/${id}/templates`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const templates = json?.templates;
        if (!templates || typeof templates !== 'object') return;
        setEdited((prev) => ({ ...prev, ...(templates as Record<string, string>) }));
      })
      .catch(() => {
        /* ignore */
      });
  }, [id]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, string>;
      setCachedPopulated(parsed);
      setEdited(parsed);
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const populatedTemplates = useMemo(() => {
    return TEMPLATES.map((t) => ({
      ...t,
      populated: fillTemplate(t.template, plan),
    }));
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    try {
      // If we don't have any edited content yet, seed it from populated templates.
      setEdited((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const payload: Record<string, string> = {};
        for (const tpl of populatedTemplates) payload[tpl.id] = tpl.populated;
        return payload;
      });
    } catch {
      /* ignore */
    }
  }, [plan, populatedTemplates]);

  useEffect(() => {
    try {
      if (Object.keys(edited).length === 0) return;
      sessionStorage.setItem(storageKey, JSON.stringify(edited));
    } catch {
      /* ignore */
    }
  }, [storageKey, edited]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess('Copied to clipboard');
    } catch {
      toastError('Failed to copy');
    }
  };

  const handleSaveChanges = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (Object.keys(edited).length === 0) {
        toastError('Nothing to save');
        return;
      }

      const res = await fetch(`/api/plans/${id}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: edited }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to save templates');
      }

      toastSuccess('Saved template changes');
      setIsCached(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save templates';
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (planLoading) {
    return (
      <div className="px-4 pb-8">
        <PageSkeleton />
      </div>
    );
  }

  if (planError) {
    return (
      <div className="px-4 pb-8">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  }

  const hasAppInfo = Boolean(plan?.config?.app_name || plan?.config?.one_liner);

  return (
    <div className="px-4 pb-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
          Ready-to-copy marketing templates pre-filled with your app&apos;s details — App Store blurbs, social bios, Product Hunt taglines, and more.
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white mb-2">Templates</h1>
            {cachedPopulated && isCached && (
              <span className="text-xs text-slate-500">Cached</span>
            )}
            <button
              onClick={handleSaveChanges}
              disabled={saving || Object.keys(edited).length === 0}
              className="ml-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
          <p className="text-slate-400">
            Browse ready-to-use marketing copy templates. We&apos;ll auto-fill placeholders
            from your plan.
          </p>
        </div>

        {!hasAppInfo && (
          <div className="mb-6">
            <PriorityNote text="Tip: add your app name + one-liner in the plan foundation to populate these templates automatically." />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {populatedTemplates.map((t) => {
            const charCount = (edited[t.id] ?? t.populated).length;
            const overLimit = charCount > t.charLimit;
            const current = edited[t.id] ?? t.populated;

            return (
              <div
                key={t.id}
                className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-white">{t.name}</h2>
                      <CharBadge value={t.charLimit} />
                    </div>
                    <p className="text-sm text-slate-400">{t.description}</p>
                  </div>

                  <button
                    onClick={() => handleCopy(current)}
                    className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    📋 Copy
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>
                      {charCount.toLocaleString()} / {t.charLimit.toLocaleString()} chars
                    </span>
                    {overLimit && (
                      <span className="text-amber-300">Over limit — trim before publishing</span>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-2">
                    <textarea
                      value={current}
                      onChange={(e) => setEdited((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      className="w-full min-h-[160px] bg-transparent p-2 text-sm text-slate-200 font-sans whitespace-pre-wrap focus:outline-none"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Preview: {clamp(current.replace(/\s+/g, ' ').trim(), 140)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

```

# app/plan/[id]/translate/page.tsx

```tsx
'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import { DraftSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';

type TranslationSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets';

type LanguageCode =
  | 'es'
  | 'fr'
  | 'de'
  | 'ja'
  | 'ko'
  | 'pt-BR'
  | 'it'
  | 'zh-Hans'
  | 'nl'
  | 'ar';

const LANGUAGE_OPTIONS: {
  code: LanguageCode;
  label: string;
  flag: string;
  help?: string;
}[] = [
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'zh-Hans', label: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
];

const SECTION_OPTIONS: {
  key: TranslationSection;
  label: string;
  help: string;
}[] = [
  {
    key: 'app_store_description',
    label: 'App Store description',
    help: 'Full description for the store listing.',
  },
  {
    key: 'short_description',
    label: 'Short description',
    help: 'A concise store-friendly tagline.',
  },
  {
    key: 'keywords',
    label: 'Keywords',
    help: 'Comma-separated keywords for ASO.',
  },
  {
    key: 'whats_new',
    label: "What's New",
    help: 'Release notes / update text.',
  },
  {
    key: 'feature_bullets',
    label: 'Feature bullets',
    help: 'A bullet list of benefits/features.',
  },
];

function sectionToTitle(section: TranslationSection) {
  return SECTION_OPTIONS.find((s) => s.key === section)?.label || section;
}

function languageToTitle(code: LanguageCode) {
  const opt = LANGUAGE_OPTIONS.find((l) => l.code === code);
  return opt ? `${opt.flag} ${opt.label}` : code;
}

export default function TranslatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);

  const [selectedLanguages, setSelectedLanguages] = useState<Record<LanguageCode, boolean>>({
    es: true,
    fr: false,
    de: false,
    ja: false,
    ko: false,
    'pt-BR': false,
    it: false,
    'zh-Hans': false,
    nl: false,
    ar: false,
  });

  const [selectedSections, setSelectedSections] = useState<Record<TranslationSection, boolean>>({
    app_store_description: true,
    short_description: true,
    keywords: true,
    whats_new: true,
    feature_bullets: true,
  });

  const [translations, setTranslations] = useState<
    Partial<Record<LanguageCode, Partial<Record<TranslationSection, string>>>>
  >({});
  const [activeLang, setActiveLang] = useState<LanguageCode>('es');
  const [isCached, setIsCached] = useState(false);

  const storageKey = `translate-${id}`;

  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');
  const [error, setError] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const loadPlan = useCallback(() => {
    setPlanLoading(true);
    setPlanError('');
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch { /* fall through */ }
    }
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
        setPlanError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setPlanLoading(false));
  }, [id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        translations: Partial<Record<LanguageCode, Partial<Record<TranslationSection, string>>>>;
        activeLang?: LanguageCode;
      };
      if (parsed?.translations) setTranslations(parsed.translations);
      if (parsed?.activeLang) setActiveLang(parsed.activeLang);
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const requestedLanguages = useMemo(() => {
    return LANGUAGE_OPTIONS.map((l) => l.code).filter((c) => selectedLanguages[c]);
  }, [selectedLanguages]);

  const requestedSections = useMemo(() => {
    return SECTION_OPTIONS.map((s) => s.key).filter((k) => selectedSections[k]);
  }, [selectedSections]);

  const handleGenerate = async () => {
    setError('');

    if (requestedLanguages.length === 0) {
      setError('Please select at least one language.');
      return;
    }

    if (requestedSections.length === 0) {
      setError('Please select at least one section.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/generate-translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          targetLanguages: requestedLanguages,
          sections: requestedSections,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate translations');

      const t = data?.translations as Record<string, Record<string, string>>;
      const next: Partial<
        Record<LanguageCode, Partial<Record<TranslationSection, string>>>
      > = {};

      for (const lang of requestedLanguages) {
        const langObj = t?.[lang];
        if (!langObj) continue;
        next[lang] = {};
        for (const section of requestedSections) {
          const val = langObj?.[section];
          if (typeof val === 'string') {
            next[lang]![section] = val;
          }
        }
      }

      const first = requestedLanguages[0] || 'es';
      sessionStorage.setItem(storageKey, JSON.stringify({ translations: next, activeLang: first }));
      setTranslations(next);
      setActiveLang(first);
      setIsCached(false);
      toastSuccess('Translations generated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate translations';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAllForLanguage = async (lang: LanguageCode) => {
    const langTranslations = translations[lang] || {};

    const orderedKeys = SECTION_OPTIONS.map((s) => s.key).filter(
      (k) => typeof langTranslations[k] === 'string' && (langTranslations[k] || '').trim().length > 0
    );

    if (orderedKeys.length === 0) return;

    const text = orderedKeys
      .map((k) => `## ${sectionToTitle(k)}\n\n${langTranslations[k]}\n`)
      .join('\n');

    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (planLoading) {
    return <DraftSkeleton />;
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
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  const hasResults = Object.keys(translations).length > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Translate your App Store copy into 10 languages — ready to paste directly into your store listing without any editing.
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">🌍 Translate / Localise</h1>
            {hasResults && isCached && (
              <span className="text-xs text-slate-500">Cached · Generate to refresh</span>
            )}
          </div>
          <p className="text-slate-400">
            {plan.config.app_name} — Generate localised app store copy in multiple languages
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Generating…' : '✨ Generate Translations'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Languages</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <label
                  key={l.code}
                  className="flex items-start gap-3 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLanguages[l.code]}
                    onChange={(e) =>
                      setSelectedLanguages((prev) => ({
                        ...prev,
                        [l.code]: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm text-white">
                      {l.flag} {l.label}
                    </div>
                    {l.help && <div className="text-xs text-slate-500">{l.help}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Sections</h2>
            <div className="space-y-2">
              {SECTION_OPTIONS.map((s) => (
                <label
                  key={s.key}
                  className="flex items-start gap-3 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSections[s.key]}
                    onChange={(e) =>
                      setSelectedSections((prev) => ({
                        ...prev,
                        [s.key]: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm text-white">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.help}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tip: Choose just a couple of languages first to keep generation fast.
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {requestedLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`text-sm border rounded-xl px-3 py-2 transition-colors ${
                    activeLang === lang
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40 text-slate-200'
                  }`}
                >
                  {languageToTitle(lang)}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleCopyAllForLanguage(activeLang)}
              disabled={!translations[activeLang] || Object.keys(translations[activeLang] || {}).length === 0}
              className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
              title={`Copy all sections for ${activeLang}`}
            >
              {copiedAll ? `✓ Copied!` : `📋 Copy All for ${languageToTitle(activeLang)}`}
            </button>
          </div>

          {SECTION_OPTIONS.map((s) => {
            const value = translations[activeLang]?.[s.key] || '';
            const hasValue = value.trim().length > 0;

            return (
              <div
                key={s.key}
                className={`rounded-2xl overflow-hidden border ${
                  hasValue
                    ? 'bg-slate-800/30 border-slate-700/60'
                    : 'bg-slate-900/20 border-slate-700/30'
                }`}
              >
                <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/40">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.help}</div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!hasValue) return;
                      await navigator.clipboard.writeText(value);
                    }}
                    disabled={!hasValue}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    title="Copy section"
                  >
                    📋 Copy
                  </button>
                </div>

                <div className="p-4">
                  <textarea
                    value={value}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLang]: {
                          ...(prev[activeLang] || {}),
                          [s.key]: e.target.value,
                        },
                      }))
                    }
                    placeholder={
                      requestedSections.includes(s.key)
                        ? 'Not generated yet…'
                        : 'Not requested…'
                    }
                    className="w-full min-h-[140px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasResults && (
        <div className="text-center text-sm text-slate-600 mt-10 mb-6">
          Select languages + sections, then generate.
        </div>
      )}

      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Localised copy is a starting point — review for accuracy before publishing.
      </div>
    </div>
  );
}

```

# app/plan/[id]/variants/page.tsx

```tsx
'use client';

import { useMemo, useState, use } from 'react';
import { PageSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import Link from 'next/link';
import { usePlan } from '@/hooks/usePlan';
import DismissableTip from '@/components/DismissableTip';

type VariantScore = {
  text: string;
  clarity: number;
  emotion: number;
  urgency: number;
  uniqueness: number;
  overall: number;
  feedback: string;
};

type ScoreVariantsResult = {
  scores: VariantScore[];
  winner: number;
};

const METRICS: Array<{ key: keyof Omit<VariantScore, 'text' | 'feedback'>; label: string }> = [
  { key: 'clarity', label: 'Clarity' },
  { key: 'emotion', label: 'Emotion' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'uniqueness', label: 'Uniqueness' },
  { key: 'overall', label: 'Overall' },
];

function ScoreSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="h-5 w-48 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="h-4 w-40 bg-slate-800 rounded" />
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-3 w-full bg-slate-800 rounded" />
              ))}
              <div className="h-4 w-3/4 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricBars({ scores, winner }: { scores: VariantScore[]; winner: number }) {
  const maxOverall = Math.max(...scores.map((s) => s.overall || 0), 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {scores.map((s, idx) => (
        <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-400 mb-1">Variant {idx + 1}</div>
              <div className="text-sm text-white whitespace-pre-wrap break-words">{s.text}</div>
            </div>
            {winner === idx && (
              <div className="shrink-0 text-xs px-2 py-1 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-200">
                Winner
              </div>
            )}
          </div>

          <div className="space-y-2">
            {METRICS.map((m) => {
              const value = s[m.key] ?? 0;
              const width = Math.max(0, Math.min(100, (value / 10) * 100));
              return (
                <div key={m.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">{m.label}</span>
                    <span className="text-slate-200 tabular-nums">{value}/10</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${m.key === 'overall' ? 'bg-indigo-500' : 'bg-indigo-500/70'
                        }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 mb-1">Feedback</div>
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              {s.feedback || '—'}
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-1">Overall comparison</div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-2.5 bg-indigo-500 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, (s.overall / maxOverall) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { plan, loading: loadingPlan, error: fetchError, reload: loadFromDb } = usePlan(id);

  const [variants, setVariants] = useState<string[]>(['', '']);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const [result, setResult] = useState<ScoreVariantsResult | null>(null);

  const filledVariants = useMemo(
    () => variants.map((v) => v.trim()).filter((v) => v.length > 0),
    [variants]
  );

  const canScore = filledVariants.length >= 2 && filledVariants.length <= 5;

  const onScore = async () => {
    if (!canScore) return;

    setScoring(true);
    setScoreError('');

    try {
      const res = await fetch('/api/score-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id, variants: filledVariants }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to score variants');
      }
      if (!Array.isArray(data?.scores)) {
        throw new Error('Unexpected response shape');
      }
      setResult(data);
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Failed to score variants');
    } finally {
      setScoring(false);
    }
  };

  if (loadingPlan) return <PageSkeleton />;

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
        <p className="text-sm text-slate-500 mb-4">This plan may have been deleted or doesn&apos;t exist.</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <DismissableTip id="variants-tip">Generate multiple headline and hook variants, then score them side-by-side for clarity, emotion, urgency, and uniqueness — find your strongest angle before you go live.</DismissableTip>

      <div className="mb-8">
        <div className="flex items-center gap-4 min-w-0 mb-2">
          {plan.config.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white break-words">🏆 Variants: {plan.config.app_name}</h1>
            <p className="text-slate-400 break-words">Paste 2–5 copy variants and score them side-by-side.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-sm font-semibold text-white">Copy variants</div>
            <div className="text-xs text-slate-400">One idea per field. Empty fields are ignored.</div>
          </div>
          <div className="text-xs text-slate-400 tabular-nums">{filledVariants.length}/5 ready</div>
        </div>

        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div key={idx} className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-400">Variant {idx + 1}</div>
                <button
                  onClick={() => {
                    setResult(null);
                    setVariants((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  disabled={variants.length <= 2}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${variants.length <= 2
                      ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800/50'
                    }`}
                >
                  Remove
                </button>
              </div>
              <textarea
                value={v}
                onChange={(e) => {
                  setResult(null);
                  setVariants((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)));
                }}
                placeholder="Paste copy here…"
                rows={3}
                className="w-full text-sm bg-transparent text-slate-100 placeholder:text-slate-500 outline-none resize-y"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => setVariants((prev) => (prev.length >= 5 ? prev : [...prev, '']))}
            disabled={variants.length >= 5}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${variants.length >= 5
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900/50 border border-slate-700 text-slate-200 hover:bg-slate-800/50'
              }`}
          >
            + Add Variant
          </button>

          <button
            onClick={onScore}
            disabled={!canScore || scoring}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${!canScore || scoring
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
          >
            {scoring ? 'Scoring…' : 'Score Variants'}
          </button>

          {result && (
            <button
              onClick={() => setResult(null)}
              className="text-sm px-4 py-2 rounded-lg transition-colors font-medium bg-slate-900/50 border border-slate-700 text-slate-200 hover:bg-slate-800/50"
            >
              Clear Results
            </button>
          )}
        </div>

        {!canScore && (
          <div className="mt-4 text-xs text-slate-400">
            Add at least 2 non-empty variants (up to 5) to score.
          </div>
        )}

        {scoreError && (
          <div className="mt-4 bg-red-950/30 border border-red-900/60 rounded-xl p-4 text-sm text-red-200">
            {scoreError}
          </div>
        )}
      </div>

      {scoring && <ScoreSkeleton />}

      {!scoring && result && result.scores?.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Scores</div>
              <div className="text-xs text-slate-400">Winner chosen by strongest overall score.</div>
            </div>
            {typeof result.winner === 'number' && result.winner >= 0 && result.winner < result.scores.length && (
              <div className="text-xs px-3 py-1.5 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-200">
                Winner: Variant {result.winner + 1}
              </div>
            )}
          </div>

          <MetricBars scores={result.scores} winner={result.winner} />
        </div>
      )}
    </div>
  );
}

```

# components/ConfirmDialog.tsx

```tsx
'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    /** When false the trigger renders directly without a dialog */
    enabled?: boolean;
    children: React.ReactNode;
}

/**
 * Wraps a trigger element with an AlertDialog confirmation.
 * When `enabled` is false (e.g. no existing content), the trigger fires directly.
 */
export default function ConfirmDialog({
    title,
    description,
    confirmLabel = 'Continue',
    onConfirm,
    enabled = true,
    children,
}: ConfirmDialogProps) {
    if (!enabled) {
        return (
            <span onClick={onConfirm} className="contents">
                {children}
            </span>
        );
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-slate-700">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

```

# components/DismissableTip.tsx

```tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface DismissableTipProps {
    id: string;
    children: React.ReactNode;
}

const STORAGE_PREFIX = 'dismissed-tip-';

/**
 * A contextual info banner that users can dismiss.
 * Dismissal is persisted to localStorage by `id`.
 */
export default function DismissableTip({ id, children }: DismissableTipProps) {
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return true;
        try {
            return localStorage.getItem(`${STORAGE_PREFIX}${id}`) === '1';
        } catch {
            return false;
        }
    });

    if (dismissed) return null;

    const handleDismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${id}`, '1');
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="flex-1">{children}</div>
            <button
                onClick={handleDismiss}
                className="text-slate-500 hover:text-slate-300 mt-0.5 shrink-0"
                aria-label="Dismiss tip"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

```

# components/EnhanceButton.tsx

```tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

type Tone = 'professional' | 'casual' | 'technical' | 'enthusiastic';

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
];

interface EnhanceButtonProps {
  /** The original template copy text */
  text: string;
  /** Brief context about the app (name, one-liner, etc.) */
  appContext: string;
  /** Called when enhanced text is produced or reverted */
  onTextChange: (newText: string) => void;
}

export default function EnhanceButton({ text, appContext, onTextChange }: EnhanceButtonProps) {
  const [tone, setTone] = useState<Tone>('professional');
  const [loading, setLoading] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const originalRef = useRef(text);
  const { success: toastSuccess, error: toastError } = useToast();

  // Keep original in sync if parent text changes while not enhanced
  if (!enhanced && text !== originalRef.current) {
    originalRef.current = text;
  }

  const handleEnhance = useCallback(async () => {
    if (loading || cooldown) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/enhance-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalRef.current, tone, context: appContext }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      if (!data.enhanced) {
        throw new Error('No enhanced text returned');
      }

      onTextChange(data.enhanced);
      setEnhanced(true);
      toastSuccess('Copy enhanced with AI');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toastError(message);
      // Auto-clear error after 4 seconds
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
      // Rate limit: disable for 2 seconds after each call
      setCooldown(true);
      setTimeout(() => setCooldown(false), 2000);
    }
  }, [loading, cooldown, tone, appContext, onTextChange, toastError, toastSuccess]);

  const handleRevert = useCallback(() => {
    onTextChange(originalRef.current);
    setEnhanced(false);
  }, [onTextChange]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Tone selector */}
      <Select
        value={tone}
        onChange={(e) => setTone(e.target.value as Tone)}
        disabled={loading}
        className="w-auto h-auto text-xs bg-slate-700 text-slate-300 border-slate-600 rounded-lg px-2 py-1.5 focus-visible:ring-1 disabled:opacity-50"
      >
        {TONE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      {/* Enhance / Re-enhance button */}
      <Button
        onClick={handleEnhance}
        disabled={loading || cooldown}
        size="sm"
        className="h-auto text-xs disabled:bg-indigo-800 px-3 py-1.5 rounded-lg"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Enhancing…
          </>
        ) : enhanced ? (
          '✨ Re-enhance'
        ) : (
          '✨ Enhance with AI'
        )}
      </Button>

      {/* Revert button (only shown when enhanced) */}
      {enhanced && !loading && (
        <Button
          onClick={handleRevert}
          variant="secondary"
          size="sm"
          className="h-auto text-xs text-slate-300 px-3 py-1.5 rounded-lg"
        >
          ↩️ Revert
        </Button>
      )}

      {/* Error toast */}
      {error && (
        <span className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 px-2 py-1 rounded-lg">
          {error}
        </span>
      )}
    </div>
  );
}

```

# components/ErrorBoundary.tsx

```tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep it simple: log to console for local debugging.
    // (No external error reporting services by design.)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-xl bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center">
            <div className="text-4xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 mb-6">
              An unexpected error occurred while rendering this page.
            </p>
            {this.state.error?.message ? (
              <p className="text-sm text-slate-500 bg-slate-900/40 border border-slate-700/60 rounded-xl p-3 mb-6 break-words">
                {this.state.error.message}
              </p>
            ) : null}
            <Button
              type="button"
              onClick={this.handleTryAgain}
              className="h-auto font-semibold px-5 py-3"
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

```

# components/ErrorRetry.tsx

```tsx
'use client';

interface ErrorRetryProps {
  error: string;
  onRetry: () => void;
  className?: string;
}

export default function ErrorRetry({ error, onRetry, className = '' }: ErrorRetryProps) {
  return (
    <div
      className={`bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center ${className}`}
    >
      <div className="text-red-400 text-sm mb-3">{error}</div>
      <button
        onClick={onRetry}
        className="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
      >
        🔄 Retry
      </button>
    </div>
  );
}

```

# components/ExportBundleButton.tsx

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const TONES = ['professional', 'casual', 'bold', 'minimal'] as const;
const LANGUAGES = [
  { code: 'es', label: 'Spanish (es)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'de', label: 'German (de)' },
  { code: 'ja', label: 'Japanese (ja)' },
  { code: 'ko', label: 'Korean (ko)' },
  { code: 'pt-BR', label: 'Portuguese (Brazil) (pt-BR)' },
  { code: 'it', label: 'Italian (it)' },
  { code: 'zh-Hans', label: 'Chinese (Simplified) (zh-Hans)' },
  { code: 'nl', label: 'Dutch (nl)' },
  { code: 'ar', label: 'Arabic (ar)' },
] as const;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export default function ExportBundleButton({
  planId,
  appName,
}: {
  planId: string;
  appName: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTones, setSelectedTones] = useState<string[]>([...TONES]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [includeAssets, setIncludeAssets] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tonesAllChecked = useMemo(
    () => TONES.every((t) => selectedTones.includes(t)),
    [selectedTones]
  );

  const toggleTone = (tone: string) => {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone]
    );
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const download = async () => {
    setExporting(true);
    setError(null);

    try {
      const res = await fetch('/api/export-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          tones: selectedTones,
          languages: selectedLanguages,
          includeAssets,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marketing-pack-${slugify(appName) || planId}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !exporting && setOpen(v)}>
      <DialogTrigger asChild>
        <Button
          className="w-full sm:w-auto h-auto text-sm px-4 py-2.5 sm:py-2 rounded-lg"
        >
          ⬇️ Download Full Pack
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-2xl" showCloseButton={!exporting}>
        <DialogHeader>
          <DialogTitle className="text-white">Download Full Pack</DialogTitle>
          <DialogDescription className="text-slate-400">
            Includes your brief, tone variants, translations, and assets (PNG).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tones */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold text-white">Tones</div>
                <div className="text-xs text-slate-400">Default: all</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto text-xs text-indigo-400 hover:text-indigo-300 px-0"
                onClick={() =>
                  setSelectedTones(tonesAllChecked ? [] : [...TONES])
                }
                disabled={exporting}
              >
                {tonesAllChecked ? 'Clear' : 'Select all'}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TONES.map((tone) => (
                <label
                  key={tone}
                  className="flex items-center gap-2 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTones.includes(tone)}
                    onChange={() => toggleTone(tone)}
                    disabled={exporting}
                  />
                  <span className="text-sm text-slate-200 capitalize">{tone}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <div className="mb-3">
              <div className="text-sm font-semibold text-white">Translations</div>
              <div className="text-xs text-slate-400">Default: none</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => (
                <label
                  key={lang.code}
                  className="flex items-center gap-2 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(lang.code)}
                    onChange={() => toggleLanguage(lang.code)}
                    disabled={exporting}
                  />
                  <span className="text-sm text-slate-200">{lang.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assets */}
          <div className="flex items-center justify-between gap-3 bg-slate-800/30 border border-slate-700/60 rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Include assets</div>
              <div className="text-xs text-slate-400">Generates PNG social images</div>
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeAssets}
                onChange={() => setIncludeAssets((v) => !v)}
                disabled={exporting}
              />
              <span className="text-sm text-slate-200">Yes</span>
            </label>
          </div>

          {error && (
            <div className="text-sm text-red-300 bg-red-950/30 border border-red-900/40 rounded-xl p-3 whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {exporting ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-indigo-500/40 border-t-indigo-400 animate-spin" />
                Generating pack… this may take a minute.
              </span>
            ) : (
              'This runs multiple AI calls if tones/translations are selected.'
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setOpen(false)}
              disabled={exporting}
              variant="secondary"
              className="h-auto text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              onClick={download}
              disabled={exporting}
              className="h-auto text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {exporting ? 'Working…' : 'Download ZIP'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

```

# components/GenerateAllButton.tsx

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

type StreamEvent =
  | { type: 'start'; total: number; planId: string }
  | { type: 'step:start'; step: number; total: number; id: string; label: string }
  | { type: 'step:complete'; step: number; total: number; id: string }
  | { type: 'step:error'; step: number; total: number; id: string; error: string }
  | { type: 'done'; summary: unknown }
  | { type: 'fatal'; error: string };

export default function GenerateAllButton({
  planId,
  onComplete,
}: {
  planId: string;
  onComplete?: (summary: unknown) => void;
}) {
  const [running, setRunning] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string>('');
  const [step, setStep] = useState(0);
  const [total, setTotal] = useState(7);
  const [errors, setErrors] = useState<string[]>([]);

  const { success, error } = useToast();

  const pct = useMemo(() => {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((step / total) * 100)));
  }, [step, total]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setErrors([]);
    setCurrentLabel('Starting…');
    setStep(0);

    try {
      const res = await fetch('/api/generate-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-stream': '1',
        },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buf = '';
      let finalSummary: unknown = null;
      const errorLines: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const ln of lines) {
          if (!ln.trim()) continue;
          let evt: StreamEvent | null = null;
          try {
            evt = JSON.parse(ln) as StreamEvent;
          } catch {
            continue;
          }

          if (evt.type === 'start') {
            setTotal(evt.total || 7);
            setStep(0);
            setCurrentLabel('Starting…');
          }

          if (evt.type === 'step:start') {
            setTotal(evt.total);
            setStep(evt.step - 1);
            setCurrentLabel(`Step ${evt.step}/${evt.total}: ${evt.label}…`);
          }

          if (evt.type === 'step:complete') {
            setStep(evt.step);
          }

          if (evt.type === 'step:error') {
            const line = `• ${evt.id}: ${evt.error}`;
            errorLines.push(line);
            setErrors((prev) => [...prev, line]);
            setStep(evt.step);
          }

          if (evt.type === 'fatal') {
            throw new Error(evt.error);
          }

          if (evt.type === 'done') {
            finalSummary = evt.summary;
          }
        }
      }

      setCurrentLabel('Complete');
      setStep(total);

      if (errorLines.length > 0) {
        success('Generate Everything finished (with some errors)');
      } else {
        success('Marketing pack complete!');
      }

      onComplete?.(finalSummary);
    } catch (e) {
      error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="w-full sm:w-auto">
      <ConfirmDialog
        title="Generate Everything?"
        description="This will run 7+ AI calls and overwrite any existing generated content. This may take a minute and uses API credits."
        confirmLabel="Generate Everything"
        onConfirm={run}
        enabled={!running}
      >
        <Button
          disabled={running}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg"
        >
          {running ? 'Generating…' : <><Sparkles className="w-4 h-4 mr-1.5" /> Generate Everything</>}
        </Button>
      </ConfirmDialog>

      {(running || step > 0) && (
        <div className="mt-2 w-full sm:w-[320px]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="truncate">{currentLabel || '—'}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-slate-950/40 border border-slate-700/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500/70 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {errors.length > 0 && (
            <div className="mt-2 text-xs text-amber-200 bg-amber-950/30 border border-amber-900/40 rounded-xl p-2 whitespace-pre-wrap">
              <div className="font-semibold mb-1">Errors (best-effort run):</div>
              {errors.join('\n')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

```

# components/GenerationOverlay.tsx

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

type StepStatus = 'pending' | 'active' | 'complete' | 'error'

interface Step {
  id: string
  label: string
  status: StepStatus
}

interface GenerationOverlayProps {
  url: string
  onComplete: (planId: string) => void
  onError: (error: string) => void
}

type ScrapeResult = {
  name?: string
  icon?: string
  source?: string
  [key: string]: unknown
}

type PlanResult = {
  id: string
  error?: string
  [key: string]: unknown
}

function getErrorMessage(input: unknown, fallback: string): string {
  if (input && typeof input === 'object' && 'error' in input) {
    const maybeError = (input as { error?: unknown }).error
    if (typeof maybeError === 'string' && maybeError.trim()) return maybeError
  }
  return fallback
}

function truncateMiddle(input: string, max = 56) {
  const str = input.trim()
  if (str.length <= max) return str
  const head = Math.ceil((max - 1) / 2)
  const tail = Math.floor((max - 1) / 2)
  return `${str.slice(0, head)}…${str.slice(str.length - tail)}`
}

export default function GenerationOverlay({ url, onComplete, onError }: GenerationOverlayProps) {
  const abortRef = useRef<AbortController | null>(null)

  const [steps, setSteps] = useState<Step[]>([
    { id: 'scrape', label: 'Scraping website', status: 'active' },
    { id: 'analyze', label: 'Analysing product', status: 'pending' },
    { id: 'brief', label: 'Writing marketing brief', status: 'pending' },
    { id: 'strategy', label: 'Building content strategy', status: 'pending' },
    { id: 'final', label: 'Finalising your plan', status: 'pending' },
  ])

  const [appName, setAppName] = useState<string>('')
  const [appIcon, setAppIcon] = useState<string>('')

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
      abortRef.current?.abort()
    }
  }, [])

  const setStepStatus = (id: string, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  }

  const activateNextAfter = (id: string) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev
      const next = prev[idx + 1]
      if (!next) return prev
      return prev.map((s, i) => {
        if (i === idx) return s
        if (i === idx + 1 && s.status === 'pending') return { ...s, status: 'active' }
        return s
      })
    })
  }

  useEffect(() => {
    if (!url) return

    const normalizedUrl = url.trim().match(/^https?:\/\//i) ? url.trim() : `https://${url.trim()}`

    const run = async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      try {
        // 1) Scrape
        setStepStatus('scrape', 'active')
        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: normalizedUrl }),
          signal: abortRef.current.signal,
        })

        const scraped = (await scrapeRes.json()) as ScrapeResult
        if (!scrapeRes.ok) throw new Error(getErrorMessage(scraped, 'Scraping failed'))

        if (!isMounted.current) return

        setAppName(typeof scraped.name === 'string' ? scraped.name : '')
        setAppIcon(typeof scraped.icon === 'string' ? scraped.icon : '')

        // Save to recent (keeps existing behavior from /analyze)
        try {
          const recentRaw = localStorage.getItem('recent-analyses') || '[]'
          const recent = JSON.parse(recentRaw) as unknown[]
          const entry = {
            id: `${Date.now()}`,
            url: normalizedUrl,
            name: scraped.name,
            icon: scraped.icon,
            source: scraped.source,
            createdAt: new Date().toISOString(),
          }
          const filtered = recent.filter((r) => {
            if (!r || typeof r !== 'object') return false
            return (r as { url?: unknown }).url !== normalizedUrl
          })
          filtered.unshift(entry)
          localStorage.setItem('recent-analyses', JSON.stringify(filtered.slice(0, 20)))
        } catch {
          // ignore
        }

        setStepStatus('scrape', 'complete')
        activateNextAfter('scrape')

        // 2) Generate plan
        const stepAdvance = window.setInterval(() => {
          // While generating, keep the UI feeling alive by advancing through the middle steps.
          setSteps((prev) => {
            const idx = prev.findIndex((s) => s.status === 'active')
            if (idx === -1) return prev
            if (prev[idx].id === 'final') return prev

            const nextIdx = idx + 1
            return prev.map((s, i) => {
              if (i < idx) return s
              if (i === idx) return { ...s, status: 'complete' }
              if (i === nextIdx && s.status === 'pending') return { ...s, status: 'active' }
              return s
            })
          })
        }, 6500)

        try {
          const planRes = await fetch('/api/generate-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scraped }),
            signal: abortRef.current?.signal,
          })
          const plan = (await planRes.json()) as PlanResult
          if (!planRes.ok) throw new Error(getErrorMessage(plan, 'Generation failed'))

          if (!isMounted.current) return

          // Store plan for instant hydration on the plan pages (existing behavior)
          try {
            sessionStorage.setItem(`plan-${plan.id}`, JSON.stringify(plan))
          } catch {
            // ignore
          }

          // Mark everything complete
          setSteps((prev) => prev.map((s) => ({ ...s, status: 'complete' })))

          window.setTimeout(() => {
            onComplete(plan.id)
          }, 400)
        } finally {
          window.clearInterval(stepAdvance)
        }
      } catch (err) {
        // AbortController throws a DOMException named AbortError
        if (err instanceof DOMException && err.name === 'AbortError') {
          onError('Cancelled')
          return
        }

        const msg = err instanceof Error ? err.message : 'Failed to generate plan'

        // Mark whatever step is currently active as error
        setSteps((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s))
        )

        onError(msg)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f]" role="dialog" aria-modal="true" aria-label="Generating plan">
      <div className="h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-xl">
          <div className="text-center">
            <div className="text-xs text-slate-500">Processing</div>
            <div className="mt-1 text-sm text-slate-300 font-mono" title={url}>
              {truncateMiddle(url, 64)}
            </div>

            {(appName || appIcon) && (
              <div className="mt-6 flex items-center justify-center gap-3">
                {appIcon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={appIcon} alt={appName || 'App icon'} className="h-10 w-10 rounded-xl" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Circle className="h-5 w-5" />
                  </div>
                )}
                <div className="text-left min-w-0">
                  <div className="text-xs text-slate-500">App</div>
                  <div className="text-base font-semibold text-white truncate max-w-[20rem]">
                    {appName || 'Detected'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-slate-500">Progress</div>
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort()
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-4">
              {steps.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  {s.status === 'complete' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : s.status === 'active' ? (
                    <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                  ) : s.status === 'error' ? (
                    <Circle className="h-5 w-5 text-red-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-600" />
                  )}

                  <div className={
                    'text-sm ' +
                    (s.status === 'complete'
                      ? 'text-slate-200'
                      : s.status === 'active'
                        ? 'text-white'
                        : s.status === 'error'
                          ? 'text-red-300'
                          : 'text-slate-400')
                  }>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center text-sm text-slate-500">
              This usually takes 30–60 seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

```

# components/plan/PlanPage.tsx

```tsx
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui/card';

type IconComponent = React.ComponentType<{ className?: string }>;

export function PlanPageShell({
  title,
  description,
  helper,
  children,
}: {
  title: string;
  description: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-10 pt-6 sm:px-8">
      {helper && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300">
          {helper}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>

      {children}
    </div>
  );
}

export function PlanLinkCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: IconComponent;
}) {
  return (
    <Link href={href}>
      <Card className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-300 dark:border-white/[0.06] dark:bg-slate-800/50 dark:hover:border-indigo-500/30 dark:hover:bg-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">{title}</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:text-slate-300" />
      </Card>
    </Link>
  );
}

```

# components/PlanSidebar.tsx

```tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PenLine,
  Megaphone,
  Search,
  Package,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type NavChild = {
  label: string;
  href: string; // full route under /plan/[id]
};

type NavGroup = {
  key: 'overview' | 'strategy' | 'content' | 'distribution' | 'seo' | 'export';
  label: string;
  href: string; // group landing route under /plan/[id]
  icon: React.ComponentType<{ className?: string }>; // lucide
  children?: NavChild[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    href: '', // /plan/[id]
  },
  {
    key: 'strategy',
    label: 'Strategy',
    icon: FileText,
    href: '/strategy',
    children: [
      { label: 'Brief', href: '/strategy/brief' },
      { label: 'Foundation', href: '/foundation' },
      { label: 'Competitors', href: '/competitors' },
      { label: 'Reviews', href: '/reviews' },
    ],
  },
  {
    key: 'content',
    label: 'Content',
    icon: PenLine,
    href: '/content',
    children: [
      { label: 'Copy Draft', href: '/draft' },
      { label: 'Email sequences', href: '/emails' },
      { label: 'Templates', href: '/templates' },
      { label: 'Translations', href: '/translate' },
      { label: 'Approvals', href: '/approvals' },
    ],
  },
  {
    key: 'distribution',
    label: 'Distribution',
    icon: Megaphone,
    href: '/distribution',
    children: [
      { label: 'Social Posts', href: '/social' },
      { label: 'Schedule', href: '/schedule' },
      { label: 'Calendar', href: '/calendar' },
      { label: 'Distribute', href: '/distribute' },
      { label: 'Performance', href: '/performance' },
    ],
  },
  {
    key: 'seo',
    label: 'SEO & ASO',
    icon: Search,
    href: '/seo',
    children: [
      { label: 'Keywords', href: '/keywords' },
      { label: 'SERP Preview', href: '/serp' },
      { label: 'Variants', href: '/variants' },
    ],
  },
  {
    key: 'export',
    label: 'Export',
    icon: Package,
    href: '/export',
    children: [
      { label: 'Assets', href: '/assets' },
      { label: 'Preview', href: '/preview' },
      { label: 'Digest', href: '/digest' },
    ],
  },
];

export function PlanSidebar({
  planId,
  appName,
}: {
  planId: string;
  appName: string;
}) {
  const pathname = usePathname();
  const basePath = `/plan/${planId}`;

  const activeGroupKey = React.useMemo(() => {
    // Most-specific match first
    for (const g of NAV_GROUPS) {
      const groupPath = `${basePath}${g.href}`;
      if (g.key === 'overview') {
        if (pathname === groupPath) return g.key;
        continue;
      }
      if (pathname === groupPath) return g.key;
      if (g.children?.some((c) => pathname === `${basePath}${c.href}`)) return g.key;
      if (pathname.startsWith(groupPath + '/')) return g.key;
    }
    return 'overview' as const;
  }, [pathname, basePath]);

  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) {
      initial[g.key] = g.key === activeGroupKey;
    }
    return initial;
  });

  React.useEffect(() => {
    setOpen((prev) => ({ ...prev, [activeGroupKey]: true }));
  }, [activeGroupKey]);

  const activeGroup = NAV_GROUPS.find((group) => group.key === activeGroupKey);
  const mobileChildren = activeGroup?.children ?? [];

  return (
    <>
      {/* Mobile: compact top icon bar */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/[0.06] dark:bg-slate-900/80 lg:hidden">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← All Plans
            </Link>
            <div className="flex items-center gap-2">
              <div className="max-w-[60%] truncate text-right text-xs font-medium text-slate-900 dark:text-white">
                {appName}
              </div>
              <ThemeToggle className="hidden min-[420px]:inline-flex" />
            </div>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV_GROUPS.map((group) => {
            const href = `${basePath}${group.href}`;
            const isActive = group.key === activeGroupKey;
            const Icon = group.icon;

            return (
              <Link
                key={group.key}
                href={href}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {group.label}
              </Link>
            );
          })}
        </div>

        {mobileChildren.length > 0 && (
          <div className="flex gap-1 overflow-x-auto px-2 pb-2 pt-1 border-t border-slate-200/70 dark:border-white/[0.04]">
            {mobileChildren.map((child) => {
              const childHref = `${basePath}${child.href}`;
              const childActive = pathname === childHref;
              return (
                <Link
                  key={child.href}
                  href={childHref}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-[11px] whitespace-nowrap transition-colors',
                    childActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.04]'
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: left sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-white/[0.06] dark:bg-slate-900 lg:block">
        <div className="mb-6 px-2">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/dashboard"
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ← All Plans
            </Link>
            <ThemeToggle />
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {appName}
          </h3>
        </div>

        <nav className="space-y-1">
          {NAV_GROUPS.map((group) => {
            const Icon = group.icon;
            const groupHref = `${basePath}${group.href}`;

            const groupIsActive =
              group.key === 'overview'
                ? pathname === groupHref
                : pathname === groupHref ||
                  pathname.startsWith(groupHref + '/') ||
                  group.children?.some((c) => pathname === `${basePath}${c.href}`);

            if (!group.children?.length) {
              return (
                <Link
                  key={group.key}
                  href={groupHref}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    groupIsActive
                      ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{group.label}</span>
                </Link>
              );
            }

            return (
              <Collapsible
                key={group.key}
                open={!!open[group.key]}
                onOpenChange={(v) => setOpen((prev) => ({ ...prev, [group.key]: v }))}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      groupIsActive
                        ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left flex items-center gap-2">
                      {group.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform text-slate-500',
                        open[group.key] && 'rotate-180'
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-6 mt-1 space-y-0.5">
                    {group.children.map((child) => {
                      const childHref = `${basePath}${child.href}`;
                      const childActive = pathname === childHref;

                      return (
                        <Link
                          key={child.href}
                          href={childHref}
                          className={cn(
                            'group flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors',
                            childActive
                              ? 'bg-indigo-500/10 text-slate-900 dark:bg-white/[0.06] dark:text-white'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.03] dark:hover:text-slate-300'
                          )}
                        >
                          <span>{child.label}</span>
                          {childActive && (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

```

# components/SerpPreview.tsx

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface SerpPreviewProps {
  title: string;
  url: string;
  description: string;
  editable?: boolean;
  onTitleChange?: (value: string) => void;
  onUrlChange?: (value: string) => void;
  onDescriptionChange?: (value: string) => void;
}

export function SerpPreview({
  title,
  url,
  description,
  editable = false,
  onTitleChange,
  onUrlChange,
  onDescriptionChange,
}: SerpPreviewProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localUrl, setLocalUrl] = useState(url);
  const [localDescription, setLocalDescription] = useState(description);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    setLocalUrl(url);
  }, [url]);

  useEffect(() => {
    setLocalDescription(description);
  }, [description]);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    onTitleChange?.(value);
  };

  const handleUrlChange = (value: string) => {
    setLocalUrl(value);
    onUrlChange?.(value);
  };

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    onDescriptionChange?.(value);
  };

  const titleLength = localTitle.length;
  const descriptionLength = localDescription.length;
  const titleTruncated = localTitle.slice(0, 60);
  const descriptionTruncated = localDescription.slice(0, 160);

  // Extract domain from URL for breadcrumb
  const getDomain = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return urlString;
    }
  };

  const domain = getDomain(localUrl);

  return (
    <div className="space-y-6">
      {/* Editable fields */}
      {editable && (
        <div className="space-y-4 bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div>
            <Label className="block mb-2">
              Title
              <span
                className={`ml-2 text-xs ${
                  titleLength > 60 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {titleLength} / 60 chars
                {titleLength > 60 && ' ⚠️ Too long'}
              </span>
            </Label>
            <Input
              type="text"
              value={localTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="bg-slate-900 border-slate-600 rounded-lg px-4"
              placeholder="Enter page title..."
            />
          </div>

          <div>
            <Label className="block mb-2">
              URL
            </Label>
            <Input
              type="text"
              value={localUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="bg-slate-900 border-slate-600 rounded-lg px-4"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label className="block mb-2">
              Description
              <span
                className={`ml-2 text-xs ${
                  descriptionLength > 160 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {descriptionLength} / 160 chars
                {descriptionLength > 160 && ' ⚠️ Too long'}
              </span>
            </Label>
            <Textarea
              value={localDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={3}
              className="bg-slate-900 border-slate-600 rounded-lg px-4 resize-none"
              placeholder="Enter meta description..."
            />
          </div>

          {/* Character warnings */}
          {(titleLength > 60 || descriptionLength > 160) && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3">
              <p className="text-sm text-red-400">
                ⚠️ <strong>SEO Warning:</strong> Google typically truncates titles over 60
                characters and descriptions over 160 characters in search results.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Google SERP Preview */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-start gap-3">
          {/* Favicon placeholder */}
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-4 h-4 rounded-full bg-slate-400" />
          </div>

          <div className="flex-1 min-w-0">
            {/* URL breadcrumb */}
            <div className="flex items-center gap-1 text-sm mb-0.5">
              <span className="text-slate-700">{domain}</span>
              <svg
                className="w-3 h-3 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>

            {/* Title link */}
            <h3 className="text-xl text-blue-700 hover:underline cursor-pointer leading-snug mb-1 break-words font-normal">
              {titleLength > 60 ? `${titleTruncated}...` : localTitle}
            </h3>

            {/* Description */}
            <p className="text-sm text-slate-700 leading-relaxed break-words">
              {descriptionLength > 160
                ? `${descriptionTruncated}...`
                : localDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Character count summary */}
      {!editable && (
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-slate-400">Title: </span>
            <span
              className={titleLength > 60 ? 'text-red-400 font-medium' : 'text-slate-300'}
            >
              {titleLength} / 60
            </span>
          </div>
          <div>
            <span className="text-slate-400">Description: </span>
            <span
              className={
                descriptionLength > 160 ? 'text-red-400 font-medium' : 'text-slate-300'
              }
            >
              {descriptionLength} / 160
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

```

# components/Skeleton.tsx

```tsx
'use client';

/** Base shimmer block */
function Bone({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-700/50 ${className}`}
    />
  );
}

/** Skeleton for the dashboard plan cards grid */
export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Bone className="h-8 w-48 mb-2" />
          <Bone className="h-4 w-24" />
        </div>
        <Bone className="h-10 w-36 rounded-xl" />
      </div>
      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <Bone className="flex-1 h-10 rounded-xl" />
        <Bone className="h-10 w-36 rounded-xl" />
      </div>
      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5"
          >
            <div className="flex items-start gap-4 mb-4">
              <Bone className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Bone className="h-5 w-3/4 mb-2" />
                <Bone className="h-3 w-full" />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <Bone className="h-5 w-20 rounded-full" />
              <Bone className="h-5 w-16 rounded-full" />
            </div>
            <Bone className="h-3 w-28 mb-4" />
            <Bone className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for plan detail page */
export function PlanDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Nav */}
      <Bone className="h-10 w-full rounded-xl mb-6" />
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Bone className="w-14 h-14 rounded-xl" />
        <div className="flex-1">
          <Bone className="h-7 w-64 mb-2" />
          <Bone className="h-4 w-96" />
        </div>
      </div>
      {/* Config summary */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </div>
      {/* Stage sections */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 mb-4">
          <Bone className="h-6 w-64" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for draft / translate pages */
export function DraftSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <Bone className="h-10 w-full rounded-xl mb-6" />
      <div className="mb-8">
        <Bone className="h-8 w-72 mb-2" />
        <Bone className="h-4 w-96" />
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Bone key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-700/30 mb-4 p-4">
          <Bone className="h-5 w-48 mb-4" />
          <Bone className="h-32 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for SERP preview page */
export function SerpSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <Bone className="h-10 w-full rounded-xl mb-6" />
      <div className="flex items-center gap-4 mb-8">
        <Bone className="w-14 h-14 rounded-xl" />
        <div className="flex-1">
          <Bone className="h-7 w-72 mb-2" />
          <Bone className="h-4 w-80" />
        </div>
      </div>
      <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-5 mb-8">
        <Bone className="h-20 w-full" />
      </div>
      {/* SERP preview card */}
      <div className="bg-white rounded-xl p-6">
        <Bone className="h-4 w-64 mb-2 bg-slate-300/50" />
        <Bone className="h-6 w-96 mb-2 bg-blue-300/30" />
        <Bone className="h-12 w-full bg-slate-300/50" />
      </div>
    </div>
  );
}

/** Generic page skeleton */
export function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <Bone className="h-8 w-48 mb-2" />
      <Bone className="h-4 w-72 mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <Bone className="h-5 w-64 mb-3" />
            <Bone className="h-4 w-full mb-2" />
            <Bone className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

```

# components/StatusBadge.tsx

```tsx
export type Status = 'ready' | 'pending' | 'empty' | 'generating';

export function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    ready: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400',
    pending: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400',
    empty: 'bg-slate-500/10 text-slate-600 border-slate-500/25 dark:text-slate-400',
    generating: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:text-indigo-400',
  };

  const labels: Record<Status, string> = {
    ready: '✓ Ready',
    pending: '⏳ Pending',
    empty: '○ Not generated',
    generating: '⟳ Generating',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

```

# components/theme/theme.ts

```ts
export const THEME_STORAGE_KEY = 'marketing-tool-theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

```

# components/theme/ThemeProvider.tsx

```tsx
'use client';

import * as React from 'react';

import {
  isThemePreference,
  ResolvedTheme,
  THEME_STORAGE_KEY,
  ThemePreference,
} from '@/components/theme/theme';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

function applyTheme(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>('light');

  React.useEffect(() => {
    const fromStorage = localStorage.getItem(THEME_STORAGE_KEY);
    const nextPreference = isThemePreference(fromStorage) ? fromStorage : 'system';
    const nextResolved = resolveTheme(nextPreference);

    setPreferenceState(nextPreference);
    setResolvedTheme(nextResolved);
    applyTheme(nextResolved);
  }, []);

  React.useEffect(() => {
    if (preference !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const nextResolved = media.matches ? 'dark' : 'light';
      setResolvedTheme(nextResolved);
      applyTheme(nextResolved);
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;

      const nextPreference = isThemePreference(event.newValue) ? event.newValue : 'system';
      const nextResolved = resolveTheme(nextPreference);
      setPreferenceState(nextPreference);
      setResolvedTheme(nextResolved);
      applyTheme(nextResolved);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = React.useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    localStorage.setItem(THEME_STORAGE_KEY, value);

    const nextResolved = resolveTheme(value);
    setResolvedTheme(nextResolved);
    applyTheme(nextResolved);
  }, []);

  const contextValue = React.useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = React.useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return value;
}

```

# components/theme/ThemeScript.tsx

```tsx
import { THEME_STORAGE_KEY } from '@/components/theme/theme';

const THEME_INIT_SCRIPT = `(() => {
  try {
    const saved = localStorage.getItem('${THEME_STORAGE_KEY}');
    const preference = saved === 'light' || saved === 'dark' || saved === 'system'
      ? saved
      : 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  } catch (_) {
    // noop
  }
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}

```

# components/theme/ThemeToggle.tsx

```tsx
'use client';

import type { ComponentType } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ThemePreference } from '@/components/theme/theme';
import { useTheme } from '@/components/theme/ThemeProvider';

const OPTIONS: Array<{
  label: string;
  value: ThemePreference;
  icon: ComponentType<{ className?: string }>;
}> = [
  { label: 'System', value: 'system', icon: Monitor },
  { label: 'Light', value: 'light', icon: Sun },
  { label: 'Dark', value: 'dark', icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-xl border border-slate-300/80 bg-white/80 p-1 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70',
        className
      )}
      role="group"
      aria-label="Theme switcher"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = preference === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
            aria-pressed={isActive}
            aria-label={`Use ${option.label.toLowerCase()} theme`}
            title={`Use ${option.label.toLowerCase()} theme`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

```

# components/Toast.tsx

```tsx
'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bg =
    toast.type === 'success'
      ? 'bg-emerald-600/90 border-emerald-500/50'
      : toast.type === 'error'
        ? 'bg-red-600/90 border-red-500/50'
        : 'bg-slate-700/90 border-slate-600/50';

  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ';

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-white text-sm shadow-lg backdrop-blur-sm transition-all duration-300 ${bg} ${exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
        }`}
    >
      <span className="font-bold">{icon}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="text-white/60 hover:text-white ml-2"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

```

# components/ui/alert-dialog.tsx

```tsx
"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm"
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 group/alert-dialog-content fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-lg",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "text-lg font-semibold sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "bg-muted mb-2 inline-flex size-16 items-center justify-center rounded-md sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}

```

# components/ui/badge.tsx

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-indigo-500/15 text-indigo-700 border-indigo-500/25 [a&]:hover:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30 dark:[a&]:hover:bg-indigo-500/25",
        secondary:
          "bg-slate-100 text-slate-700 border-slate-300 [a&]:hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600/60 dark:[a&]:hover:bg-slate-700/80",
        destructive:
          "bg-red-500/10 text-red-700 border-red-500/25 [a&]:hover:bg-red-500/15 dark:text-red-200 dark:border-red-500/30 dark:[a&]:hover:bg-red-500/20",
        outline:
          "border-slate-300 text-slate-600 [a&]:hover:bg-slate-100 [a&]:hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:[a&]:hover:bg-slate-800/50 dark:[a&]:hover:text-white",
        ghost: "text-slate-600 [a&]:hover:bg-slate-100 [a&]:hover:text-slate-900 dark:text-slate-300 dark:[a&]:hover:bg-slate-800/50 dark:[a&]:hover:text-white",
        link: "text-indigo-600 underline-offset-4 [a&]:hover:text-indigo-500 [a&]:hover:underline dark:text-indigo-300 dark:[a&]:hover:text-indigo-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

```

# components/ui/button.tsx

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white hover:bg-indigo-500",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500",
        outline:
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:text-white",
        secondary:
          "bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600",
        ghost:
          "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/40",
        link: "text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

```

# components/ui/card.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-2xl border border-slate-200 bg-white text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-white",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-lg font-semibold text-slate-900 dark:text-white", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-slate-600 dark:text-slate-400", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }

```

# components/ui/collapsible.tsx

```tsx
"use client"

import { Collapsible as CollapsiblePrimitive } from "radix-ui"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

```

# components/ui/dialog.tsx

```tsx
"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

```

# components/ui/input.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white dark:placeholder:text-slate-500 dark:file:text-white",
        className
      )}
      {...props}
    />
  )
}

export { Input }

```

# components/ui/label.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "text-sm font-medium text-slate-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-slate-300",
        className
      )}
      {...props}
    />
  )
}

export { Label }

```

# components/ui/select.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white",
        className
      )}
      {...props}
    />
  )
}

export { Select }

```

# components/ui/sheet.tsx

```tsx
"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

```

# components/ui/textarea.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white dark:placeholder:text-slate-500",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

```

# components/VariantPicker.tsx

```tsx
'use client';

import { useCallback, useMemo, useState } from 'react';

interface VariantPickerProps {
  text: string;
  appContext: string;
  onPick: (text: string) => void;
}

function Spinner({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function VariantPicker({ text, appContext, onPick }: VariantPickerProps) {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F'], []);

  const dismiss = useCallback(() => {
    setVariants(null);
    setError(null);
    setLoading(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context: appContext, count: 3 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      if (!Array.isArray(data.variants)) {
        throw new Error('No variants returned');
      }

      setVariants(data.variants.filter((v: unknown) => typeof v === 'string'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setVariants(null);
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  }, [loading, text, appContext]);

  const handlePick = useCallback(
    (variant: string) => {
      onPick(variant);
      dismiss();
    },
    [onPick, dismiss]
  );

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <Spinner />
              Generating…
            </>
          ) : (
            '🔀 Generate Variants'
          )}
        </button>

        {variants && !loading && (
          <button
            onClick={handleGenerate}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Regenerate
          </button>
        )}

        {(variants || error) && !loading && (
          <button
            onClick={dismiss}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4"
          >
            Cancel
          </button>
        )}

        {error && (
          <span className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 px-2 py-1 rounded-lg">
            {error}
          </span>
        )}
      </div>

      {variants && variants.length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {variants.slice(0, 6).map((variant, idx) => (
            <div
              key={idx}
              className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold tracking-wide bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  {labels[idx] || String(idx + 1)}
                </span>
              </div>

              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {variant}
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => handlePick(variant)}
                  className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Use this
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

```

# hooks/useKeyboardShortcuts.tsx

```tsx
'use client';

import { useEffect, useRef } from 'react';

type Shortcut = {
    key: string;
    meta?: boolean;
    ctrl?: boolean;
    handler: () => void;
};

/**
 * Registers keyboard shortcuts. Prevents default browser behavior.
 * Example: useKeyboardShortcuts([{ key: 'Enter', meta: true, handler: onGenerate }])
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    const shortcutsRef = useRef(shortcuts);

    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            for (const s of shortcutsRef.current) {
                const metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : true;
                const ctrlMatch = s.ctrl ? (e.metaKey || e.ctrlKey) : true;
                if (e.key === s.key && metaMatch && ctrlMatch) {
                    e.preventDefault();
                    s.handler();
                    return;
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []); // Empty dependency array = stable listener
}

/**
 * Renders a keyboard shortcut hint badge.
 */
export function KbdHint({ keys }: { keys: string }) {
    return (
        <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-slate-400 border border-white/[0.06]">
            {keys}
        </kbd>
    );
}

```

# hooks/usePlan.ts

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MarketingPlan } from '@/lib/types';

/**
 * Shared hook for loading a marketing plan by ID.
 * - Hydrates from sessionStorage for instant rendering
 * - Fetches fresh data from /api/plans/:id
 * - Caches the result back to sessionStorage
 */
export function usePlan(id: string) {
    const [plan, setPlan] = useState<MarketingPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        setLoading(true);

        // Try sessionStorage first for instant hydration
        try {
            const cached = sessionStorage.getItem(`plan-${id}`);
            if (cached) {
                const parsed = JSON.parse(cached) as MarketingPlan;
                setPlan(parsed);
                // Do NOT return early — fetch fresh data in background (stale-while-revalidate)
            }
        } catch {
            // ignore corrupt cache
        }

        const controller = new AbortController();
        const signal = controller.signal;

        // Fetch from API
        try {
            const res = await fetch(`/api/plans/${id}`, { signal });
            if (!res.ok) throw new Error('Failed to load plan');
            const data = (await res.json()) as MarketingPlan;

            // Only update if component is still mounted
            if (!signal.aborted) {
                setPlan(data);
                try {
                    sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
                } catch {
                    // storage full — ignore
                }
            }
        } catch (err) {
            if (!signal.aborted) {
                setError(err instanceof Error ? err.message : 'Failed to load plan');
            }
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }

        return () => controller.abort();
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    return { plan, loading, error, reload: load };
}

```

# lib/api-guard.ts

```ts
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  consumeApiRateLimit,
  trackApiUsage,
  type RateLimitActorType,
} from '@/lib/db';

interface ApiGuardOptions {
  endpoint?: string;
  windowSeconds?: number;
  maxRequests?: number;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function hashApiKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function extractClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const candidates = [
    request.headers.get('x-real-ip'),
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-client-ip'),
    request.headers.get('fastly-client-ip'),
    (request as NextRequest & { ip?: string }).ip,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function getActorIdentity(request: NextRequest): {
  actorType: RateLimitActorType;
  actorKey: string;
} {
  const apiKey = request.headers.get('x-api-key')?.trim();
  if (apiKey) {
    return {
      actorType: 'api_key',
      actorKey: hashApiKey(apiKey),
    };
  }

  const ip = extractClientIp(request);
  if (ip) {
    return {
      actorType: 'ip',
      actorKey: ip.slice(0, 128),
    };
  }

  return {
    actorType: 'unknown',
    actorKey: 'unknown',
  };
}

export function guardApiRoute(request: NextRequest, options: ApiGuardOptions = {}): NextResponse | null {
  const endpoint = options.endpoint ?? request.nextUrl.pathname;
  const windowSeconds = parsePositiveInt(
    options.windowSeconds ?? process.env.API_RATE_LIMIT_WINDOW_SECONDS,
    60
  );
  const maxRequests = parsePositiveInt(
    options.maxRequests ?? process.env.API_RATE_LIMIT_MAX_REQUESTS,
    30
  );
  const actor = getActorIdentity(request);

  try {
    const rate = consumeApiRateLimit({
      endpoint,
      actorType: actor.actorType,
      actorKey: actor.actorKey,
      windowSeconds,
      maxRequests,
    });

    trackApiUsage({
      endpoint,
      actorType: actor.actorType,
      actorKey: actor.actorKey,
      blocked: !rate.allowed,
    });

    if (rate.allowed) {
      return null;
    }

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        endpoint,
        limit: rate.limit,
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfterSeconds),
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': String(rate.remaining),
          'X-RateLimit-Reset': String(rate.resetAtEpochSeconds),
        },
      }
    );
  } catch (error) {
    console.error('Rate limiter failure, allowing request:', error);
    return null;
  }
}

```

# lib/asset-generator.ts

```ts
import { AssetConfig, GeneratedAsset } from './types';

function fillTemplate(html: string, config: AssetConfig): string {
  let result = html;
  result = result.replace(/\{\{name\}\}/g, config.name);
  result = result.replace(/\{\{tagline\}\}/g, config.tagline);
  result = result.replace(/\{\{icon\}\}/g, config.icon);
  result = result.replace(/\{\{url\}\}/g, config.url);
  result = result.replace(/\{\{background\}\}/g, config.colors.background);
  result = result.replace(/\{\{text\}\}/g, config.colors.text);
  result = result.replace(/\{\{primary\}\}/g, config.colors.primary);
  result = result.replace(/\{\{secondary\}\}/g, config.colors.secondary);
  result = result.replace(/\{\{year\}\}/g, new Date().getFullYear().toString());

  // Features
  for (let i = 0; i < 10; i++) {
    result = result.replace(
      new RegExp(`\\{\\{feature_${i + 1}\\}\\}`, 'g'),
      config.features[i] || `Feature ${i + 1}`
    );
  }
  result = result.replace(/\{\{feature_count\}\}/g, config.features.length.toString());

  return result;
}

const OG_IMAGE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1200">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  body { background: {{background}}; color: {{text}}; position: relative; display: flex; align-items: center; justify-content: center; }
  .bg-gradient { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 10% 90%, {{primary}}22 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 85% 20%, {{secondary}}33 0%, transparent 50%); }
  .bg-grid { position: absolute; inset: 0; background-image: linear-gradient({{text}}06 1px, transparent 1px), linear-gradient(90deg, {{text}}06 1px, transparent 1px); background-size: 40px 40px; }
  .glow-orb { position: absolute; width: 400px; height: 400px; border-radius: 50%; background: {{primary}}; opacity: 0.07; filter: blur(100px); top: -80px; right: -60px; }
  .content { position: relative; z-index: 1; width: 100%; height: 100%; padding: 64px 72px; display: flex; flex-direction: column; justify-content: center; }
  .icon { font-size: 56px; margin-bottom: 24px; filter: drop-shadow(0 4px 24px {{primary}}44); line-height: 1; }
  .app-name { font-size: 64px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 16px; background: linear-gradient(135deg, {{text}} 0%, {{text}}cc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .tagline { font-size: 26px; font-weight: 500; color: {{text}}aa; line-height: 1.4; max-width: 700px; margin-bottom: 40px; }
  .url-badge { display: inline-flex; align-items: center; gap: 8px; background: {{text}}0a; border: 1px solid {{text}}15; border-radius: 100px; padding: 10px 20px; font-size: 16px; font-weight: 500; color: {{primary}}; letter-spacing: 0.01em; backdrop-filter: blur(8px); }
  .url-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: {{primary}}; box-shadow: 0 0 12px {{primary}}88; }
  .accent-line { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, {{primary}}, {{secondary}}, {{primary}}44); }
  .corner-deco { position: absolute; top: 48px; right: 72px; display: flex; gap: 6px; }
  .corner-deco span { width: 12px; height: 12px; border-radius: 50%; border: 2px solid {{text}}20; }
  .corner-deco span:first-child { background: {{primary}}; border-color: {{primary}}; }
</style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="bg-grid"></div>
  <div class="glow-orb"></div>
  <div class="content">
    <div class="icon">{{icon}}</div>
    <h1 class="app-name">{{name}}</h1>
    <p class="tagline">{{tagline}}</p>
    <div class="url-badge"><span class="dot"></span>{{url}}</div>
  </div>
  <div class="corner-deco"><span></span><span></span><span></span></div>
  <div class="accent-line"></div>
</body>
</html>`;

const SOCIAL_CARD_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1080px; overflow: hidden; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  body { background: {{background}}; color: {{text}}; position: relative; display: flex; flex-direction: column; }
  .bg { position: absolute; inset: 0; background: radial-gradient(circle 500px at 20% 80%, {{primary}}18 0%, transparent 70%), radial-gradient(circle 400px at 80% 20%, {{secondary}}25 0%, transparent 60%); }
  .geo { position: absolute; width: 320px; height: 320px; border: 2px solid {{primary}}15; border-radius: 40px; transform: rotate(45deg); top: -80px; right: -80px; }
  .geo::after { content: ''; position: absolute; inset: 24px; border: 2px solid {{primary}}10; border-radius: 30px; }
  .content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; padding: 72px 64px; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 48px; }
  .icon { font-size: 40px; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: {{primary}}15; border-radius: 16px; border: 1px solid {{primary}}25; }
  .app-name { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: {{text}}dd; }
  .feature-section { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 32px; }
  .feature-label { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: {{primary}}; }
  .feature-text { font-size: 56px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; background: linear-gradient(135deg, {{text}} 30%, {{primary}} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; max-width: 800px; }
  .feature-desc { font-size: 22px; font-weight: 400; color: {{text}}88; line-height: 1.5; max-width: 700px; }
  .footer { position: relative; z-index: 1; padding: 0 64px 56px; display: flex; align-items: center; justify-content: space-between; }
  .badges { display: flex; gap: 24px; }
  .badge { font-size: 15px; font-weight: 500; color: {{text}}66; display: flex; align-items: center; gap: 8px; }
  .badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: {{primary}}88; }
  .feature-number { font-size: 120px; font-weight: 900; color: {{primary}}0c; position: absolute; right: 64px; bottom: 120px; line-height: 1; letter-spacing: -0.05em; }
  .bar { position: absolute; bottom: 0; left: 64px; right: 64px; height: 3px; border-radius: 3px; background: linear-gradient(90deg, {{primary}}, {{primary}}33); }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="geo"></div>
  <div class="content">
    <div class="header">
      <div class="icon">{{icon}}</div>
      <div class="app-name">{{name}}</div>
    </div>
    <div class="feature-section">
      <div class="feature-label">Featured</div>
      <div class="feature-text">{{feature_1}}</div>
      <div class="feature-desc">{{tagline}}</div>
    </div>
  </div>
  <div class="feature-number">01</div>
  <div class="footer">
    <div class="badges">
      <span class="badge">Free</span>
      <span class="badge">No install</span>
      <span class="badge">Open source</span>
    </div>
  </div>
  <div class="bar"></div>
</body>
</html>`;

const GITHUB_SOCIAL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1280px; height: 640px; overflow: hidden; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  body { background: #0d1117; color: #e6edf3; position: relative; display: flex; }
  .bg { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 80% at 0% 100%, {{primary}}12 0%, transparent 50%), radial-gradient(ellipse 50% 60% at 100% 0%, {{secondary}}15 0%, transparent 50%); }
  .bg-dots { position: absolute; inset: 0; background-image: radial-gradient(#e6edf308 1px, transparent 1px); background-size: 24px 24px; }
  .content { position: relative; z-index: 1; flex: 1; display: flex; padding: 56px 72px; gap: 64px; }
  .left { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .gh-badge { display: inline-flex; align-items: center; gap: 8px; background: #21262d; border: 1px solid #30363d; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 500; color: #8b949e; margin-bottom: 28px; width: fit-content; font-family: 'JetBrains Mono', monospace; }
  .gh-badge .gh-icon { width: 18px; height: 18px; border-radius: 50%; background: #e6edf3; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #0d1117; font-weight: 700; }
  .icon-row { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
  .icon { font-size: 44px; line-height: 1; }
  .app-name { font-size: 48px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; color: #e6edf3; }
  .description { font-size: 22px; font-weight: 400; color: #8b949e; line-height: 1.5; margin-bottom: 36px; max-width: 560px; }
  .stats { display: flex; flex-wrap: wrap; gap: 12px; }
  .stat { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: #e6edf3cc; }
  .stat .dot { width: 8px; height: 8px; border-radius: 50%; background: {{primary}}; }
  .right { width: 400px; display: flex; flex-direction: column; justify-content: center; }
  .code-block { background: #161b22; border: 1px solid #30363d; border-radius: 12px; overflow: hidden; }
  .code-titlebar { display: flex; align-items: center; gap: 8px; padding: 14px 18px; background: #1c2129; border-bottom: 1px solid #30363d; }
  .code-dot { width: 12px; height: 12px; border-radius: 50%; background: #30363d; }
  .code-dot:nth-child(1) { background: #f85149; }
  .code-dot:nth-child(2) { background: #d29922; }
  .code-dot:nth-child(3) { background: #3fb950; }
  .code-content { padding: 20px 22px; font-family: 'JetBrains Mono', monospace; font-size: 14px; line-height: 1.7; color: #8b949e; }
  .code-line { display: block; }
  .code-comment { color: #484f58; }
  .code-keyword { color: #ff7b72; }
  .code-string { color: #a5d6ff; }
  .code-primary { color: {{primary}}; }
  .bottom { position: absolute; bottom: 0; left: 0; right: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 16px 72px; border-top: 1px solid #21262d; background: #0d1117ee; }
  .repo-url { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: #58a6ff; font-weight: 500; }
  .license { font-size: 13px; color: #484f58; font-weight: 500; }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="bg-dots"></div>
  <div class="content">
    <div class="left">
      <div class="gh-badge"><span class="gh-icon">◆</span>Public repository</div>
      <div class="icon-row">
        <span class="icon">{{icon}}</span>
        <h1 class="app-name">{{name}}</h1>
      </div>
      <p class="description">{{tagline}}</p>
      <div class="stats">
        <span class="stat"><span class="dot"></span>{{feature_1}}</span>
      </div>
    </div>
    <div class="right">
      <div class="code-block">
        <div class="code-titlebar"><span class="code-dot"></span><span class="code-dot"></span><span class="code-dot"></span></div>
        <div class="code-content">
          <span class="code-line"><span class="code-comment">// {{name}}</span></span>
          <span class="code-line"><span class="code-comment">// {{tagline}}</span></span>
          <span class="code-line">&nbsp;</span>
          <span class="code-line"><span class="code-keyword">const</span> features = [</span>
          <span class="code-line">&nbsp;&nbsp;<span class="code-string">"{{feature_1}}"</span>,</span>
          <span class="code-line">&nbsp;&nbsp;<span class="code-string">"{{feature_2}}"</span>,</span>
          <span class="code-line">&nbsp;&nbsp;<span class="code-string">"{{feature_3}}"</span>,</span>
          <span class="code-line">&nbsp;&nbsp;<span class="code-string">"{{feature_4}}"</span>,</span>
          <span class="code-line">];</span>
        </div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <span class="repo-url">{{url}}</span>
    <span class="license">MIT License · {{year}}</span>
  </div>
</body>
</html>`;

export function generateAssets(config: AssetConfig): GeneratedAsset[] {
  return [
    {
      type: 'og-image',
      label: 'OG Image (1200×630)',
      width: 1200,
      height: 630,
      html: fillTemplate(OG_IMAGE_TEMPLATE, config),
    },
    {
      type: 'social-card',
      label: 'Social Card (1080×1080)',
      width: 1080,
      height: 1080,
      html: fillTemplate(SOCIAL_CARD_TEMPLATE, config),
    },
    {
      type: 'github-social',
      label: 'GitHub Social (1280×640)',
      width: 1280,
      height: 640,
      html: fillTemplate(GITHUB_SOCIAL_TEMPLATE, config),
    },
  ];
}

```

# lib/auth-guard.ts

```ts
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

function secureCompare(input: string, expected: string): boolean {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  const maxLength = Math.max(inputBuffer.length, expectedBuffer.length);

  const left = Buffer.alloc(maxLength);
  const right = Buffer.alloc(maxLength);
  inputBuffer.copy(left);
  expectedBuffer.copy(right);

  const equal = timingSafeEqual(left, right);
  return equal && inputBuffer.length === expectedBuffer.length;
}

export function hasValidApiKey(request: NextRequest): boolean {
  const expectedApiKey = process.env.API_KEY;
  if (!expectedApiKey) return false;

  const headerApiKey = request.headers.get('x-api-key');
  if (headerApiKey && secureCompare(headerApiKey, expectedApiKey)) {
    return true;
  }

  const queryApiKey = request.nextUrl.searchParams.get('api_key');
  return Boolean(queryApiKey && secureCompare(queryApiKey, expectedApiKey));
}

export function hasValidBasicAuth(request: NextRequest): boolean {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASS;
  if (!expectedUser || !expectedPass) return false;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const [scheme, encoded] = authHeader.split(' ');
  if (!scheme || !encoded || scheme.toLowerCase() !== 'basic') {
    return false;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return false;

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

  return secureCompare(user, expectedUser) && secureCompare(pass, expectedPass);
}

export function requireOrchestratorAuth(request: NextRequest): NextResponse | null {
  if (hasValidApiKey(request) || hasValidBasicAuth(request)) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

```

# lib/constants.ts

```ts
export const DISTRIBUTION_CHANNELS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'X / Twitter' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'product_hunt', label: 'Product Hunt' },
  { id: 'app_store', label: 'App Store' },
  { id: 'email', label: 'Email' },
];

```

# lib/db.ts

```ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'marketing-tool.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        scraped TEXT NOT NULL,
        generated TEXT NOT NULL,
        stages TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        share_token TEXT
      )
    `);

    db.exec(`
CREATE TABLE IF NOT EXISTS approval_queue (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        section_type TEXT NOT NULL,
        section_label TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
        edited_content TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS plan_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content_key TEXT,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(plan_id, content_type, content_key)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS content_schedule (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'instagram',
        content_type TEXT NOT NULL DEFAULT 'post',
        topic TEXT,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        post_id TEXT,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT,
        platform TEXT NOT NULL,
        caption TEXT,
        hashtags TEXT,
        media_url TEXT,
        method TEXT,
        buffer_response TEXT,
        status TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS orchestration_runs (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('running','done','failed')),
        current_step TEXT,
        steps_json TEXT NOT NULL,
        input_json TEXT NOT NULL,
        output_refs_json TEXT NOT NULL DEFAULT '{}',
        last_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_orch_runs_plan_id ON orchestration_runs(plan_id)
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS api_rate_limits (
        endpoint TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        actor_key TEXT NOT NULL,
        window_start_epoch INTEGER NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (endpoint, actor_type, actor_key, window_start_epoch)
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at
      ON api_rate_limits(updated_at)
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS api_usage_daily (
        day TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        actor_key TEXT NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        blocked_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (day, endpoint, actor_type, actor_key)
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_api_usage_daily_endpoint_day
      ON api_usage_daily(endpoint, day)
    `);

    // Migration: add share_token if missing
    const cols = db.prepare("PRAGMA table_info(plans)").all() as { name: string }[];
    if (!cols.some((c) => c.name === 'share_token')) {
      db.exec("ALTER TABLE plans ADD COLUMN share_token TEXT");
    }

    // Migration: add performance tracking columns
    const schedCols = db.prepare("PRAGMA table_info(content_schedule)").all() as { name: string }[];
    if (!schedCols.some((c) => c.name === 'performance_rating')) {
      db.exec("ALTER TABLE content_schedule ADD COLUMN performance_rating TEXT");
    }
    if (!schedCols.some((c) => c.name === 'performance_notes')) {
      db.exec("ALTER TABLE content_schedule ADD COLUMN performance_notes TEXT");
    }
    if (!schedCols.some((c) => c.name === 'performance_metrics')) {
      db.exec("ALTER TABLE content_schedule ADD COLUMN performance_metrics TEXT");
    }

    // Migration: add orchestration run columns if missing
    const runCols = db.prepare("PRAGMA table_info(orchestration_runs)").all() as { name: string }[];
    if (!runCols.some((c) => c.name === 'current_step')) {
      db.exec('ALTER TABLE orchestration_runs ADD COLUMN current_step TEXT');
    }
    if (!runCols.some((c) => c.name === 'steps_json')) {
      db.exec("ALTER TABLE orchestration_runs ADD COLUMN steps_json TEXT NOT NULL DEFAULT '[]'");
    }
    if (!runCols.some((c) => c.name === 'input_json')) {
      db.exec("ALTER TABLE orchestration_runs ADD COLUMN input_json TEXT NOT NULL DEFAULT '{}'");
    }
    if (!runCols.some((c) => c.name === 'output_refs_json')) {
      db.exec("ALTER TABLE orchestration_runs ADD COLUMN output_refs_json TEXT NOT NULL DEFAULT '{}'");
    }
    if (!runCols.some((c) => c.name === 'last_error')) {
      db.exec('ALTER TABLE orchestration_runs ADD COLUMN last_error TEXT');
    }

    const usageCols = db.prepare("PRAGMA table_info(api_usage_daily)").all() as { name: string }[];
    if (!usageCols.some((c) => c.name === 'blocked_count')) {
      db.exec('ALTER TABLE api_usage_daily ADD COLUMN blocked_count INTEGER NOT NULL DEFAULT 0');
    }
  }
  return db;
}

export interface PlanRow {
  id: string;
  config: string;
  scraped: string;
  generated: string;
  stages: string;
  created_at: string;
  updated_at: string;
  share_token: string | null;
}

export type ApprovalQueueStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalQueueRow {
  id: string;
  plan_id: string;
  section_type: string;
  section_label: string;
  content: string;
  status: ApprovalQueueStatus;
  edited_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentScheduleRow {
  id: string;
  plan_id: string;
  platform: string;
  content_type: string;
  topic: string | null;
  scheduled_at: string;
  status: string;
  post_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  performance_rating: string | null;
  performance_notes: string | null;
  performance_metrics: string | null;
}

export type OrchestrationRunStatus = 'running' | 'done' | 'failed';

export interface OrchestrationRunRow {
  id: string;
  plan_id: string;
  status: OrchestrationRunStatus;
  current_step: string | null;
  steps_json: string;
  input_json: string;
  output_refs_json: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRunInput {
  planId: string;
  status?: OrchestrationRunStatus;
  currentStep?: string | null;
  stepsJson: string;
  inputJson: string;
  outputRefsJson?: string;
  lastError?: string | null;
}

export interface UpdateRunPatch {
  status?: OrchestrationRunStatus;
  currentStep?: string | null;
  stepsJson?: string;
  inputJson?: string;
  outputRefsJson?: string;
  lastError?: string | null;
}

export function createRun(input: CreateRunInput): OrchestrationRunRow {
  const db = getDb();
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO orchestration_runs
      (id, plan_id, status, current_step, steps_json, input_json, output_refs_json, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(
    id,
    input.planId,
    input.status ?? 'running',
    input.currentStep ?? null,
    input.stepsJson,
    input.inputJson,
    input.outputRefsJson ?? '{}',
    input.lastError ?? null
  );

  const row = getRun(id);
  if (!row) {
    throw new Error('Failed to create orchestration run');
  }
  return row;
}

export function updateRun(id: string, patch: UpdateRunPatch): boolean {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.status !== undefined) {
    sets.push('status = ?');
    values.push(patch.status);
  }
  if (patch.currentStep !== undefined) {
    sets.push('current_step = ?');
    values.push(patch.currentStep);
  }
  if (patch.stepsJson !== undefined) {
    sets.push('steps_json = ?');
    values.push(patch.stepsJson);
  }
  if (patch.inputJson !== undefined) {
    sets.push('input_json = ?');
    values.push(patch.inputJson);
  }
  if (patch.outputRefsJson !== undefined) {
    sets.push('output_refs_json = ?');
    values.push(patch.outputRefsJson);
  }
  if (patch.lastError !== undefined) {
    sets.push('last_error = ?');
    values.push(patch.lastError);
  }

  if (sets.length === 0) return false;

  sets.push("updated_at = datetime('now')");
  values.push(id);

  const res = db.prepare(`UPDATE orchestration_runs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return res.changes > 0;
}

export function getRun(id: string): OrchestrationRunRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM orchestration_runs WHERE id = ?').get(id) as
    | OrchestrationRunRow
    | undefined;
}

export function listRunsByPlan(planId: string): OrchestrationRunRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM orchestration_runs WHERE plan_id = ? ORDER BY created_at DESC')
    .all(planId) as OrchestrationRunRow[];
}

export function getScheduleItemsForPlan(planId: string): ContentScheduleRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM content_schedule WHERE plan_id = ? ORDER BY scheduled_at DESC')
    .all(planId) as ContentScheduleRow[];
}

export function updateSchedulePerformance(
  id: string,
  rating: string | null,
  notes: string | null,
  metrics: string | null
) {
  const db = getDb();
  db.prepare(
    "UPDATE content_schedule SET performance_rating = ?, performance_notes = ?, performance_metrics = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(rating, notes, metrics, id);
}

export function savePlan(plan: {
  id: string;
  config: object;
  scraped: object;
  generated: string;
  stages: object;
  createdAt: string;
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO plans (id, config, scraped, generated, stages, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      config = excluded.config,
      scraped = excluded.scraped,
      generated = excluded.generated,
      stages = excluded.stages,
      updated_at = datetime('now')
`);
  stmt.run(
    plan.id,
    JSON.stringify(plan.config),
    JSON.stringify(plan.scraped),
    plan.generated,
    JSON.stringify(plan.stages),
    plan.createdAt
  );
}

export function getPlan(id: string): PlanRow | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM plans WHERE id = ?');
  return stmt.get(id) as PlanRow | undefined;
}

export function getAllPlans(): PlanRow[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM plans ORDER BY created_at DESC');
  return stmt.all() as PlanRow[];
}

export function deletePlan(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM plans WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function createShareToken(planId: string): string | null {
  const db = getDb();
  const plan = getPlan(planId);
  if (!plan) return null;
  if (plan.share_token) return plan.share_token;
  const token = crypto.randomUUID();
  db.prepare('UPDATE plans SET share_token = ? WHERE id = ?').run(token, planId);
  return token;
}

export function removeShareToken(planId: string): boolean {
  const db = getDb();
  const result = db.prepare('UPDATE plans SET share_token = NULL WHERE id = ?').run(planId);
  return result.changes > 0;
}

export function updatePlanContent(planId: string, key: string, value: unknown): void;
export function updatePlanContent(
  planId: string,
  patch: {
    config?: object;
    scraped?: object;
    generated?: string;
    stagesPatch?: Record<string, unknown>;
  }
): boolean;
/**
 * Update helper used by a few endpoints:
 * - updatePlanContent(planId, key, value) stores extra JSON in plans.content (legacy).
 * - updatePlanContent(planId, patch) partially updates plans fields (generate-all pipeline).
 */
export function updatePlanContent(planId: string, arg2: unknown, arg3?: unknown): boolean | void {
  const db = getDb();

  // Signature: (planId, key, value)
  if (typeof arg2 === 'string') {
    const key = arg2;
    const value = arg3;

    const row = getPlan(planId);
    if (!row) return;

    // Ensure content column exists
    const cols = db.prepare('PRAGMA table_info(plans)').all() as { name: string }[];
    if (!cols.some((c) => c.name === 'content')) {
      db.exec("ALTER TABLE plans ADD COLUMN content TEXT DEFAULT '{}'");
    }

    const existing = JSON.parse(
      ((row as unknown as Record<string, unknown>).content as string) || '{}'
    ) as Record<string, unknown>;

    existing[key] = value;

    db.prepare("UPDATE plans SET content = ?, updated_at = datetime('now') WHERE id = ?").run(
      JSON.stringify(existing),
      planId
    );

    return;
  }

  // Signature: (planId, patch)
  const patch = (arg2 || {}) as {
    config?: object;
    scraped?: object;
    generated?: string;
    stagesPatch?: Record<string, unknown>;
  };

  const row = getPlan(planId);
  if (!row) return false;

  const nextConfig = patch.config ? JSON.stringify(patch.config) : row.config;
  const nextScraped = patch.scraped ? JSON.stringify(patch.scraped) : row.scraped;
  const nextGenerated = typeof patch.generated === 'string' ? patch.generated : row.generated;

  let nextStagesObj: Record<string, unknown>;
  try {
    nextStagesObj = JSON.parse(row.stages || '{}');
  } catch {
    nextStagesObj = {};
  }

  if (patch.stagesPatch && typeof patch.stagesPatch === 'object') {
    nextStagesObj = { ...nextStagesObj, ...patch.stagesPatch };
  }

  const nextStages = JSON.stringify(nextStagesObj);

  const res = db
    .prepare(
      `UPDATE plans SET config = ?, scraped = ?, generated = ?, stages = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(nextConfig, nextScraped, nextGenerated, nextStages, planId);

  return res.changes > 0;
}

export function getPlanContent(planId: string): Record<string, unknown> {
  const db = getDb();
  // Ensure content column exists
  const cols = db.prepare('PRAGMA table_info(plans)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'content')) {
    db.exec("ALTER TABLE plans ADD COLUMN content TEXT DEFAULT '{}'");
  }
  const row = db
    .prepare('SELECT content FROM plans WHERE id = ?')
    .get(planId) as { content: string } | undefined;
  if (!row) return {};
  return JSON.parse(row.content || '{}');
}

export function getPlanByShareToken(token: string): PlanRow | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM plans WHERE share_token = ?')
    .get(token) as PlanRow | undefined;
}

export interface PlanContentRow {
  id: number;
  plan_id: string;
  content_type: string;
  content_key: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

function normaliseContentKey(contentKey?: string | null): string {
  // SQLite UNIQUE constraints treat NULL values as distinct, which breaks upserts
  // for single-result content types. We normalise "no key" to an empty string.
  return typeof contentKey === 'string' ? contentKey : '';
}

export function saveContent(
  planId: string,
  contentType: string,
  contentKey: string | null | undefined,
  content: string
): void {
  const db = getDb();
  const key = normaliseContentKey(contentKey);

  db.prepare(
    `INSERT INTO plan_content (plan_id, content_type, content_key, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(plan_id, content_type, content_key)
     DO UPDATE SET content = excluded.content, updated_at = datetime('now')`
  ).run(planId, contentType, key, content);
}

export function getContent(
  planId: string,
  contentType: string,
  contentKey?: string | null
): unknown {
  const db = getDb();
  if (typeof contentKey === 'string' || contentKey === null) {
    const key = normaliseContentKey(contentKey);
    const row = db
      .prepare(
        'SELECT content FROM plan_content WHERE plan_id = ? AND content_type = ? AND content_key = ?'
      )
      .get(planId, contentType, key) as { content: string } | undefined;

    if (!row) return null;
    try {
      return JSON.parse(row.content);
    } catch {
      return row.content;
    }
  }

  const rows = db
    .prepare(
      'SELECT content_key, content FROM plan_content WHERE plan_id = ? AND content_type = ? ORDER BY content_key'
    )
    .all(planId, contentType) as { content_key: string | null; content: string }[];

  return rows.map((r) => {
    let parsed: unknown = r.content;
    try {
      parsed = JSON.parse(r.content);
    } catch {
      // ignore
    }
    return { contentKey: r.content_key, content: parsed };
  });
}

export function getAllContent(planId: string): Array<{ contentType: string; contentKey: string | null; content: unknown }> {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT content_type, content_key, content FROM plan_content WHERE plan_id = ? ORDER BY content_type, content_key'
    )
    .all(planId) as { content_type: string; content_key: string | null; content: string }[];

  return rows.map((r) => {
    let parsed: unknown = r.content;
    try {
      parsed = JSON.parse(r.content);
    } catch {
      // ignore
    }
    return { contentType: r.content_type, contentKey: r.content_key, content: parsed };
  });
}

export type RateLimitActorType = 'ip' | 'api_key' | 'unknown';

export interface ConsumeApiRateLimitInput {
  endpoint: string;
  actorType: RateLimitActorType;
  actorKey: string;
  windowSeconds: number;
  maxRequests: number;
  nowMs?: number;
}

export interface ConsumeApiRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
  resetAtEpochSeconds: number;
}

export function consumeApiRateLimit(input: ConsumeApiRateLimitInput): ConsumeApiRateLimitResult {
  const db = getDb();

  const windowSeconds = Math.max(1, Math.floor(input.windowSeconds));
  const maxRequests = Math.max(1, Math.floor(input.maxRequests));
  const nowMs = typeof input.nowMs === 'number' ? input.nowMs : Date.now();
  const nowEpochSeconds = Math.floor(nowMs / 1000);
  const windowStartEpoch = nowEpochSeconds - (nowEpochSeconds % windowSeconds);
  const resetAtEpochSeconds = windowStartEpoch + windowSeconds;

  // Keep the working set bounded without requiring external cleanup jobs.
  db.prepare('DELETE FROM api_rate_limits WHERE window_start_epoch < ?').run(nowEpochSeconds - 172800);

  const nextCount = db.transaction(() => {
    const row = db
      .prepare(
        `SELECT request_count
         FROM api_rate_limits
         WHERE endpoint = ? AND actor_type = ? AND actor_key = ? AND window_start_epoch = ?`
      )
      .get(input.endpoint, input.actorType, input.actorKey, windowStartEpoch) as
      | { request_count: number }
      | undefined;

    if (!row) {
      db.prepare(
        `INSERT INTO api_rate_limits
          (endpoint, actor_type, actor_key, window_start_epoch, request_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
      ).run(input.endpoint, input.actorType, input.actorKey, windowStartEpoch);
      return 1;
    }

    const count = row.request_count + 1;
    db.prepare(
      `UPDATE api_rate_limits
       SET request_count = ?, updated_at = datetime('now')
       WHERE endpoint = ? AND actor_type = ? AND actor_key = ? AND window_start_epoch = ?`
    ).run(count, input.endpoint, input.actorType, input.actorKey, windowStartEpoch);

    return count;
  })();

  const remaining = Math.max(0, maxRequests - nextCount);
  const allowed = nextCount <= maxRequests;

  return {
    allowed,
    remaining,
    retryAfterSeconds: allowed ? 0 : Math.max(1, resetAtEpochSeconds - nowEpochSeconds),
    limit: maxRequests,
    resetAtEpochSeconds,
  };
}

export interface TrackApiUsageInput {
  endpoint: string;
  actorType: RateLimitActorType;
  actorKey: string;
  blocked: boolean;
  nowMs?: number;
}

export function trackApiUsage(input: TrackApiUsageInput): void {
  const db = getDb();
  const now = typeof input.nowMs === 'number' ? new Date(input.nowMs) : new Date();
  const day = now.toISOString().slice(0, 10);
  const blockedCount = input.blocked ? 1 : 0;

  db.prepare(
    `INSERT INTO api_usage_daily
      (day, endpoint, actor_type, actor_key, request_count, blocked_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
     ON CONFLICT(day, endpoint, actor_type, actor_key)
     DO UPDATE SET
       request_count = request_count + 1,
       blocked_count = blocked_count + excluded.blocked_count,
       updated_at = datetime('now')`
  ).run(day, input.endpoint, input.actorType, input.actorKey, blockedCount);
}

```

# lib/orchestrator.ts

```ts
import {
  getPlanContent,
  getRun,
  saveContent,
  updatePlanContent,
  updateRun,
  type OrchestrationRunStatus,
} from '@/lib/db';
import {
  atomizeContent,
  generateBrandVoice,
  generateCompetitiveAnalysis,
  generateDraft,
  generateEmailsSequence,
  generatePositioningAngles,
  generateTranslations,
  type SupportedLanguage,
} from '@/lib/pipeline';

const MAX_ORCHESTRATION_MS = 295_000;

const VALID_TONES = ['professional', 'casual', 'bold', 'minimal'] as const;
type Tone = (typeof VALID_TONES)[number];
type EmailSequenceType = 'welcome' | 'launch' | 'nurture';

export type OrchestrationStepId =
  | 'brand-voice'
  | 'positioning-angles'
  | 'competitive-analysis'
  | 'generate-draft'
  | 'generate-emails'
  | 'atomize-content'
  | 'generate-translations'
  | 'generate-video';

export type OrchestrationStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface OrchestrationStepState {
  id: OrchestrationStepId;
  label: string;
  status: OrchestrationStepStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface OrchestratePackInput {
  planId: string;
  goal?: string | null;
  tone?: string;
  channels?: string[];
  includeVideo?: boolean;
}

export interface NormalizedOrchestratePackInput {
  planId: string;
  goal: string | null;
  tone: Tone;
  channels: string[];
  includeVideo: boolean;
}

export interface ExecuteOrchestrationResult {
  runId: string;
  status: OrchestrationRunStatus;
  currentStep: string | null;
  lastError: string | null;
  steps: OrchestrationStepState[];
  outputRefs: Record<string, unknown>;
}

type HeaderValueReader = Pick<Headers, 'get'>;

const BASE_STEPS: Array<{ id: Exclude<OrchestrationStepId, 'generate-video'>; label: string }> = [
  { id: 'brand-voice', label: 'Brand Voice' },
  { id: 'positioning-angles', label: 'Positioning Angles' },
  { id: 'competitive-analysis', label: 'Competitive Analysis' },
  { id: 'generate-draft', label: 'Draft Copy' },
  { id: 'generate-emails', label: 'Email Sequence' },
  { id: 'atomize-content', label: 'Atomize Content' },
  { id: 'generate-translations', label: 'Translations' },
];

const STEP_ESTIMATE_MS: Record<OrchestrationStepId, number> = {
  'brand-voice': 25_000,
  'positioning-angles': 20_000,
  'competitive-analysis': 35_000,
  'generate-draft': 30_000,
  'generate-emails': 25_000,
  'atomize-content': 40_000,
  'generate-translations': 35_000,
  'generate-video': 15_000,
};

export function normalizeOrchestratePackInput(input: OrchestratePackInput): NormalizedOrchestratePackInput {
  const tone =
    typeof input.tone === 'string' && (VALID_TONES as readonly string[]).includes(input.tone)
      ? (input.tone as Tone)
      : 'bold';

  const channels = Array.isArray(input.channels)
    ? Array.from(
        new Set(
          input.channels
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim().toLowerCase())
            .filter((v) => v.length > 0)
        )
      )
    : [];

  const goal = typeof input.goal === 'string' && input.goal.trim().length > 0 ? input.goal.trim() : null;

  return {
    planId: input.planId,
    goal,
    tone,
    channels,
    includeVideo: Boolean(input.includeVideo),
  };
}

export function buildInitialSteps(includeVideo: boolean): OrchestrationStepState[] {
  const steps: OrchestrationStepState[] = BASE_STEPS.map((s) => ({
    ...s,
    status: 'pending',
  }));
  if (includeVideo) {
    steps.push({ id: 'generate-video', label: 'Video Kickoff', status: 'pending' });
  }
  return steps;
}

function parseSteps(
  stepsJson: string,
  includeVideo: boolean
): OrchestrationStepState[] {
  const defaults = buildInitialSteps(includeVideo);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stepsJson);
  } catch {
    return defaults;
  }

  if (!Array.isArray(parsed)) {
    return defaults;
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as Record<string, unknown>).id;
    if (typeof id === 'string') {
      byId.set(id, item as Record<string, unknown>);
    }
  }

  return defaults.map((d) => {
    const prev = byId.get(d.id);
    if (!prev) return d;

    const status = prev.status;
    const startedAt = prev.startedAt;
    const finishedAt = prev.finishedAt;
    const error = prev.error;

    return {
      id: d.id,
      label: d.label,
      status:
        status === 'pending' || status === 'running' || status === 'done' || status === 'failed'
          ? status
          : 'pending',
      startedAt: typeof startedAt === 'string' ? startedAt : undefined,
      finishedAt: typeof finishedAt === 'string' ? finishedAt : undefined,
      error: typeof error === 'string' ? error : undefined,
    };
  });
}

function parseOutputRefs(outputRefsJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(outputRefsJson);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
}

export function internalBaseUrl(): string {
  // Safe for server-to-server fetches within this Next.js process.
  // Do NOT derive from request headers (SSRF risk).
  const port = process.env.PORT ?? '3000';
  return `http://localhost:${port}`;
}

export function getForwardedInternalAuthHeaders(headers: HeaderValueReader): Record<string, string> {
  const forwarded: Record<string, string> = {};

  const authorization = headers.get('authorization');
  if (authorization) {
    forwarded.authorization = authorization;
  }

  const apiKey = headers.get('x-api-key');
  if (apiKey) {
    forwarded['x-api-key'] = apiKey;
  }

  const cookie = headers.get('cookie');
  if (cookie) {
    forwarded.cookie = cookie;
  }

  return forwarded;
}

export function parseRunStepsJson(stepsJson: string, includeVideo: boolean): OrchestrationStepState[] {
  return parseSteps(stepsJson, includeVideo);
}

export function parseRunOutputRefsJson(outputRefsJson: string): Record<string, unknown> {
  return parseOutputRefs(outputRefsJson);
}

export function parseRunInputJson(inputJson: string): OrchestratePackInput {
  try {
    const parsed = JSON.parse(inputJson);
    if (!parsed || typeof parsed !== 'object') return {} as OrchestratePackInput;

    const obj = parsed as Record<string, unknown>;
    const channels = Array.isArray(obj.channels)
      ? obj.channels.filter((v): v is string => typeof v === 'string')
      : undefined;

    return {
      planId: typeof obj.planId === 'string' ? obj.planId : '',
      goal: typeof obj.goal === 'string' ? obj.goal : undefined,
      tone: typeof obj.tone === 'string' ? obj.tone : undefined,
      channels,
      includeVideo: Boolean(obj.includeVideo),
    };
  } catch {
    return {} as OrchestratePackInput;
  }
}

function inferSequenceType(goal: string | null): EmailSequenceType {
  if (!goal) return 'welcome';
  const g = goal.toLowerCase();
  if (g.includes('launch')) return 'launch';
  if (g.includes('nurture') || g.includes('onboard') || g.includes('retention')) return 'nurture';
  return 'welcome';
}

function buildVideoPrompt(input: NormalizedOrchestratePackInput): string {
  const goal = input.goal || 'introduce the app and key benefits';
  return `Create a cinematic 6-second product teaser for an app. Goal: ${goal}. Tone: ${input.tone}. Show modern UI motion, clear benefit framing, and end on a strong call to action.`;
}

function estimateRemainingMs(steps: OrchestrationStepState[], fromIndex: number): number {
  let total = 0;
  for (let i = fromIndex; i < steps.length; i++) {
    if (steps[i].status === 'done') continue;
    total += STEP_ESTIMATE_MS[steps[i].id] ?? 25_000;
  }
  return total;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function executeStep(
  stepId: OrchestrationStepId,
  input: NormalizedOrchestratePackInput,
  internalBaseUrl?: string,
  internalAuthHeaders?: Record<string, string>
): Promise<unknown> {
  const { planId } = input;

  switch (stepId) {
    case 'brand-voice': {
      const result = await generateBrandVoice(planId);
      saveContent(planId, 'brand-voice', null, JSON.stringify(result));
      updatePlanContent(planId, 'brandVoice', result);
      return { contentType: 'brand-voice' };
    }

    case 'positioning-angles': {
      const result = await generatePositioningAngles(planId);
      saveContent(planId, 'positioning', null, JSON.stringify(result));
      updatePlanContent(planId, 'positioning', result);
      return { contentType: 'positioning' };
    }

    case 'competitive-analysis': {
      const result = await generateCompetitiveAnalysis(planId);
      saveContent(planId, 'competitive-analysis', null, JSON.stringify(result.competitive));
      updatePlanContent(planId, 'competitiveAnalysis', result.competitive);
      return { contentType: 'competitive-analysis', perplexityUsed: result.perplexityUsed };
    }

    case 'generate-draft': {
      const { draft, tone } = await generateDraft({
        planId,
        sections: [
          'app_store_description',
          'short_description',
          'keywords',
          'whats_new',
          'feature_bullets',
          'landing_page_hero',
        ],
        tone: input.tone,
      });

      saveContent(planId, 'draft', tone, JSON.stringify(draft));

      const existingDrafts = (getPlanContent(planId).drafts || {}) as Record<string, unknown>;
      existingDrafts[tone] = draft;
      updatePlanContent(planId, 'drafts', existingDrafts);

      return { contentType: 'draft', contentKey: tone };
    }

    case 'generate-emails': {
      const sequenceType = inferSequenceType(input.goal);
      const emails = await generateEmailsSequence({
        planId,
        sequenceType,
        emailCount: 7,
      });

      saveContent(planId, 'emails', null, JSON.stringify(emails));

      const existingEmails = (getPlanContent(planId).emails || {}) as Record<string, unknown>;
      existingEmails[sequenceType] = emails;
      updatePlanContent(planId, 'emails', existingEmails);

      return { contentType: 'emails', sequenceType };
    }

    case 'atomize-content': {
      const atoms = await atomizeContent({
        planId,
        sourceContent: input.goal || undefined,
        platforms: input.channels.length > 0 ? input.channels : undefined,
      });

      saveContent(planId, 'atoms', null, JSON.stringify(atoms));
      updatePlanContent(planId, 'atoms', atoms);

      const atomCount =
        atoms && typeof atoms === 'object' && Array.isArray((atoms as Record<string, unknown>).atoms)
          ? ((atoms as Record<string, unknown>).atoms as unknown[]).length
          : null;

      return {
        contentType: 'atoms',
        channels: input.channels,
        atomCount,
      };
    }

    case 'generate-translations': {
      const targetLanguages: SupportedLanguage[] = ['es', 'de', 'fr', 'ja', 'pt-BR'];
      const translations = await generateTranslations({
        planId,
        targetLanguages,
        sections: ['app_store_description', 'short_description', 'keywords'],
      });

      for (const [lang, content] of Object.entries(translations)) {
        saveContent(planId, 'translations', lang, JSON.stringify(content));
      }

      const existingTranslations = (getPlanContent(planId).translations || {}) as Record<
        string,
        Record<string, string>
      >;
      for (const lang of Object.keys(translations)) {
        existingTranslations[lang] = {
          ...existingTranslations[lang],
          ...translations[lang],
        };
      }
      updatePlanContent(planId, 'translations', existingTranslations);

      return {
        contentType: 'translations',
        languages: targetLanguages,
      };
    }

    case 'generate-video': {
      if (!internalBaseUrl) {
        throw new Error('Video step requires internal base URL context');
      }

      const endpoint = new URL('/api/generate-video', internalBaseUrl);
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...internalAuthHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          prompt: buildVideoPrompt(input),
          aspectRatio: '16:9',
        }),
      });

      if (!resp.ok) {
        throw new Error(`Video kickoff failed (${resp.status}). Please retry later.`);
      }

      const payload = (await resp.json()) as { operationName?: string };
      const operationName = payload.operationName;
      if (!operationName) {
        throw new Error('Video kickoff returned no operationName');
      }

      const videoRef = {
        operationName,
        statusPath: `/api/generate-video/status?operation=${encodeURIComponent(operationName)}`,
      };

      saveContent(planId, 'video-operation', null, JSON.stringify(videoRef));
      updatePlanContent(planId, 'videoOperation', videoRef);

      return videoRef;
    }
  }
}

export async function executeOrchestrationRun(params: {
  runId: string;
  input: OrchestratePackInput;
  internalBaseUrl?: string | null;
  internalAuthHeaders?: Record<string, string>;
  resumeFromFailed?: boolean;
}): Promise<ExecuteOrchestrationResult> {
  const run = getRun(params.runId);
  if (!run) {
    throw new Error('Run not found');
  }

  const input = normalizeOrchestratePackInput(params.input);
  const steps = parseSteps(run.steps_json, input.includeVideo);
  const outputRefs = parseOutputRefs(run.output_refs_json);

  let startIndex = 0;
  if (params.resumeFromFailed) {
    const failedIndex = steps.findIndex((s) => s.status === 'failed');
    if (failedIndex >= 0) {
      startIndex = failedIndex;
    } else {
      const nextPending = steps.findIndex((s) => s.status !== 'done');
      startIndex = nextPending >= 0 ? nextPending : steps.length;
    }

    for (let i = startIndex; i < steps.length; i++) {
      if (steps[i].status === 'done') continue;
      steps[i] = {
        ...steps[i],
        status: 'pending',
        startedAt: undefined,
        finishedAt: undefined,
        error: undefined,
      };
    }
  }

  const initialCurrentStep = startIndex < steps.length ? steps[startIndex].id : null;

  updateRun(params.runId, {
    status: 'running',
    currentStep: initialCurrentStep,
    stepsJson: JSON.stringify(steps),
    inputJson: JSON.stringify(input),
    outputRefsJson: JSON.stringify(outputRefs),
    lastError: null,
  });

  if (startIndex >= steps.length) {
    updateRun(params.runId, {
      status: 'done',
      currentStep: null,
      stepsJson: JSON.stringify(steps),
      outputRefsJson: JSON.stringify(outputRefs),
      inputJson: JSON.stringify(input),
      lastError: null,
    });

    return {
      runId: params.runId,
      status: 'done',
      currentStep: null,
      lastError: null,
      steps,
      outputRefs,
    };
  }

  const deadlineAt = Date.now() + MAX_ORCHESTRATION_MS;

  for (let i = startIndex; i < steps.length; i++) {
    if (steps[i].status === 'done') {
      continue;
    }

    const remainingMs = deadlineAt - Date.now();
    const estimatedRemainingMs = estimateRemainingMs(steps, i);

    if (remainingMs <= 0 || remainingMs < estimatedRemainingMs) {
      const msg = `Insufficient time left for step "${steps[i].label}". Approx ${Math.ceil(estimatedRemainingMs / 1000)}s needed, ${Math.max(0, Math.ceil(remainingMs / 1000))}s left. Retry this run from the failed step or run a smaller pack (fewer channels/disable video).`;

      steps[i] = {
        ...steps[i],
        status: 'failed',
        finishedAt: nowIso(),
        error: msg,
      };

      updateRun(params.runId, {
        status: 'failed',
        currentStep: steps[i].id,
        stepsJson: JSON.stringify(steps),
        outputRefsJson: JSON.stringify(outputRefs),
        inputJson: JSON.stringify(input),
        lastError: msg,
      });

      return {
        runId: params.runId,
        status: 'failed',
        currentStep: steps[i].id,
        lastError: msg,
        steps,
        outputRefs,
      };
    }

    steps[i] = {
      ...steps[i],
      status: 'running',
      startedAt: nowIso(),
      error: undefined,
    };

    updateRun(params.runId, {
      status: 'running',
      currentStep: steps[i].id,
      stepsJson: JSON.stringify(steps),
      outputRefsJson: JSON.stringify(outputRefs),
      inputJson: JSON.stringify(input),
      lastError: null,
    });

    try {
      const outputRef = await executeStep(
        steps[i].id,
        input,
        params.internalBaseUrl ?? undefined,
        params.internalAuthHeaders
      );
      outputRefs[steps[i].id] = outputRef;

      steps[i] = {
        ...steps[i],
        status: 'done',
        finishedAt: nowIso(),
        error: undefined,
      };

      const nextStepId = i + 1 < steps.length ? steps[i + 1].id : null;

      updateRun(params.runId, {
        status: 'running',
        currentStep: nextStepId,
        stepsJson: JSON.stringify(steps),
        outputRefsJson: JSON.stringify(outputRefs),
        inputJson: JSON.stringify(input),
        lastError: null,
      });
    } catch (error) {
      const msg = toErrorMessage(error);

      steps[i] = {
        ...steps[i],
        status: 'failed',
        finishedAt: nowIso(),
        error: msg,
      };

      updateRun(params.runId, {
        status: 'failed',
        currentStep: steps[i].id,
        stepsJson: JSON.stringify(steps),
        outputRefsJson: JSON.stringify(outputRefs),
        inputJson: JSON.stringify(input),
        lastError: msg,
      });

      return {
        runId: params.runId,
        status: 'failed',
        currentStep: steps[i].id,
        lastError: msg,
        steps,
        outputRefs,
      };
    }
  }

  updateRun(params.runId, {
    status: 'done',
    currentStep: null,
    stepsJson: JSON.stringify(steps),
    outputRefsJson: JSON.stringify(outputRefs),
    inputJson: JSON.stringify(input),
    lastError: null,
  });

  return {
    runId: params.runId,
    status: 'done',
    currentStep: null,
    lastError: null,
    steps,
    outputRefs,
  };
}

```

# lib/pipeline.ts

```ts
/**
 * Pipeline helper functions — extracted from API routes for reuse by generate-all.
 * Each function takes a planId (and optional params), calls Gemini, returns parsed data.
 */

import { getPlan } from '@/lib/db';

// ─── Shared ──────────────────────────────────────────

function parseGeminiJson(text: string): unknown {
  let cleaned = text
    .replace(/^\`\`\`(?:json)?\s*\n?/i, '')
    .replace(/\n?\`\`\`\s*$/i, '')
    .trim();
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    cleaned = '{' + cleaned + '}';
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Model returned invalid JSON');
    return JSON.parse(jsonMatch[0]);
  }
}

function getApiKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error('GEMINI_API_KEY is not set');
  return k;
}

function geminiUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
}

function buildAppContext(config: Record<string, unknown>) {
  return {
    app_name: config?.app_name,
    one_liner: config?.one_liner,
    category: config?.category,
    target_audience: config?.target_audience,
    pricing: config?.pricing,
    differentiators: config?.differentiators,
    competitors: config?.competitors,
    distribution_channels: config?.distribution_channels,
    app_url: config?.app_url,
    app_type: config?.app_type,
  };
}

function loadPlan(planId: string) {
  const row = getPlan(planId);
  if (!row) throw new Error('Plan not found');
  const config = JSON.parse(row.config || '{}');
  const scraped = JSON.parse(row.scraped || '{}');
  const stages = JSON.parse(row.stages || '{}');
  return { row, config, scraped, stages, appContext: buildAppContext(config) };
}

async function callGemini(params: {
  apiKey: string;
  systemPrompt: string;
  userContent: string;
  temperature: number;
  maxOutputTokens?: number;
}): Promise<{ parsed: unknown; tokens: number | null }> {
  const res = await fetch(geminiUrl(params.apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ parts: [{ text: params.userContent }] }],
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxOutputTokens ?? 8192,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Unexpected Gemini response shape');
  }

  const parsed = parseGeminiJson(text);

  const usage = data?.usageMetadata;
  const tokens =
    typeof usage?.totalTokenCount === 'number'
      ? usage.totalTokenCount
      : typeof usage?.promptTokenCount === 'number' &&
          typeof usage?.candidatesTokenCount === 'number'
        ? usage.promptTokenCount + usage.candidatesTokenCount
        : null;

  return { parsed, tokens };
}

function userContentFor(p: ReturnType<typeof loadPlan>) {
  return `APP CONTEXT:\n${JSON.stringify(p.appContext)}\n\nSCRAPED INFO:\n${JSON.stringify(p.scraped)}\n\nPLAN STAGES:\n${JSON.stringify(p.stages)}\n\nFULL PLAN:\n${p.row.generated}`;
}

// ─── Brand Voice ──────────────────────────────────────

export async function generateBrandVoice(planId: string): Promise<unknown> {
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  const systemPrompt = `You are a brand strategist and copy chief trained in David Ogilvy's research-first methods.

Your job: extract the TRUE voice of this specific product from evidence in the input — the scraped app description, feature lists, existing marketing copy, and the marketing plan. Do NOT invent or project; distil what is already there.

Output MUST be valid JSON matching this exact shape:
{
  "voiceSummary": "2-3 sentences describing this product's unique voice",
  "personalityTraits": [
    { "trait": "trait name", "description": "what it means for THIS product", "example": "an example sentence in this voice" }
  ],
  "vocabularyGuide": {
    "wordsToUse": ["word1", "word2"],
    "wordsToAvoid": ["word1", "word2"],
    "phrasesToUse": ["phrase1"],
    "phrasesToAvoid": ["phrase1"]
  },
  "toneSpectrum": { "formal": 0, "playful": 0, "technical": 0, "emotional": 0 }
}

Constraints:
- voiceSummary: 2-3 sentences, specific to THIS product.
- personalityTraits: 5-8 traits.
- vocabularyGuide: 8-15 items per list where evidence supports it.
- toneSpectrum: integers 0-10.
- Do NOT output generic traits without concrete product-specific meaning.
- Do NOT fabricate product facts not present in the inputs.`;

  const { parsed } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: userContentFor(p),
    temperature: 0.5,
  });

  return parsed;
}

// ─── Positioning Angles ───────────────────────────────

export async function generatePositioningAngles(planId: string): Promise<unknown> {
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  const systemPrompt = `You are a direct-response positioning strategist.

Generate 3-5 positioning angles for THIS product.

Output MUST be valid JSON matching this exact shape:
{
  "angles": [
    {
      "name": "The [X] Angle",
      "hook": "one-liner hook",
      "psychology": "why this works",
      "headlineDirections": ["headline 1", "headline 2", "headline 3"],
      "bestFor": "where to use"
    }
  ],
  "antiPositioning": {
    "whatWeAreNot": ["not X", "not Y"],
    "whyItMatters": "explanation"
  },
  "recommendedPrimary": "angle name"
}

Constraints:
- 3-5 angles, each meaningfully different.
- 3 headlineDirections per angle.
- recommendedPrimary must exactly match one angle name.
- Avoid unverifiable claims.`;

  const { parsed } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: userContentFor(p),
    temperature: 0.7,
  });

  return parsed;
}

// ─── Competitive Analysis ─────────────────────────────

export async function generateCompetitiveAnalysis(
  planId: string
): Promise<{ competitive: unknown; perplexityUsed: boolean }> {
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  // Perplexity best-effort
  let competitorResearch = '';
  let perplexityUsed = false;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (perplexityKey) {
    try {
      const desc =
        (typeof p.scraped.description === 'string' ? p.scraped.description : '') ||
        (typeof p.scraped.appDescription === 'string' ? p.scraped.appDescription : '') ||
        (p.row.generated ? p.row.generated.slice(0, 800) : '');
      const resp = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${perplexityKey}` },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'system', content: 'You are a meticulous market researcher.' },
            {
              role: 'user',
              content: `Find 5-8 direct competitors for: ${p.config.app_name || 'Unknown'} (${p.config.category || 'Unknown'}). URL: ${p.config.app_url || 'N/A'}. Desc: ${desc.slice(0, 500)}. Return JSON: [{name,url,positioning,pricing}]`,
            },
          ],
          temperature: 0.2,
        }),
      });
      if (resp.ok) {
        const d = await resp.json();
        const c = d?.choices?.[0]?.message?.content;
        if (typeof c === 'string') {
          competitorResearch = c;
          perplexityUsed = true;
        }
      }
    } catch (e) {
      console.warn('Perplexity failed, Gemini-only:', e);
    }
  }

  const systemPrompt = `You are a sharp competitive intelligence analyst.

Build a competitive analysis for the given product.

Output MUST be valid JSON matching:
{
  "competitors": [
    { "name": "...", "url": "...", "positioning": "...", "pricing": "...",
      "strengths": ["..."], "weaknesses": ["..."], "keyMessaging": ["..."] }
  ],
  "gaps": ["..."], "opportunities": ["..."], "keywordGaps": ["..."]
}

4-8 competitors. 3-6 items per strengths/weaknesses/keyMessaging. 4-10 gaps/opportunities/keywordGaps.`;

  const uc = `${userContentFor(p)}\n\nCOMPETITOR RESEARCH (Perplexity):\n${competitorResearch || '(none)'}`;

  const { parsed } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: uc,
    temperature: 0.6,
  });

  return { competitive: parsed, perplexityUsed };
}

// ─── Generate Draft ───────────────────────────────────

type DraftSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets'
  | 'landing_page_hero';

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

function sectionLabel(section: DraftSection): string {
  const labels: Record<DraftSection, string> = {
    app_store_description: 'App Store description',
    short_description: 'Short description',
    keywords: 'Keywords',
    whats_new: "What's New",
    feature_bullets: 'Feature bullets',
    landing_page_hero: 'Landing page hero copy',
  };
  return labels[section];
}

export async function generateDraft(params: {
  planId: string;
  sections: DraftSection[];
  tone: Tone;
}): Promise<{ draft: Record<string, string>; tokens: number | null; tone: Tone }> {
  const { planId, sections, tone } = params;
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  const systemPrompt = `You are an expert app store copywriter.

Write a complete first-draft of app listing / landing page copy.
Tone: ${tone}.

Output MUST be valid JSON only. The JSON must be an object where each key is one of the requested sections, and the value is a string.

Sections requested:
${sections.map((s) => `- ${s}: ${sectionLabel(s)}`).join('\n')}

Writing requirements by section:
- app_store_description: 800-2000 characters. Short paragraphs, benefits-first, light CTA.
- short_description: 60-80 characters (store-friendly). No quotes.
- keywords: comma-separated keywords (15-30), no hashtags.
- whats_new: 2-4 short bullet lines (plausible).
- feature_bullets: 5-8 bullets, each max ~12 words.
- landing_page_hero: 1 headline + 1 subheadline + 1 primary CTA label, separated by newlines.

Avoid unverifiable claims.`;

  const { parsed, tokens } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: userContentFor(p),
    temperature: 0.7,
    maxOutputTokens: 4096,
  });

  const draft: Record<string, string> = {};
  if (parsed && typeof parsed === 'object') {
    for (const s of sections) {
      const val = (parsed as Record<string, unknown>)[s];
      if (typeof val === 'string') draft[s] = val.trim();
    }
  }

  if (Object.keys(draft).length === 0) {
    throw new Error('Model did not return the requested sections.');
  }

  return { draft, tokens, tone };
}

// ─── Generate Emails ──────────────────────────────────

type SequenceType = 'welcome' | 'launch' | 'nurture';

export async function generateEmailsSequence(params: {
  planId: string;
  sequenceType?: SequenceType;
  emailCount?: number;
}): Promise<unknown> {
  const p = loadPlan(params.planId);
  const apiKey = getApiKey();
  const sequenceType = params.sequenceType || 'welcome';
  const emailCount = Math.max(1, Math.min(20, params.emailCount || 7));

  const systemPrompt = `You are a direct-response email marketer.

Write a ${sequenceType} email sequence (${emailCount} emails).

Rules:
- Output MUST be valid JSON only.
- Benefit-led, specific, grounded. No hype. Each email body in Markdown.
- Include CTA: { text, action }. Include sendDelay.

Return JSON shape:
{
  "sequence": {
    "type": "${sequenceType}",
    "description": "...",
    "emails": [
      { "number": 1, "purpose": "...", "subjectLine": "...", "previewText": "...",
        "body": "...", "cta": { "text": "...", "action": "..." }, "sendDelay": "..." }
    ]
  }
}`;

  const uc = `${userContentFor(p)}\n\nREQUEST: sequenceType=${sequenceType}, emailCount=${emailCount}`;

  const { parsed, tokens } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: uc,
    temperature: 0.7,
  });

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    obj.metadata = { model: 'gemini-2.5-flash', tokens, sequenceType };
  }

  // Validate
  let emails: unknown = null;
  if (parsed && typeof parsed === 'object') {
    const seq = (parsed as Record<string, unknown>).sequence;
    if (seq && typeof seq === 'object') {
      emails = (seq as Record<string, unknown>).emails;
    }
  }
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error('Model did not return an email sequence.');
  }

  return parsed;
}

// ─── Atomize Content ──────────────────────────────────

export async function atomizeContent(params: {
  planId: string;
  sourceContent?: string;
  platforms?: string[];
}): Promise<unknown> {
  const p = loadPlan(params.planId);
  const apiKey = getApiKey();
  const platforms = params.platforms?.length ? params.platforms : ['linkedin', 'twitter', 'instagram', 'reddit', 'email'];
  const sourceContent = params.sourceContent?.trim() || '';

  const systemPrompt = `You are a content strategist and social copywriter.

Atomize ONE core piece of content into platform-native pieces.

Rules:
- Output MUST be valid JSON only.
- Generate 12-15+ content atoms across the requested platforms.
- If sourceContent is empty, create a corePiece first.

Return JSON shape:
{
  "corePiece": { "title": "...", "content": "..." },
  "atoms": [
    { "platform": "...", "format": "...", "content": "...",
      "hashtags": ["#tag"], "subreddits": ["/r/..."],
      "characterCount": 123, "notes": "..." }
  ]
}`;

  const uc = `${userContentFor(p)}\n\nplatforms=${JSON.stringify(platforms)}\nSOURCE CONTENT:\n${sourceContent || '(none)'}`;

  const { parsed, tokens } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: uc,
    temperature: 0.7,
  });

  // Fix up character counts + metadata
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const atoms = Array.isArray(obj.atoms) ? obj.atoms : [];
    for (const atom of atoms) {
      if (atom && typeof atom === 'object') {
        const a = atom as Record<string, unknown>;
        const c = typeof a.content === 'string' ? a.content : '';
        a.characterCount = c.length;
      }
    }
    obj.metadata = { model: 'gemini-2.5-flash', tokens, atomCount: atoms.length };
  }

  return parsed;
}

// ─── Generate Translations ────────────────────────────

type TranslationSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets';

export const SUPPORTED_LANGUAGES = [
  'es', 'fr', 'de', 'ja', 'ko', 'pt-BR', 'it', 'zh-Hans', 'nl', 'ar',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function languageLabel(code: string): string {
  const labels: Record<string, string> = {
    es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese',
    ko: 'Korean', 'pt-BR': 'Portuguese (Brazil)', it: 'Italian',
    'zh-Hans': 'Chinese (Simplified)', nl: 'Dutch', ar: 'Arabic',
  };
  return labels[code] || code;
}

export async function generateTranslations(params: {
  planId: string;
  targetLanguages: SupportedLanguage[];
  sections: TranslationSection[];
}): Promise<Record<string, Record<string, string>>> {
  const { planId, targetLanguages, sections } = params;
  const p = loadPlan(planId);
  const apiKey = getApiKey();

  const systemPrompt = `You are an expert app store localisation copywriter.

Produce LOCALISED app store copy (not literal translation) for the requested languages.

Output MUST be valid JSON only.
The JSON MUST be an object with a top-level key "translations".
translations[language_code][section] = string.

Languages: ${targetLanguages.map((l) => `${l} (${languageLabel(l)})`).join(', ')}
Sections: ${sections.join(', ')}

Avoid unverifiable claims. Keep brand/product names in original form.`;

  const { parsed } = await callGemini({
    apiKey,
    systemPrompt,
    userContent: userContentFor(p),
    temperature: 0.6,
  });

  const translations: Record<string, Record<string, string>> = {};
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  const t = obj?.translations;

  if (t && typeof t === 'object') {
    for (const lang of targetLanguages) {
      const langObj = (t as Record<string, unknown>)[lang];
      if (!langObj || typeof langObj !== 'object') continue;
      for (const section of sections) {
        const val = (langObj as Record<string, unknown>)[section];
        if (typeof val === 'string' && val.trim().length > 0) {
          translations[lang] ||= {};
          translations[lang][section] = val.trim();
        }
      }
    }
  }

  if (Object.keys(translations).length === 0) {
    throw new Error('Model did not return requested translations.');
  }

  return translations;
}

```

# lib/plan-content.ts

```ts
// Centralised types/constants for plan_content records.

export type PlanContentType =
  | 'draft'
  | 'translations'
  | 'emails'
  | 'brand-voice'
  | 'positioning'
  | 'competitive-analysis'
  | 'atoms'
  | 'competitive-intel';

```

# lib/plan-generator.ts

```ts
import { AppConfig, MarketingPlan, ScrapedApp } from './types';

// ─── App Type Profiles ───

const APP_TYPE_PROFILES: Record<string, {
  label: string;
  voice: string;
  distribution_strengths: string[];
  privacy_angle: string;
  speed_angle: string;
  trust_signals: string[];
  cta_style: string;
  seo_relevant: boolean;
  appstore_relevant: boolean;
}> = {
  web: {
    label: 'Web Tool / Web App',
    voice: 'Practical, direct. "Here\'s a tool. It does X. Try it." No fluff.',
    distribution_strengths: ['reddit', 'hackernews', 'producthunt', 'twitter'],
    privacy_angle: 'Runs in your browser — no server, no account, no data collection.',
    speed_angle: 'Open the link, use it immediately. No install, no signup.',
    trust_signals: ['Open source (if applicable)', 'Client-side processing', 'No tracking/analytics'],
    cta_style: 'Direct link — "Try it: [URL]"',
    seo_relevant: true,
    appstore_relevant: false,
  },
  mobile: {
    label: 'Mobile App',
    voice: 'Friendly, benefit-focused. Show the experience, not the tech stack.',
    distribution_strengths: ['appstore', 'producthunt', 'twitter', 'instagram', 'tiktok'],
    privacy_angle: 'Your data stays on your device. No cloud sync unless you opt in.',
    speed_angle: 'Download → open → using it in under a minute.',
    trust_signals: ['App Store reviews', 'Privacy nutrition label', 'No unnecessary permissions'],
    cta_style: 'App Store link with badge',
    seo_relevant: false,
    appstore_relevant: true,
  },
  saas: {
    label: 'SaaS Platform',
    voice: 'Professional but human. Show outcomes, not features. Avoid enterprise-speak.',
    distribution_strengths: ['linkedin', 'twitter', 'producthunt', 'hackernews'],
    privacy_angle: 'SOC 2 compliant / GDPR-ready / data encrypted at rest and in transit.',
    speed_angle: 'Free tier gets you started in minutes. No credit card required.',
    trust_signals: ['Customer count/logos', 'Uptime SLA', 'Security certifications'],
    cta_style: '"Start free" or "Try the free tier"',
    seo_relevant: true,
    appstore_relevant: false,
  },
  desktop: {
    label: 'Desktop Application',
    voice: 'Power-user friendly. Emphasise performance, native feel, offline capability.',
    distribution_strengths: ['hackernews', 'reddit', 'producthunt'],
    privacy_angle: 'Runs entirely on your machine. No cloud, no telemetry.',
    speed_angle: 'Install once, runs natively. No browser overhead.',
    trust_signals: ['Open source', 'Code-signed binaries', 'No auto-update phoning home'],
    cta_style: 'Download link with OS badges',
    seo_relevant: true,
    appstore_relevant: false,
  },
  cli: {
    label: 'CLI Tool',
    voice: 'Technical, terse, respectful of the reader\'s time. Show commands, not paragraphs.',
    distribution_strengths: ['hackernews', 'reddit', 'twitter'],
    privacy_angle: 'Runs locally. Reads nothing it shouldn\'t. Check the source.',
    speed_angle: '`brew install X` or `npx X` — using it in 30 seconds.',
    trust_signals: ['Open source', 'Minimal dependencies', 'Unix philosophy'],
    cta_style: 'Installation one-liner: `npm install -g X`',
    seo_relevant: false,
    appstore_relevant: false,
  },
  api: {
    label: 'API / Developer Tool',
    voice: 'Developer-to-developer. Show code examples. Respect their time.',
    distribution_strengths: ['hackernews', 'reddit', 'twitter', 'producthunt'],
    privacy_angle: 'Your data is yours. We process and forget. Read our DPA.',
    speed_angle: 'First API call in under 5 minutes. Generous free tier.',
    trust_signals: ['Uptime', 'Latency numbers', 'Transparent pricing', 'Open API spec'],
    cta_style: 'Docs link + "Get your API key"',
    seo_relevant: true,
    appstore_relevant: false,
  },
  'browser-extension': {
    label: 'Browser Extension',
    voice: 'Casual, show-don\'t-tell. Screenshots/GIFs are everything.',
    distribution_strengths: ['reddit', 'producthunt', 'twitter'],
    privacy_angle: 'Minimal permissions. We only access what we need. Read the manifest.',
    speed_angle: 'Install from Chrome Web Store → works immediately on the next page you visit.',
    trust_signals: ['Minimal permissions', 'Open source', 'Chrome Web Store reviews'],
    cta_style: 'Chrome Web Store link with badge',
    seo_relevant: false,
    appstore_relevant: false,
  },
};

function getProfile(appType: string) {
  const key = (appType || 'web').toLowerCase().replace(/\s+/g, '-');
  return APP_TYPE_PROFILES[key] || APP_TYPE_PROFILES.web;
}

// ─── Subreddit Mapping ───

const SUBREDDIT_MAP: Record<string, string[]> = {
  '3d printing': ['r/3Dprinting', 'r/functionalprint', 'r/prusa3d', 'r/ender3'],
  'gridfinity': ['r/gridfinity', 'r/3Dprinting', 'r/functionalprint'],
  'productivity': ['r/productivity', 'r/getdisciplined', 'r/selfimprovement'],
  'developer tool': ['r/programming', 'r/webdev', 'r/javascript', 'r/devtools'],
  'design': ['r/web_design', 'r/graphic_design', 'r/UI_Design'],
  'finance': ['r/personalfinance', 'r/FinancialPlanning'],
  'music': ['r/WeAreTheMusicMakers', 'r/musicproduction', 'r/audiophile'],
  'gaming': ['r/indiegaming', 'r/gamedev', 'r/gaming'],
  'ai': ['r/artificial', 'r/MachineLearning', 'r/LocalLLaMA'],
  'privacy': ['r/privacy', 'r/selfhosted', 'r/degoogle'],
  'photo': ['r/photography', 'r/photocritique', 'r/postprocessing'],
  'video': ['r/VideoEditing', 'r/videography', 'r/Filmmakers'],
  'education': ['r/learnprogramming', 'r/education'],
  'health': ['r/QuantifiedSelf', 'r/fitness', 'r/running'],
  'marketing': ['r/marketing', 'r/digital_marketing', 'r/SEO'],
  'startup': ['r/startups', 'r/SideProject', 'r/Entrepreneur'],
  'mobile': ['r/androidapps', 'r/iOSProgramming', 'r/AppBusiness'],
  'automation': ['r/automation', 'r/homeautomation'],
  'sleep': ['r/sleep', 'r/insomnia', 'r/DSPD'],
  'wellness': ['r/selfimprovement', 'r/Meditation', 'r/yoga'],
  'sound': ['r/WeAreTheMusicMakers', 'r/audiophile', 'r/ambientmusic'],
  'focus': ['r/productivity', 'r/ADHD', 'r/GetStudying'],
};

function findSubreddits(category: string, appName: string): string[] {
  const combined = `${category} ${appName}`.toLowerCase();
  const matched = new Set<string>();

  for (const [keyword, subs] of Object.entries(SUBREDDIT_MAP)) {
    if (combined.includes(keyword)) {
      subs.forEach(s => matched.add(s));
    }
  }

  matched.add('r/SideProject');

  if (matched.size <= 1) {
    const words = combined.split(/[\s/,]+/);
    for (const word of words) {
      for (const [keyword, subs] of Object.entries(SUBREDDIT_MAP)) {
        if (keyword.includes(word) || word.includes(keyword.split(' ')[0])) {
          subs.forEach(s => matched.add(s));
        }
      }
    }
  }

  return Array.from(matched);
}

// ─── Keyword Generation ───

function generateKeywords(config: AppConfig) {
  const name = config.app_name.toLowerCase();
  const category = config.category.toLowerCase();

  const primary = [name];
  const secondary: string[] = [];
  const longTail: string[] = [];

  secondary.push(`${category} online`, `free ${category}`, `best ${category}`);

  const oneLiner = config.one_liner.toLowerCase();
  const actionVerbs = ['add', 'create', 'generate', 'convert', 'build', 'make', 'edit', 'mix', 'manage', 'track', 'plan', 'design', 'analyse', 'analyze', 'record', 'share', 'organize', 'automate', 'monitor', 'compare'];
  for (const verb of actionVerbs) {
    if (oneLiner.includes(verb)) {
      const match = oneLiner.match(new RegExp(`${verb}\\s+([\\w\\s-]+?)(?:\\s+(?:in|to|for|with|from|on|—|\\.|,|$))`, 'i'));
      if (match) {
        secondary.push(`${verb} ${match[1].trim()}`);
        longTail.push(`how to ${verb} ${match[1].trim()}`);
      }
    }
  }

  if (config.app_type === 'web') {
    secondary.push(`${name} online`, `${category} browser`);
    longTail.push(`${category} no install`, `${category} no download`);
  } else if (config.app_type === 'mobile') {
    secondary.push(`${name} app`, `${category} app`);
    longTail.push(`best ${category} app`, `${category} app free`);
  }

  for (const comp of config.competitors) {
    const compName = comp.split(/[([]/)[0].trim();
    if (compName.length < 40) {
      longTail.push(`${compName} alternative`);
    }
  }

  if (config.pricing.toLowerCase().includes('free')) {
    secondary.push(`${category} free`, `free ${name}`);
  }

  const dedup = (arr: string[]) => [...new Set(arr)];
  return { primary: dedup(primary), secondary: dedup(secondary), longTail: dedup(longTail) };
}

// ─── Conjugation ───

function conjugateForThirdPerson(phrase: string): string {
  const words = phrase.split(/\s+/);
  if (words.length === 0) return phrase;
  const verb = words[0].toLowerCase();
  
  // Don't conjugate adverbs/negatives — find the actual verb
  const skipWords = ['never', 'always', 'easily', 'quickly', 'automatically', 'instantly', 'simply', 'just'];
  if (skipWords.includes(verb)) {
    // Conjugate the second word instead
    if (words.length < 2) return phrase;
    const actualVerb = words[1].toLowerCase();
    const irregulars: Record<string, string> = { 'do': 'does', 'go': 'goes', 'have': 'has' };
    if (irregulars[actualVerb]) { words[1] = irregulars[actualVerb]; return words.join(' '); }
    if (actualVerb.endsWith('s') && !actualVerb.endsWith('ss')) return phrase;
    if (actualVerb.endsWith('y') && !/[aeiou]y$/i.test(actualVerb)) { words[1] = actualVerb.slice(0, -1) + 'ies'; }
    else if (actualVerb.endsWith('sh') || actualVerb.endsWith('ch') || actualVerb.endsWith('x') || actualVerb.endsWith('z') || actualVerb.endsWith('ss') || actualVerb.endsWith('o')) { words[1] = actualVerb + 'es'; }
    else { words[1] = actualVerb + 's'; }
    return words.join(' ');
  }
  
  const irregulars: Record<string, string> = { 'do': 'does', 'go': 'goes', 'have': 'has' };
  if (irregulars[verb]) { words[0] = irregulars[verb]; return words.join(' '); }
  if (verb.endsWith('s') && !verb.endsWith('ss')) return phrase;
  if (verb.endsWith('y') && !/[aeiou]y$/i.test(verb)) { words[0] = verb.slice(0, -1) + 'ies'; }
  else if (verb.endsWith('sh') || verb.endsWith('ch') || verb.endsWith('x') || verb.endsWith('z') || verb.endsWith('ss') || verb.endsWith('o')) { words[0] = verb + 'es'; }
  else { words[0] = verb + 's'; }
  return words.join(' ');
}

// ─── Channel Guides ───

const CHANNEL_GUIDES: Record<string, { name: string; bestTime: string; tone: string; format: string; tips: string[] }> = {
  reddit: { name: 'Reddit', bestTime: 'Weekday mornings 8-11am EST', tone: 'Authentic, maker/community. No marketing-speak.', format: 'Text post: problem→solution→link→ask.', tips: ['Lead with the problem', 'Include technical details', 'Ask a genuine question', 'Reply to every comment', 'Space posts 2-3 days apart'] },
  hackernews: { name: 'Hacker News', bestTime: 'Weekday 8-11am EST', tone: 'Technical, concise. Architecture over features.', format: '"Show HN: [Name] – [One-liner]"', tips: ['2-3 paragraph body max', 'Link source code if open source', 'Reply thoughtfully, not defensively', 'No superlatives or marketing language'] },
  producthunt: { name: 'Product Hunt', bestTime: 'Tue-Thu, 12:01am PT', tone: 'Enthusiastic but genuine.', format: 'Tagline (60 chars) + description (260 chars) + 5 images.', tips: ['5+ gallery images', 'Line up supporters for first hour', 'Maker comment tells the story', 'Respond to every comment'] },
  twitter: { name: 'Twitter / X', bestTime: 'Weekdays 8am-12pm', tone: 'Punchy, visual. Thread format.', format: 'Hook → 3-5 expanding tweets → CTA.', tips: ['Hook in first tweet', 'Use GIFs/screenshots', 'Thread format for launches', 'Follow up with behind-the-scenes'] },
  linkedin: { name: 'LinkedIn', bestTime: 'Tue-Thu, 7-9am', tone: 'Professional but personal. Learnings angle.', format: 'Hook → story → 3 learnings → link → hashtags.', tips: ['Lead with personal insight', '"What I learned building X"', 'Line breaks generously', '3-5 relevant hashtags'] },
  appstore: { name: 'App Store / Google Play', bestTime: 'Always live', tone: 'Benefit-focused, scannable.', format: 'Short desc (80 chars) + full desc (4000 chars) + screenshots.', tips: ['First line must sell', 'Keywords in title for ASO', 'Screenshots tell a story', 'Localise for top markets'] },
};

// ─── Brief Generation ───

// ─── Goal & Tone Guides ───

const GOAL_GUIDES: Record<string, { label: string; emphasis: string[] }> = {
  'ASO optimization': {
    label: '📱 ASO Optimization',
    emphasis: [
      'Optimise app title: primary keyword in first 30 characters',
      'Use the keyword field (iOS) for terms NOT already in title/subtitle',
      'Subtitle (30 chars): secondary keyword + benefit, e.g. "Habit tracker & planner"',
      'First 3 screenshots must convert — show the core experience, not the settings',
      'A/B test icon & screenshots with App Store Product Page Optimisation (iOS 15+)',
      'Localise metadata for US → UK → AU → CA as first wave',
      'Monitor keyword ranking weekly with AppFollow, Sensor Tower, or AppFigures',
      'Respond to all reviews within 24h — it lifts conversion rate',
    ],
  },
  'Launch campaign': {
    label: '🚀 Launch Campaign',
    emphasis: [
      'Pre-launch: build a waitlist (even 50 people creates day-one momentum)',
      'Coordinate posts across all channels within a 48-hour launch window',
      'Submit to Product Hunt on Tuesday or Wednesday for peak visibility',
      'Line up Show HN post with a technical write-up the same week',
      'Identify 3-5 power users who will post day-one social proof',
      'Prepare a launch thread for Twitter/X with screenshots + GIFs ready',
      'Have a "Day 2 follow-up" post ready — "Launched yesterday, here\'s what we learned"',
    ],
  },
  'Ongoing content': {
    label: '📅 Ongoing Content',
    emphasis: [
      'Post cadence: 2-3× per week minimum — consistency beats volume',
      'Batch-create content in 2-hour weekly sessions to avoid daily friction',
      'Content mix: 40% educational, 30% behind-the-scenes, 30% promotional',
      'Repurpose: one Reddit post → LinkedIn → Twitter thread → newsletter section',
      'Monthly retro: what got the most engagement? Double down on that format',
      'Build a swipe file of every comment/question from users — that\'s your content calendar',
    ],
  },
  'Competitive analysis': {
    label: '🔍 Competitive Analysis',
    emphasis: [
      'Track competitor App Store rankings weekly with a free tool (AppFollow, Sensor Tower)',
      'Monitor their reviews — negative reviews are your feature roadmap',
      'Subscribe to their newsletter and follow their changelog',
      'Check their keyword rankings: what are they ranking for that you\'re not?',
      'Use their negative reviews as your positioning ammunition ("Unlike X, we never…")',
      'Watch their Product Hunt/Show HN posts for community feedback signals',
    ],
  },
  'Full marketing pack': {
    label: '📦 Full Marketing Pack',
    emphasis: [
      'Generate all 5 stages in full — research through distribution',
      'Use the Copy Templates stage for ready-to-post content',
      'Export the full brief as Markdown for team sharing',
      'Use the Distribution Plan as your execution checklist',
    ],
  },
};

const TONE_GUIDES: Record<string, string> = {
  professional: 'Write with authority. Clear, credible, confident. Avoid jargon but project expertise. Favour active voice and specific claims over vague assertions.',
  casual: 'Write like a human talking to another human. Friendly, warm, a little informal. Contractions are fine. Avoid corporate-speak entirely.',
  bold: 'Be direct. Short sentences. High-energy. Make every word earn its place. Lead with the strongest claim. Cut anything that softens the message.',
  minimal: 'Say more with less. Remove every word that doesn\'t earn its place. If something can be cut, cut it. One idea per sentence.',
};

export function generateMarketingPlan(config: AppConfig, scraped: ScrapedApp, goals?: string[], tone?: string): MarketingPlan {
  const profile = getProfile(config.app_type);
  const keywords = generateKeywords(config);
  const subreddits = findSubreddits(config.category, config.app_name);
  const channels = config.distribution_channels.map(c => c.toLowerCase());
  const today = new Date().toISOString().split('T')[0];
  const isFree = config.pricing.toLowerCase().includes('free');
  const id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // --- STAGE 1: RESEARCH ---
  const researchLines: string[] = [];
  researchLines.push('## Stage 1: Research');
  researchLines.push('');

  // Goals summary in research stage
  if (goals && goals.length > 0) {
    researchLines.push('### Selected Goals');
    researchLines.push('');
    for (const goal of goals) {
      researchLines.push(`- **${goal}**`);
    }
    researchLines.push('');
    if (tone) {
      researchLines.push(`**Tone:** ${tone.charAt(0).toUpperCase() + tone.slice(1)}`);
      researchLines.push('');
    }
  }

  researchLines.push('### Market Landscape');
  researchLines.push('');
  researchLines.push(`**App:** ${config.app_name}`);
  researchLines.push(`**Category:** ${config.category}`);
  researchLines.push(`**Type:** ${profile.label}`);
  researchLines.push(`**Pricing:** ${config.pricing}`);
  if (scraped.rating) researchLines.push(`**Rating:** ${scraped.rating}★ (${scraped.ratingCount?.toLocaleString() || 'N/A'} reviews)`);
  if (scraped.developer) researchLines.push(`**Developer:** ${scraped.developer}`);
  researchLines.push('');
  researchLines.push('### Key Features Identified');
  researchLines.push('');
  for (const f of config.differentiators.slice(0, 8)) {
    researchLines.push(`- ${f}`);
  }
  researchLines.push('');
  researchLines.push('### Competitor Research Prompts');
  researchLines.push('');
  researchLines.push(`- Search: "${config.category}" — who are the existing players?`);
  researchLines.push(`- Search: "${config.app_name}" — does anyone else use this name?`);
  for (const comp of config.competitors) {
    researchLines.push(`- Research: "${comp}" — features, pricing, limitations`);
  }
  researchLines.push(`- Search: "${config.target_audience} tools" — what else do they use?`);
  researchLines.push('');
  researchLines.push('### Customer Language Sources');
  researchLines.push('');
  for (const sub of subreddits.slice(0, 5)) {
    researchLines.push(`- ${sub} — search for "${config.category}"`);
  }
  researchLines.push(`- Twitter/X — search: "${config.category}" OR "${config.app_name.toLowerCase()}"`);

  // --- STAGE 2: FOUNDATION ---
  const foundationLines: string[] = [];
  foundationLines.push('## Stage 2: Foundation');
  foundationLines.push('');

  // ─── Tone of Voice (wizard selection) ───
  if (tone && TONE_GUIDES[tone]) {
    foundationLines.push('### Tone of Voice');
    foundationLines.push('');
    foundationLines.push(`**Selected:** ${tone.charAt(0).toUpperCase() + tone.slice(1)}`);
    foundationLines.push('');
    foundationLines.push(TONE_GUIDES[tone]);
    foundationLines.push('');
  }

  // ─── Goal-specific guidance ───
  const activeGoals = (goals || []).filter((g) => GOAL_GUIDES[g]);
  if (activeGoals.length > 0) {
    foundationLines.push('### Priority Focus Areas');
    foundationLines.push('');
    foundationLines.push('Based on your selected goals, these areas should be prioritised in execution:');
    foundationLines.push('');
    for (const goal of activeGoals) {
      const guide = GOAL_GUIDES[goal];
      foundationLines.push(`#### ${guide.label}`);
      foundationLines.push('');
      for (const point of guide.emphasis) {
        foundationLines.push(`- ${point}`);
      }
      foundationLines.push('');
    }
  }

  foundationLines.push('### Brand Voice');
  foundationLines.push('');
  foundationLines.push(`**Voice:** ${profile.voice}`);
  foundationLines.push(`**Privacy:** ${profile.privacy_angle}`);
  foundationLines.push(`**CTA Style:** ${profile.cta_style}`);
  foundationLines.push('');

  foundationLines.push('### Positioning Angles');
  foundationLines.push('');

  // Angle 1: The Missing Tool
  const compNames = config.competitors.map(c => c.split(/[([]/)[0].trim()).join(', ');
  foundationLines.push('#### 1. The Missing Tool (PRIMARY)');
  foundationLines.push('');
  foundationLines.push(`> "Every ${config.category}${compNames ? ` (${compNames})` : ''} does X. ${config.app_name} does Y."`);
  foundationLines.push('');
  foundationLines.push(`**Hook:** "${config.differentiators[0] || config.one_liner}"`);
  foundationLines.push(`**Best for:** Reddit (niche subs), Hacker News`);
  foundationLines.push('');

  // Angle 2: No-Barrier
  const isWeb = config.app_type === 'web';
  const barrier = isWeb ? 'installing software' : config.app_type === 'mobile' ? 'complex setup' : 'complex setup';
  foundationLines.push('#### 2. The No-Barrier Solution');
  foundationLines.push('');
  foundationLines.push(`> "${config.one_liner} — no ${barrier} needed"`);
  foundationLines.push(`**Best for:** Reddit (broad subs), Product Hunt, general audiences`);
  foundationLines.push('');

  // Angle 3: Privacy/Trust
  foundationLines.push('#### 3. The Privacy / Trust Play');
  foundationLines.push('');
  foundationLines.push(`> "${profile.privacy_angle}"`);
  foundationLines.push(`**Best for:** Hacker News, privacy-conscious communities`);
  foundationLines.push('');

  // Angle 4: Speed
  const speedClaim = isWeb
    ? 'Open the link, use it immediately. No install, no account.'
    : config.app_type === 'mobile'
    ? 'Download, open, start using. Under a minute.'
    : config.app_type === 'cli'
    ? 'One command to install. Using it in 30 seconds.'
    : 'Up and running in minutes. No complex setup.';
  foundationLines.push('#### 4. The Speed Play');
  foundationLines.push('');
  foundationLines.push(`> "${speedClaim}"`);
  foundationLines.push(`**Best for:** Twitter/X, Product Hunt, landing pages`);
  foundationLines.push('');

  // Angle 5: Anti-positioning
  foundationLines.push('### Anti-Positioning');
  foundationLines.push('');
  foundationLines.push(`What ${config.app_name} is **NOT**:`);
  if (config.competitors.length > 0) {
    const firstComp = config.competitors[0].split(/[([]/)[0].trim();
    foundationLines.push(`- NOT a ${firstComp} replacement (different approach)`);
  }
  foundationLines.push('- NOT trying to be everything (does ONE thing well)');
  if (isFree) {
    foundationLines.push('- NOT enterprise software (no account, no subscription)');
  }

  // --- STAGE 3: STRUCTURE ---
  const structureLines: string[] = [];
  structureLines.push('## Stage 3: Structure');
  structureLines.push('');

  if (profile.seo_relevant) {
    structureLines.push('### SEO Keywords');
    structureLines.push('');
    structureLines.push('**Primary:** ' + keywords.primary.map(k => `"${k}"`).join(', '));
    structureLines.push('');
    structureLines.push('**Secondary:** ' + keywords.secondary.map(k => `"${k}"`).join(', '));
    structureLines.push('');
    structureLines.push('**Long-tail:** ' + keywords.longTail.map(k => `"${k}"`).join(', '));
    structureLines.push('');
    structureLines.push('### Meta Tags');
    structureLines.push('');
    structureLines.push(`- **Title:** "${config.app_name} — ${config.one_liner}${isFree ? ' | Free' : ''}"`);
    structureLines.push(`- **Description:** "${config.one_liner}. ${config.differentiators.slice(0, 2).join('. ')}.${isFree ? ' Free, no install.' : ''}"`);
    structureLines.push('');
  }

  structureLines.push('### Content Pillars');
  structureLines.push('');
  structureLines.push(`1. **Problem → Solution** — Why ${config.app_name} exists`);
  structureLines.push(`2. **How-To / Tutorial** — Getting started guides`);
  structureLines.push(`3. **Behind the Build** — Dev process, decisions, learnings`);
  structureLines.push(`4. **Community** — User stories, feedback, improvements`);
  structureLines.push('');

  structureLines.push('### Distribution Channels');
  structureLines.push('');
  if (channels.includes('reddit') && subreddits.length > 0) {
    structureLines.push('**Reddit:**');
    for (const sub of subreddits) {
      structureLines.push(`- ${sub}`);
    }
    structureLines.push('');
  }
  for (const ch of channels) {
    if (ch !== 'reddit' && CHANNEL_GUIDES[ch]) {
      structureLines.push(`**${CHANNEL_GUIDES[ch].name}:** ${CHANNEL_GUIDES[ch].tone}`);
    }
  }
  structureLines.push('');
  structureLines.push('### Quick Wins (60-90 days)');
  structureLines.push('');
  structureLines.push('1. Post to primary subreddit with authentic "I built this" framing');
  structureLines.push('2. Submit Show HN with technical angle');
  structureLines.push('3. LinkedIn learnings post for professional network');
  structureLines.push('4. Engage genuinely in 3-5 community threads per week');
  structureLines.push('5. Gather feedback, iterate, post update');

  // --- STAGE 4: ASSETS (COPY) ---
  const assetsLines: string[] = [];
  assetsLines.push('## Stage 4: Copy Templates');
  assetsLines.push('');

  // Reddit post
  if (channels.includes('reddit') && subreddits.length > 0) {
    const typeLabel = isWeb ? 'browser tool' : config.app_type === 'mobile' ? 'app' : config.app_type === 'cli' ? 'CLI tool' : 'tool';
    const titlePhrase = config.one_liner.replace(/\s*[—–]\s*.+$/, '').replace(/^[A-Z]/, m => m.toLowerCase());

    assetsLines.push(`### Reddit: ${subreddits[0]} (Primary)`);
    assetsLines.push('');
    assetsLines.push(`**Title:** I built a free ${typeLabel} that ${conjugateForThirdPerson(titlePhrase)}`);
    assetsLines.push('');
    assetsLines.push('**Body:**');
    assetsLines.push('');
    assetsLines.push('[2-3 sentences about the problem you personally experienced]');
    assetsLines.push('');
    assetsLines.push(`So I built a tool that does it automatically:`);
    assetsLines.push('');
    assetsLines.push(`**→ [${config.app_name}](${config.app_url})**`);
    assetsLines.push('');
    assetsLines.push('**What it does:**');
    for (const d of config.differentiators.slice(0, 5)) {
      assetsLines.push(`- ${d}`);
    }
    assetsLines.push('');
    if (isWeb) assetsLines.push('Everything runs in your browser — files never get uploaded anywhere.');
    assetsLines.push('');
    assetsLines.push('Would love feedback from anyone who tries it. What\'s missing?');
    assetsLines.push('');

    if (subreddits.length > 1) {
      assetsLines.push(`### Reddit: ${subreddits[1]} (Secondary)`);
      assetsLines.push('');
      assetsLines.push(`**Title:** Free ${typeLabel} to ${titlePhrase}`);
      assetsLines.push('');
      assetsLines.push('**Body:**');
      assetsLines.push('');
      assetsLines.push(`Made a ${isWeb ? 'browser ' : ''}tool for ${titlePhrase}. ${config.differentiators.slice(0, 3).join('. ')}.`);
      assetsLines.push('');
      assetsLines.push(config.app_url);
      assetsLines.push('');
    }
  }

  // Show HN
  if (channels.includes('hackernews')) {
    const hnPhrase = config.one_liner.replace(/\s*[—–]\s*in your browser\s*$/i, '');
    assetsLines.push('### Show HN');
    assetsLines.push('');
    assetsLines.push(`**Title:** Show HN: ${config.app_name} – ${hnPhrase}`);
    assetsLines.push('');
    assetsLines.push(`I built a ${isWeb ? 'browser-based ' : ''}tool that ${conjugateForThirdPerson(config.one_liner.replace(/\s*[—–].+$/, '').replace(/^[A-Z]/, m => m.toLowerCase()))}.`);
    assetsLines.push('');
    assetsLines.push('[Tech stack, approach, interesting decisions. 2-3 paragraphs max.]');
    assetsLines.push('');
    assetsLines.push(`Live: ${config.app_url}`);
    assetsLines.push('');
  }

  // LinkedIn
  if (channels.includes('linkedin')) {
    assetsLines.push('### LinkedIn Post');
    assetsLines.push('');
    assetsLines.push(`I built a tool that ${conjugateForThirdPerson(config.one_liner.replace(/\s*[—–].+$/, '').replace(/^[A-Z]/, m => m.toLowerCase()))}. ${isFree ? 'Free, no account needed.' : ''}`);
    assetsLines.push('');
    assetsLines.push('What I learned building this:');
    assetsLines.push('1. Niche tools can be genuinely useful. Not everything needs to be a platform.');
    assetsLines.push('2. Simplicity wins. Do one thing well rather than many things poorly.');
    assetsLines.push(`3. Understanding your user matters more than features.`);
    assetsLines.push('');
    assetsLines.push(`Try it: ${config.app_url}`);
    assetsLines.push('');
    assetsLines.push('#buildinpublic #sideproject #productdevelopment');
    assetsLines.push('');
  }

  // Twitter
  if (channels.includes('twitter')) {
    assetsLines.push('### Twitter Thread');
    assetsLines.push('');
    assetsLines.push(`**Tweet 1:** ${config.one_liner}${isFree ? ' Free.' : ''} ${isWeb ? 'No install. Runs in your browser.' : ''}`);
    assetsLines.push('');
    assetsLines.push(`${config.app_url}`);
    assetsLines.push('');
    assetsLines.push('**Tweet 2:** [The problem in 1-2 sentences]');
    assetsLines.push('');
    assetsLines.push('**Tweet 3:** [How it works — with screenshot/GIF]');
    assetsLines.push('');
    assetsLines.push(`**Tweet 4:** Try it → ${config.app_url} — Feedback welcome!`);
    assetsLines.push('');
  }

  // Product Hunt
  if (channels.includes('producthunt')) {
    const tagline = config.one_liner.length <= 60 ? config.one_liner : config.one_liner.substring(0, 57) + '...';
    assetsLines.push('### Product Hunt');
    assetsLines.push('');
    assetsLines.push(`**Tagline:** ${tagline}`);
    assetsLines.push('');
    assetsLines.push(`**Description:** ${config.one_liner}. ${config.differentiators[0]}. ${isFree ? 'Free, no account needed.' : ''}`);
    assetsLines.push('');
    assetsLines.push('**Maker comment:**');
    assetsLines.push('');
    assetsLines.push(`I built ${config.app_name} because [personal story]. What makes it different:`);
    for (const d of config.differentiators.slice(0, 3)) {
      assetsLines.push(`• ${d}`);
    }
    assetsLines.push('');
  }

  // App Store
  if (channels.includes('appstore') || config.app_type === 'mobile') {
    assetsLines.push('### App Store Description');
    assetsLines.push('');
    assetsLines.push(`**App name:** ${config.app_name.substring(0, 30)}`);
    assetsLines.push(`**Subtitle:** ${config.one_liner.substring(0, 30)}`);
    assetsLines.push(`**Short description:** ${config.one_liner.substring(0, 80)}`);
    assetsLines.push('');
    assetsLines.push('**Features:**');
    for (const d of config.differentiators) {
      assetsLines.push(`• ${d}`);
    }
    assetsLines.push('');
  }

  // Landing page hero
  assetsLines.push('### Landing Page Hero');
  assetsLines.push('');
  assetsLines.push(`**Headline:** ${config.app_name}`);
  assetsLines.push(`**Subheadline:** ${config.one_liner}`);
  assetsLines.push(`**CTA:** ${isFree ? 'Try it free →' : 'Get started →'}`);
  assetsLines.push('');

  // --- STAGE 5: DISTRIBUTION ---
  const distributionLines: string[] = [];
  distributionLines.push('## Stage 5: Distribution Plan');
  distributionLines.push('');
  distributionLines.push('### 4-Week Schedule');
  distributionLines.push('');
  distributionLines.push('| Week | Channel | Action | Notes |');
  distributionLines.push('|------|---------|--------|-------|');

  if (channels.includes('reddit') && subreddits.length > 0) {
    distributionLines.push(`| 1 | ${subreddits[0]} | Primary Reddit post | Test messaging with warmest audience |`);
  }
  if (channels.includes('twitter')) {
    distributionLines.push('| 1 | Twitter/X | Launch thread | Coordinate with Reddit |');
  }
  if (channels.includes('hackernews')) {
    distributionLines.push('| 2 | Hacker News | Show HN post | Technical angle |');
  }
  if (channels.includes('producthunt')) {
    distributionLines.push('| 2 | Product Hunt | Launch | Prepare assets in Week 1 |');
  }
  if (channels.includes('linkedin')) {
    distributionLines.push('| 2 | LinkedIn | Learnings post | After initial feedback |');
  }
  if (subreddits.length > 1 && channels.includes('reddit')) {
    distributionLines.push(`| 3 | ${subreddits[1]} | Secondary Reddit post | Adjust based on feedback |`);
  }
  distributionLines.push('| 3-4 | All | Engage in threads | Comment where genuinely helpful |');
  distributionLines.push('');

  distributionLines.push('### Engagement Strategy');
  distributionLines.push('');
  distributionLines.push('- **Before posting:** Comment in 3-5 threads in target communities');
  distributionLines.push('- **After posting:** Reply to every comment within the first 2 hours');
  distributionLines.push('- **Ongoing:** Share helpful insights; link to your tool only when genuinely relevant');
  distributionLines.push('- **Don\'t:** Cross-post to more than 2-3 subs simultaneously');
  distributionLines.push('');

  distributionLines.push('### Success Metrics');
  distributionLines.push('');
  distributionLines.push('| Metric | Week 1 Target | Month 1 Target |');
  distributionLines.push('|--------|--------------|----------------|');
  distributionLines.push('| Unique visitors | 100+ | 500+ |');
  distributionLines.push('| Reddit upvotes | 20+ | - |');
  distributionLines.push('| Active users | 10+ | 50+ |');
  distributionLines.push('| Feedback items | 5+ | 15+ |');
  distributionLines.push('');

  distributionLines.push('### Review Checklist');
  distributionLines.push('');
  distributionLines.push('- [ ] Sounds human — no "delve", "leverage", "revolutionise"');
  distributionLines.push('- [ ] Specific — exact numbers/features, not vague claims');
  distributionLines.push('- [ ] Matches platform culture');
  distributionLines.push('- [ ] Value prop clear in first sentence');
  distributionLines.push('- [ ] Links work');
  distributionLines.push('- [ ] Would a moderator approve this?');
  distributionLines.push('- [ ] Post adds value without clicking the link');
  distributionLines.push('');

  // Channel reference
  distributionLines.push('### Channel Reference');
  distributionLines.push('');
  for (const ch of channels) {
    const guide = CHANNEL_GUIDES[ch];
    if (guide) {
      distributionLines.push(`**${guide.name}**`);
      distributionLines.push(`- Best time: ${guide.bestTime}`);
      distributionLines.push(`- Tone: ${guide.tone}`);
      distributionLines.push(`- Format: ${guide.format}`);
      distributionLines.push('');
    }
  }

  // Assemble full plan
  const research = researchLines.join('\n');
  const foundation = foundationLines.join('\n');
  const structure = structureLines.join('\n');
  const assets = assetsLines.join('\n');
  const distribution = distributionLines.join('\n');

  const fullMarkdown = [
    `# Marketing Brief: ${config.app_name}`,
    '',
    `Generated: ${today} | Method: Vibe Marketing Playbook 5-Stage Sequence`,
    '',
    '---',
    '',
    research,
    '',
    '---',
    '',
    foundation,
    '',
    '---',
    '',
    structure,
    '',
    '---',
    '',
    assets,
    '',
    '---',
    '',
    distribution,
  ].join('\n');

  return {
    id,
    config,
    scraped,
    generated: fullMarkdown,
    createdAt: new Date().toISOString(),
    stages: { research, foundation, structure, assets, distribution },
  };
}

function inferTargetAudience(scraped: ScrapedApp): string {
  const category = (scraped.category || '').trim();
  const description = `${scraped.shortDescription || ''} ${scraped.description || ''}`.toLowerCase();

  if (
    description.includes('developer') ||
    description.includes('api') ||
    description.includes('sdk') ||
    description.includes('cli')
  ) {
    return 'Developers and technical teams who need faster workflows';
  }

  if (
    description.includes('team') ||
    description.includes('workspace') ||
    description.includes('collaboration')
  ) {
    return category
      ? `Teams searching for better ${category.toLowerCase()} workflows`
      : 'Teams that need faster, simpler workflows';
  }

  if (category) {
    return `People searching for ${category.toLowerCase()} tools`;
  }

  return `People evaluating alternatives to ${scraped.name}`;
}

// Generate config from scraped data
export function scrapedToConfig(scraped: ScrapedApp): AppConfig {
  const appType = scraped.source === 'appstore' || scraped.source === 'googleplay' ? 'mobile' : 'web';

  return {
    app_name: scraped.name,
    app_url: scraped.url,
    app_type: appType,
    category: scraped.category || 'tool',
    one_liner: scraped.shortDescription || scraped.description.substring(0, 120),
    target_audience: inferTargetAudience(scraped),
    pricing: scraped.pricing,
    differentiators: scraped.features.slice(0, 6),
    competitors: [],
    distribution_channels: appType === 'mobile'
      ? ['reddit', 'twitter', 'producthunt', 'appstore']
      : ['reddit', 'hackernews', 'twitter', 'linkedin', 'producthunt'],
    icon: scraped.icon,
  };
}

```

# lib/scraper.ts

```ts
import { ScrapedApp } from './types';
import dns from 'dns/promises';

// Prevent SSRF by validating the target IP
async function validateUrlSafety(urlStr: string): Promise<void> {
  const url = new URL(urlStr);
  const hostname = url.hostname;

  if (hostname === 'localhost') throw new Error('Unsafe URL: localhost is not allowed');

  let ip = hostname;
  try {
    const lookup = await dns.lookup(hostname);
    ip = lookup.address;
  } catch {
    // let fetch handle DNS errors if they occur later
  }

  const isIpv4 = ip.includes('.');
  if (isIpv4) {
    if (ip.startsWith('127.')) throw new Error('Unsafe URL: loopback IP not allowed');
    if (ip.startsWith('10.')) throw new Error('Unsafe URL: private network (10.x) not allowed');
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) throw new Error('Unsafe URL: private network (172.16-31.x) not allowed');
    if (ip.startsWith('192.168.')) throw new Error('Unsafe URL: private network (192.168.x) not allowed');
    if (ip.startsWith('169.254.')) throw new Error('Unsafe URL: metadata IP not allowed');
    if (ip.startsWith('0.')) throw new Error('Unsafe URL: 0.0.x.x not allowed');
  } else {
    const lower = ip.toLowerCase();
    if (lower === '::1') throw new Error('Unsafe URL: loopback IPv6 not allowed');
    if (lower.startsWith('fd') || lower.startsWith('fc')) throw new Error('Unsafe URL: unique local address (IPv6) not allowed');
    if (lower.startsWith('fe80')) throw new Error('Unsafe URL: link-local address (IPv6) not allowed');
  }
}

// Detect URL type
export function detectUrlType(url: string): 'appstore' | 'googleplay' | 'website' {
  if (url.includes('apps.apple.com') || url.includes('itunes.apple.com')) {
    return 'appstore';
  }
  if (url.includes('play.google.com')) {
    return 'googleplay';
  }
  return 'website';
}

// Extract App Store ID from URL
function extractAppStoreId(url: string): string | null {
  // Pattern: /id123456789 or id=123456789
  const match = url.match(/\/id(\d+)/) || url.match(/id=(\d+)/);
  return match ? match[1] : null;
}

// Extract Google Play package name from URL
function extractPlayStorePackage(url: string): string | null {
  const match = url.match(/id=([a-zA-Z0-9._]+)/);
  return match ? match[1] : null;
}

// Extract features from description text
function extractFeatures(description: string): string[] {
  const features: string[] = [];
  const lines = description.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match bullet points, dashes, or numbered items
    if (/^[-•◦▸▹●]\s+/.test(trimmed)) {
      const feature = trimmed.replace(/^[-•◦▸▹●]\s+/, '').trim();
      if (feature.length > 5 && feature.length < 200) {
        features.push(feature);
      }
    }
    // Match "✓" or "✔" prefixed items
    if (/^[✓✔☑]\s*/.test(trimmed)) {
      const feature = trimmed.replace(/^[✓✔☑]\s*/, '').trim();
      if (feature.length > 5) features.push(feature);
    }
  }

  // If no bullet features found, extract sentences that look like features
  if (features.length === 0) {
    const sentences = description.split(/[.!]\s+/);
    for (const s of sentences) {
      const trimmed = s.trim();
      if (trimmed.length > 10 && trimmed.length < 150 && !trimmed.includes('©') && !trimmed.includes('privacy')) {
        features.push(trimmed);
        if (features.length >= 6) break;
      }
    }
  }

  return features.slice(0, 10);
}

// Scrape Apple App Store via iTunes Lookup API
export async function scrapeAppStore(url: string): Promise<ScrapedApp> {
  const appId = extractAppStoreId(url);
  if (!appId) {
    throw new Error('Could not extract App Store ID from URL');
  }

  // Use iTunes Lookup API
  const apiUrl = `https://itunes.apple.com/lookup?id=${appId}&country=gb`;
  const response = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`iTunes API returned ${response.status}`);
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error('App not found in iTunes API');
  }

  const app = data.results[0];

  return {
    url,
    source: 'appstore',
    name: app.trackName || app.trackCensoredName || 'Unknown',
    icon: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60,
    description: app.description || '',
    shortDescription: app.description ? app.description.split('\n')[0].trim().substring(0, 160) : undefined,
    screenshots: [
      ...(app.screenshotUrls || []),
      ...(app.ipadScreenshotUrls || []),
    ].slice(0, 6),
    pricing: app.price === 0 ? 'Free' : `${app.formattedPrice || `$${app.price}`}`,
    rating: app.averageUserRating ? parseFloat(app.averageUserRating.toFixed(1)) : undefined,
    ratingCount: app.userRatingCount,
    category: app.primaryGenreName,
    developer: app.artistName || app.sellerName,
    features: extractFeatures(app.description || ''),
    keywords: app.genres || [],
  };
}

// Scrape Google Play Store
export async function scrapeGooglePlay(url: string): Promise<ScrapedApp> {
  const packageName = extractPlayStorePackage(url);
  if (!packageName) {
    throw new Error('Could not extract package name from Google Play URL');
  }

  // Fetch the Google Play page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Google Play returned ${response.status}`);
  }

  const html = await response.text();

  // Extract data from meta tags and structured data
  const name = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTagContent(html, 'title') || packageName;
  const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || '';
  const icon = extractMeta(html, 'og:image') || '';

  // Try to extract rating
  const ratingMatch = html.match(/(\d+\.\d+)\s*star/i) || html.match(/"ratingValue":\s*"?(\d+\.?\d*)"?/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

  // Try to extract category
  const categoryMatch = html.match(/"genre":\s*"([^"]+)"/) || html.match(/itemprop="genre"[^>]*content="([^"]+)"/);
  const category = categoryMatch ? categoryMatch[1] : undefined;

  return {
    url,
    source: 'googleplay',
    name: name.replace(' - Apps on Google Play', '').trim(),
    icon: icon || undefined,
    description,
    shortDescription: description.substring(0, 160),
    screenshots: [],
    pricing: html.toLowerCase().includes('in-app purchases') ? 'Free with in-app purchases' : 'Free',
    rating,
    category,
    developer: undefined,
    features: extractFeatures(description),
  };
}

// Scrape generic website
export async function scrapeWebsite(url: string): Promise<ScrapedApp> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Website returned ${response.status}`);
  }

  const html = await response.text();

  const name = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTagContent(html, 'title') || new URL(url).hostname;
  const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || extractMeta(html, 'twitter:description') || '';
  const icon = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || '';

  // Extract headings for features
  const headings = extractHeadings(html);
  const features = headings.length > 0 ? headings : extractFeatures(description);

  // Try to detect pricing
  const pricingKeywords = ['free', 'pricing', 'plans', '$', '£', '€'];
  const htmlLower = html.toLowerCase();
  const hasPricing = pricingKeywords.some(kw => htmlLower.includes(kw));
  const pricing = htmlLower.includes('free') ? 'Free' : hasPricing ? 'Paid' : 'Unknown';

  // Extract category from meta keywords or content
  const keywords = extractMeta(html, 'keywords');
  const category = keywords ? keywords.split(',')[0].trim() : undefined;

  return {
    url,
    source: 'website',
    name: name.replace(/\s*[|–—]\s*.+$/, '').trim(),
    icon: icon || undefined,
    description,
    features,
    pricing,
    category,
    keywords: keywords ? keywords.split(',').map((k: string) => k.trim()) : undefined,
  };
}

// HTML parsing helpers
function extractMeta(html: string, name: string): string | undefined {
  // Try property first, then name
  const propRegex = new RegExp(`<meta[^>]*(?:property|name)=["'](?:og:|twitter:)?${escapeRegex(name)}["'][^>]*content=["']([^"']+)["']`, 'i');
  const propMatch = html.match(propRegex);
  if (propMatch) return decodeHtmlEntities(propMatch[1]);

  // Try reversed attribute order
  const revRegex = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:|twitter:)?${escapeRegex(name)}["']`, 'i');
  const revMatch = html.match(revRegex);
  if (revMatch) return decodeHtmlEntities(revMatch[1]);

  return undefined;
}

function extractTagContent(html: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const regex = /<h[2-4][^>]*>([^<]+)<\/h[2-4]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = decodeHtmlEntities(match[1].trim());
    if (text.length > 3 && text.length < 200) {
      headings.push(text);
    }
  }
  return headings.slice(0, 10);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

// Main scrape function
export async function scrapeUrl(url: string): Promise<ScrapedApp> {
  await validateUrlSafety(url);

  const type = detectUrlType(url);

  switch (type) {
    case 'appstore':
      return scrapeAppStore(url);
    case 'googleplay':
      return scrapeGooglePlay(url);
    case 'website':
      return scrapeWebsite(url);
  }
}

```

# lib/screenshot-compositor.ts

```ts
export type CompositeDevice = 'iphone-15' | 'iphone-15-pro' | 'android';

export interface CompositeScreenshotInput {
  imageUrl?: string;
  imageBase64?: string;
  headline: string;
  subheadline?: string;
  badge?: string;
  device?: CompositeDevice;
  backgroundColor?: string;
  textColor?: string;
  appName?: string;
}

const DEFAULT_BG = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

function normalizeImageSrc(input: { imageUrl?: string; imageBase64?: string }): string {
  if (input.imageBase64) {
    const trimmed = input.imageBase64.trim();
    if (trimmed.startsWith('data:')) return trimmed;
    return `data:image/png;base64,${trimmed}`;
  }
  if (input.imageUrl) return input.imageUrl;
  throw new Error('Either imageUrl or imageBase64 is required');
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function deviceParams(device: CompositeDevice) {
  if (device === 'android') {
    return { frameRadius: 56, border: 10, frameColor: '#101214', screenRadius: 42, cutout: 'punch' as const };
  }
  const pro = device === 'iphone-15-pro';
  return { frameRadius: 68, border: 10, frameColor: pro ? '#0b0b0d' : '#121214', screenRadius: 56, cutout: 'island' as const };
}

export function buildCompositeHtml(input: CompositeScreenshotInput): { html: string; width: number; height: number } {
  const {
    headline, subheadline, badge,
    device = 'iphone-15',
    backgroundColor = DEFAULT_BG,
    textColor = '#ffffff',
    appName,
  } = input;

  if (!headline) throw new Error('headline is required');

  const imgSrc = normalizeImageSrc(input);
  const d = deviceParams(device);
  const W = 1290, H = 2796;
  const devW = 860, devH = 1860;

  const safeHL = esc(headline);
  const safeSub = subheadline ? esc(subheadline) : '';
  const safeBadge = badge ? esc(badge) : '';
  const safeApp = appName ? esc(appName) : '';

  const cutoutHtml = d.cutout === 'island'
    ? `<div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:220px;height:46px;background:${d.frameColor};border-radius:0 0 26px 26px;box-shadow:0 8px 18px rgba(0,0,0,0.35);z-index:10"></div>`
    : `<div style="position:absolute;top:22px;left:50%;transform:translateX(-50%);width:18px;height:18px;border-radius:999px;background:${d.frameColor};z-index:10;box-shadow:0 8px 18px rgba(0,0,0,0.35)"></div>`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:Inter,system-ui,-apple-system,sans-serif;background:${backgroundColor};color:${textColor}}
.c{width:${W}px;height:${H}px;padding:120px 110px;display:flex;flex-direction:column;align-items:center;justify-content:space-between}
.top{width:100%;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center}
.badge{display:inline-flex;align-items:center;padding:10px 16px;border-radius:999px;font-size:26px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(10px)}
.hl{font-size:88px;font-weight:800;line-height:1.05;letter-spacing:-.03em;max-width:1040px;text-shadow:0 10px 30px rgba(0,0,0,.2)}
.sub{font-size:36px;font-weight:500;line-height:1.25;opacity:.88;max-width:980px}
.dw{width:${devW}px;height:${devH}px;display:flex;align-items:center;justify-content:center}
.df{width:${devW}px;height:${devH}px;border-radius:${d.frameRadius}px;background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.02));box-shadow:0 40px 90px rgba(0,0,0,.35),0 12px 30px rgba(0,0,0,.22);border:${d.border}px solid ${d.frameColor};position:relative;padding:16px}
.di{width:100%;height:100%;border-radius:${d.screenRadius}px;overflow:hidden;background:#000;position:relative}
.di img{width:100%;height:100%;object-fit:cover;display:block}
.gl{position:absolute;inset:0;border-radius:${d.screenRadius}px;pointer-events:none;background:radial-gradient(1200px 700px at 30% 0%,rgba(255,255,255,.12),rgba(255,255,255,0) 55%);mix-blend-mode:screen}
.ft{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;opacity:.78;font-size:22px;font-weight:600;letter-spacing:.02em}
</style></head><body>
<div class="c">
  <div class="top">
    ${safeBadge ? `<div class="badge">${safeBadge}</div>` : ''}
    <div class="hl">${safeHL}</div>
    ${safeSub ? `<div class="sub">${safeSub}</div>` : ''}
  </div>
  <div class="dw"><div class="df">
    ${cutoutHtml}
    <div class="di"><img src="${imgSrc}"/><div class="gl"></div></div>
  </div></div>
  <div class="ft">${safeApp ? `<span>${safeApp}</span><span style="opacity:.55">•</span>` : ''}<span>Made with Marketing Tool</span></div>
</div>
</body></html>`;

  return { html, width: W, height: H };
}

```

# lib/socialTemplates.ts

```ts
import type { MarketingPlan } from '@/lib/types';

export type SocialPlatform =
  | 'twitter'
  | 'linkedin'
  | 'instagram-post'
  | 'instagram-story'
  | 'facebook-og';

export type SocialStyle = 'gradient' | 'dark' | 'light';
export type SocialVisualMode = 'screenshot' | 'hero' | 'hybrid';

export interface SocialTemplate {
  platform: SocialPlatform;
  label: string;
  width: number;
  height: number;
  filename: string;
  html: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '').trim();
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  const num = Number.parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mix(a: string, b: string, amount: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const t = clamp(amount, 0, 1);
  return rgbToHex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t
  );
}

function safeText(input: unknown, fallback: string) {
  const s = typeof input === 'string' ? input.trim() : '';
  return s || fallback;
}

function proxyUrl(url: string | undefined): string {
  const s = typeof url === 'string' ? url.trim() : '';
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return `/api/image-proxy?url=${encodeURIComponent(s)}`;
  }
  return s;
}

function pickTop(items: unknown, n: number): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .slice(0, n);
}

function firstScreenshot(plan: MarketingPlan): string | undefined {
  const shots = plan?.scraped?.screenshots;
  if (!Array.isArray(shots) || shots.length === 0) return undefined;
  const s = shots.find((x) => typeof x === 'string' && x.startsWith('http'));
  return s;
}

function socialProof(plan: MarketingPlan): string {
  const rating = plan?.scraped?.rating;
  const count = plan?.scraped?.ratingCount;
  if (typeof rating === 'number' && rating > 0) {
    const rounded = Math.round(rating * 10) / 10;
    if (typeof count === 'number' && count > 0) {
      const pretty = count >= 1000 ? `${Math.round(count / 100) / 10}k` : `${count}`;
      return `★ ${rounded} • ${pretty} reviews`;
    }
    return `★ ${rounded} rating`;
  }
  const pricing = safeText(plan?.config?.pricing, '');
  if (pricing) return pricing;
  const audience = safeText(plan?.config?.target_audience, '');
  if (audience) return `Built for ${audience}`;
  return 'Loved by teams who ship.';
}

function defaultHeadline(plan: MarketingPlan): string {
  // Try to turn the one-liner into a punchy headline.
  const oneLiner = safeText(plan?.config?.one_liner, safeText(plan?.scraped?.shortDescription, ''));
  if (oneLiner) {
    const trimmed = oneLiner.replace(/\s+/g, ' ').trim();
    // If it's long, take first sentence/phrase.
    const cut = trimmed.split(/\.|\n|\r|\!|\?|—|–|:|\|/)[0]?.trim();
    return cut.length <= 64 ? cut : `${cut.slice(0, 61)}…`;
  }
  return `Meet ${safeText(plan?.config?.app_name, safeText(plan?.scraped?.name, 'Your App'))}`;
}

function htmlShell(opts: {
  title: string;
  width: number;
  height: number;
  bg: string;
  text: string;
  accent: string;
  accent2: string;
  body: string;
}) {
  const { title, width, height, bg, text, accent, accent2, body } = opts;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${width}, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root{
        --bg:${bg};
        --text:${text};
        --muted:${mix(text, bg, 0.55)};
        --card:${mix(bg, '#ffffff', 0.06)};
        --border:${mix(bg, '#ffffff', 0.10)};
        --accent:${accent};
        --accent2:${accent2};
        --shadow: 0 18px 45px rgba(0,0,0,0.35);
      }
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:var(--bg);width:${width}px;height:${height}px;overflow:hidden}
      body{font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; color:var(--text);}
      .frame{position:relative;width:${width}px;height:${height}px;}
      .noise{position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.25'/%3E%3C/svg%3E");mix-blend-mode:overlay;opacity:.12;pointer-events:none}
      .glow{position:absolute;inset:-20%;background:radial-gradient(900px 600px at 18% 12%, color-mix(in srgb, var(--accent) 42%, transparent), transparent 70%), radial-gradient(800px 520px at 88% 16%, color-mix(in srgb, var(--accent2) 35%, transparent), transparent 72%), radial-gradient(900px 620px at 60% 92%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%);filter: blur(0px);opacity:.95;}
      .chip{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb, var(--card) 86%, transparent);backdrop-filter: blur(8px);}
      .btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;font-weight:700;border:0;box-shadow: 0 12px 30px color-mix(in srgb, var(--accent) 35%, transparent);}
      .card{background:color-mix(in srgb, var(--card) 92%, transparent);border:1px solid var(--border);border-radius:22px;box-shadow: var(--shadow);}
      .muted{color:var(--muted)}
      .kicker{font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:color-mix(in srgb, var(--accent) 65%, var(--text));}
      .h1{font-size:56px;line-height:1.03;letter-spacing:-0.03em;font-weight:850;}
      .h2{font-size:40px;line-height:1.06;letter-spacing:-0.03em;font-weight:850;}
      .p{font-size:22px;line-height:1.35;}
      .small{font-size:16px;line-height:1.35;}
      img{display:block}
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="glow"></div>
      <div class="noise"></div>
      ${body}
    </div>
  </body>
</html>`;
}

function iconImg(iconUrl?: string, size = 64) {
  const safe = proxyUrl(iconUrl);
  if (safe) {
    return `<img src="${safe}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;border-radius:${Math.round(
      size * 0.28
    )}px;box-shadow:0 12px 30px rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);object-fit:cover" />`;
  }
  // Fallback: lettermark
  return `<div style="width:${size}px;height:${size}px;border-radius:${Math.round(
    size * 0.28
  )}px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:900;font-size:${Math.round(
    size * 0.42
  )}px;color:white;box-shadow:0 12px 30px rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.12);">★</div>`;
}

export function generateSocialTemplates(opts: {
  plan: MarketingPlan;
  platforms: SocialPlatform[];
  style: SocialStyle;
  accentColor: string;
  visualMode?: SocialVisualMode;
  bgImageUrl?: string;
  imageBrief?: {
    hook?: string;
    scene?: string;
    subject?: string;
    mood?: string;
    palette?: string;
    composition?: string;
    avoid?: string[];
  } | null;
}): SocialTemplate[] {
  const { plan, platforms, style } = opts;
  const visualMode: SocialVisualMode = opts.visualMode || 'screenshot';
  const imageBrief = opts.imageBrief || null;
  const bgImageUrl =
    typeof opts.bgImageUrl === 'string' && opts.bgImageUrl.startsWith('http')
      ? proxyUrl(opts.bgImageUrl)
      : undefined;
  const accent = typeof opts.accentColor === 'string' && opts.accentColor.startsWith('#') ? opts.accentColor : '#667eea';
  const accent2 = mix(accent, '#ffffff', 0.22);

  const bg =
    style === 'light'
      ? '#f8fafc'
      : style === 'dark'
        ? '#0b1220'
        : '#070a13';

  const text = style === 'light' ? '#0b1220' : '#e6eaf2';

  const name = safeText(plan?.config?.app_name, safeText(plan?.scraped?.name, 'Your App'));
  const oneLinerRaw = safeText(
    plan?.config?.one_liner,
    safeText(plan?.scraped?.shortDescription, safeText(plan?.scraped?.description, ''))
  );
  // Keep the supporting line punchy; long scraped descriptions break the layout.
  const oneLiner = oneLinerRaw.length > 140 ? `${oneLinerRaw.slice(0, 137).trim()}…` : oneLinerRaw;
  const bullets = pickTop(plan?.config?.differentiators, 3);
  const fallbackBullets = pickTop(plan?.scraped?.features, 3);
  const features = bullets.length ? bullets : fallbackBullets;
  while (features.length < 3) features.push('Fast setup. Clear results. Built for focus.');

  const headline = defaultHeadline(plan);
  const proof = socialProof(plan);
  const screenshot = firstScreenshot(plan);
  const iconUrl = plan?.scraped?.icon || plan?.config?.icon;

  const common = {
    bg,
    text,
    accent,
    accent2,
  };

  const templates: SocialTemplate[] = [];

  for (const platform of platforms) {
    if (platform === 'twitter') {
      const width = 1200;
      const height = 675;

      const body = `
<div style="position:absolute;inset:48px;display:flex;gap:34px;align-items:stretch;">
  <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div class="chip" style="width:fit-content;gap:12px;">
        ${iconImg(iconUrl, 56)}
        <div style="display:flex;flex-direction:column;gap:2px;">
          <div style="font-weight:850;font-size:20px;letter-spacing:-0.02em;">${name}</div>
          <div class="small muted" style="max-width:560px;">${oneLiner}</div>
        </div>
      </div>

      <div style="margin-top:26px;" class="h2">${headline}</div>

      <div style="margin-top:18px;display:grid;gap:12px;">
        ${features
          .slice(0, 3)
          .map(
            (f) => `
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:30px;height:30px;border-radius:10px;background:color-mix(in srgb, var(--accent) 24%, transparent);border:1px solid color-mix(in srgb, var(--accent) 35%, transparent);display:flex;align-items:center;justify-content:center;font-weight:900;">✦</div>
            <div style="font-size:20px;line-height:1.28;">${f}</div>
          </div>`
          )
          .join('')}
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:22px;">
      <div class="chip" style="padding:10px 14px;">
        <div style="width:10px;height:10px;border-radius:999px;background:var(--accent);"></div>
        <div class="small" style="font-weight:650;">${proof}</div>
      </div>
      <div class="btn" style="height:48px;">Try ${name} →</div>
    </div>
  </div>

  <div class="card" style="width:420px;padding:18px;display:flex;flex-direction:column;gap:12px;justify-content:center;">
    <div style="height:100%;border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 20%, transparent),color-mix(in srgb,var(--accent2) 18%, transparent));border:1px solid var(--border);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:-40%;background:radial-gradient(420px 320px at 30% 35%, color-mix(in srgb,var(--accent) 30%, transparent), transparent 70%), radial-gradient(420px 320px at 70% 65%, color-mix(in srgb,var(--accent2) 25%, transparent), transparent 70%);"></div>
      <div style="position:relative;padding:28px;text-align:left;">
        <div class="kicker">${safeText(plan?.config?.category, safeText(plan?.scraped?.category, '')) || 'Productivity'}</div>
        <div style="margin-top:10px;font-size:30px;line-height:1.08;font-weight:850;letter-spacing:-0.03em;">${name} makes it easy to ship.</div>
        <div style="margin-top:12px" class="small muted">${oneLiner}</div>
      </div>
    </div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'Twitter Card',
        width,
        height,
        filename: 'twitter-card.png',
        html: htmlShell({ title: `${name} — Twitter`, width, height, ...common, body }),
      });
      continue;
    }

    if (platform === 'facebook-og') {
      const width = 1200;
      const height = 630;

      const body = `
<div style="position:absolute;inset:44px;display:flex;gap:34px;align-items:stretch;">
  <div style="flex:1.2;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="display:flex;gap:14px;align-items:center;">
        ${iconImg(iconUrl, 62)}
        <div>
          <div style="font-weight:900;font-size:28px;letter-spacing:-0.03em;">${name}</div>
          <div class="muted" style="font-size:18px;max-width:600px;">${oneLiner}</div>
        </div>
      </div>

      <div style="margin-top:22px" class="h2">${headline}</div>

      <div style="margin-top:16px;display:grid;gap:10px;max-width:640px;">
        ${features
          .slice(0, 3)
          .map(
            (f) => `
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="width:28px;height:28px;border-radius:10px;background:color-mix(in srgb, var(--accent) 22%, transparent);border:1px solid color-mix(in srgb, var(--accent) 32%, transparent);display:flex;align-items:center;justify-content:center;font-weight:900;">✦</div>
            <div style="font-size:19px;line-height:1.28;">${f}</div>
          </div>`
          )
          .join('')}
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:12px;">
      <div class="chip"><div class="small" style="font-weight:650;">${proof}</div></div>
      <div class="btn" style="height:46px;">Get started →</div>
    </div>
  </div>

  <div class="card" style="flex:0.8;padding:18px;display:flex;align-items:stretch;">
    <div style="flex:1;border-radius:18px;overflow:hidden;border:1px solid var(--border);background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 22%, transparent),color-mix(in srgb,var(--accent2) 14%, transparent));position:relative;">
      <div style="position:absolute;inset:-40%;background:radial-gradient(520px 360px at 35% 40%, color-mix(in srgb,var(--accent) 30%, transparent), transparent 70%), radial-gradient(520px 360px at 70% 60%, color-mix(in srgb,var(--accent2) 25%, transparent), transparent 70%);"></div>
      <div style="position:relative;height:100%;display:flex;align-items:center;justify-content:center;padding:22px;">
        <div style="width:100%;border-radius:16px;background:color-mix(in srgb, #000 18%, transparent);border:1px solid rgba(255,255,255,0.12);padding:18px;">
          <div style="font-weight:800;font-size:18px;">What you get</div>
          <div style="margin-top:10px;display:grid;gap:10px;">
            ${features
              .slice(0, 3)
              .map(
                (f) => `<div style="display:flex;gap:10px;align-items:flex-start;"><div style="margin-top:4px;width:8px;height:8px;border-radius:99px;background:var(--accent);"></div><div class="small">${f}</div></div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'Facebook OG',
        width,
        height,
        filename: 'facebook-og.png',
        html: htmlShell({ title: `${name} — Facebook OG`, width, height, ...common, body }),
      });
      continue;
    }

    if (platform === 'linkedin') {
      const width = 1200;
      const height = 627;

      const screenshotBlock = screenshot
        ? `
        <div style="height:100%;border-radius:18px;overflow:hidden;border:1px solid var(--border);box-shadow:0 18px 40px rgba(0,0,0,0.25);background:rgba(0,0,0,0.2);">
          <img src="${proxyUrl(screenshot)}" style="width:100%;height:100%;object-fit:cover;" />
        </div>`
        : `
        <div style="height:100%;border-radius:18px;border:1px solid var(--border);background:color-mix(in srgb, var(--card) 88%, transparent);padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          ${features
            .slice(0, 4)
            .map(
              (f) => `
            <div style="border-radius:16px;border:1px solid var(--border);background:color-mix(in srgb, #000 14%, transparent);padding:14px;">
              <div style="font-weight:850;">✦</div>
              <div class="small" style="margin-top:8px;">${f}</div>
            </div>`
            )
            .join('')}
        </div>`;

      const body = `
<div style="position:absolute;inset:46px;display:grid;grid-template-columns: 1.05fr 0.95fr;gap:28px;align-items:stretch;">
  <div style="display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="display:flex;align-items:center;gap:14px;">
        ${iconImg(iconUrl, 58)}
        <div>
          <div class="kicker">${safeText(plan?.config?.category, safeText(plan?.scraped?.category, '')) || 'Software'}</div>
          <div style="font-weight:900;font-size:28px;letter-spacing:-0.03em;">${name}</div>
        </div>
      </div>

      <div style="margin-top:18px" class="h2">${headline}</div>
      <div style="margin-top:10px" class="p muted">${oneLiner}</div>

      <div style="margin-top:18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <div class="chip" style="padding:10px 14px;">
          <div style="width:10px;height:10px;border-radius:999px;background:var(--accent);"></div>
          <div class="small" style="font-weight:650;">${proof}</div>
        </div>
        <div class="chip" style="padding:10px 14px;">
          <div class="small" style="font-weight:650;">${safeText(plan?.config?.pricing, 'Fast to try. Easy to adopt.')}</div>
        </div>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;">
      <div class="small muted">${safeText(plan?.scraped?.developer, '')}</div>
      <div class="btn" style="height:48px;">Request a demo →</div>
    </div>
  </div>

  <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:12px;">
    <div style="font-weight:850;font-size:16px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)">Preview</div>
    <div style="flex:1;">${screenshotBlock}</div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'LinkedIn Post',
        width,
        height,
        filename: 'linkedin-post.png',
        html: htmlShell({ title: `${name} — LinkedIn`, width, height, ...common, body }),
      });
      continue;
    }

    if (platform === 'instagram-post') {
      const width = 1080;
      const height = 1080;

      const category = safeText(plan?.config?.category, safeText(plan?.scraped?.category, '')).toLowerCase();
      const vibeIcon = category.includes('photo')
        ? '📍'
        : category.includes('travel')
          ? '🧭'
          : category.includes('fitness')
            ? '⚡'
            : '✨';

      const hook = safeText(imageBrief?.hook, headline);
      const scene = safeText(imageBrief?.scene, safeText(plan?.config?.category, '')); 

      const heroVisual = `
<div style="width:100%;height:100%;border-radius:28px;position:relative;overflow:hidden;border:1px solid var(--border);background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, #000 30%, transparent));">
  ${bgImageUrl ? `<img src="${bgImageUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />` : ''}
  ${bgImageUrl ? '' : `<div style="position:absolute;inset:-30%;background:radial-gradient(520px 420px at 30% 30%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%), radial-gradient(520px 420px at 70% 70%, color-mix(in srgb, var(--accent2) 45%, transparent), transparent 72%);filter: blur(0px);opacity:0.95;"></div>`}
  <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.62));"></div>

  <div style="position:absolute;left:26px;top:26px;display:flex;flex-direction:column;gap:10px;max-width:680px;">
    <div class="chip" style="padding:10px 14px;gap:10px;">
      <div style="font-size:18px;">${vibeIcon}</div>
      <div class="small" style="font-weight:800;">${scene || 'In the wild'}</div>
    </div>
    <div style="font-size:48px;line-height:1.02;font-weight:950;letter-spacing:-0.04em;">${hook}</div>
    <div class="small muted" style="max-width:560px;">${safeText(imageBrief?.mood, oneLiner)}</div>
  </div>

  ${bgImageUrl ? '' : `<div style="position:absolute;right:24px;bottom:22px;display:flex;gap:12px;align-items:flex-end;">
    <div style="width:220px;height:220px;border-radius:26px;background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.10);backdrop-filter: blur(10px);display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <div style="font-size:90px;opacity:0.95;">🌅</div>
    </div>
    <div style="width:160px;height:160px;border-radius:26px;background:rgba(0,0,0,0.18);border:1px solid rgba(255,255,255,0.10);backdrop-filter: blur(10px);display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <div style="font-size:74px;opacity:0.95;">📷</div>
    </div>
  </div>`}
</div>`;

      const screenshotVisual = screenshot
        ? `<img src="${proxyUrl(screenshot)}" style="width:100%;height:100%;object-fit:cover;transform:scale(1.12);border-radius:28px;" />`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${iconImg(
            iconUrl,
            220
          )}</div>`;

      const mainVisual =
        visualMode === 'hero'
          ? heroVisual
          : visualMode === 'hybrid'
            ? `<div style="position:relative;width:100%;height:100%;">
                ${heroVisual}
                <div style="position:absolute;left:26px;bottom:26px;width:420px;height:260px;border-radius:26px;overflow:hidden;border:1px solid rgba(255,255,255,0.14);box-shadow:0 18px 45px rgba(0,0,0,0.35);background:rgba(0,0,0,0.18);">
                  ${screenshotVisual}
                </div>
              </div>`
            : screenshotVisual;

      const body = `
<div style="position:absolute;inset:50px;display:flex;flex-direction:column;gap:22px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div class="chip" style="padding:10px 14px;gap:10px;">
      ${iconImg(iconUrl, 46)}
      <div style="font-weight:900;letter-spacing:-0.02em;">${name}</div>
    </div>
    <div class="chip"><div class="small" style="font-weight:700;">${proof}</div></div>
  </div>

  <div class="card" style="flex:1;padding:18px;overflow:hidden;position:relative;">
    <div style="position:absolute;inset:0;background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 28%, transparent), transparent 55%), linear-gradient(225deg, color-mix(in srgb, var(--accent2) 22%, transparent), transparent 60%);"></div>
    <div style="position:relative;height:100%;display:grid;grid-template-rows:auto 1fr auto;gap:14px;">
      <div>
        <div class="h2" style="font-size:52px;">${headline}</div>
        <div class="p muted" style="margin-top:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-height:60px;">${oneLiner}</div>
      </div>

      <div style="border-radius:28px;overflow:hidden;border:1px solid var(--border);box-shadow:0 18px 40px rgba(0,0,0,0.28);background:rgba(0,0,0,0.18);">${mainVisual}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        ${features
          .slice(0, 3)
          .map(
            (f) => `
          <div style="border-radius:18px;border:1px solid var(--border);background:color-mix(in srgb, var(--card) 85%, transparent);padding:14px;">
            <div style="font-weight:900;">✦</div>
            <div class="small" style="margin-top:8px;">${f}</div>
          </div>`
          )
          .join('')}
      </div>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div class="small muted">@${name.replace(/\s+/g, '').toLowerCase()}</div>
    <div class="btn" style="height:46px;">Get it today →</div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'Instagram Post',
        width,
        height,
        filename: 'instagram-post.png',
        html: htmlShell({ title: `${name} — Instagram Post`, width, height, ...common, body }),
      });
      continue;
    }

    if (platform === 'instagram-story') {
      const width = 1080;
      const height = 1920;

      const body = `
<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:76px 64px;">
  <div>
    <div style="display:flex;align-items:center;gap:16px;">
      ${iconImg(iconUrl, 74)}
      <div>
        <div class="kicker">${safeText(plan?.config?.category, safeText(plan?.scraped?.category, '')) || 'New'}</div>
        <div style="font-weight:950;font-size:38px;letter-spacing:-0.03em;">${name}</div>
      </div>
    </div>

    <div style="margin-top:28px" class="h1" >${headline}</div>
    <div style="margin-top:14px" class="p muted">${oneLiner}</div>

    <div style="margin-top:34px;display:grid;gap:14px;">
      ${features
        .slice(0, 3)
        .map(
          (f) => `
        <div class="card" style="padding:18px 18px;border-radius:22px;display:flex;gap:14px;align-items:flex-start;">
          <div style="width:38px;height:38px;border-radius:14px;background:color-mix(in srgb, var(--accent) 22%, transparent);border:1px solid color-mix(in srgb, var(--accent) 34%, transparent);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;">✦</div>
          <div style="font-size:22px;line-height:1.25;font-weight:650;">${f}</div>
        </div>`
        )
        .join('')}
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:14px;">
    <div class="chip" style="justify-content:space-between;padding:14px 18px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:10px;height:10px;border-radius:999px;background:var(--accent);"></div>
        <div class="small" style="font-weight:700;">${proof}</div>
      </div>
      <div class="small muted">Tap to learn more</div>
    </div>
    <div class="btn" style="height:56px;font-size:18px;border-radius:18px;">Swipe up →</div>
  </div>
</div>`;

      templates.push({
        platform,
        label: 'Instagram Story',
        width,
        height,
        filename: 'instagram-story.png',
        html: htmlShell({ title: `${name} — Instagram Story`, width, height, ...common, body }),
      });
      continue;
    }
  }

  return templates;
}

```

# lib/types.ts

```ts
// Core types for the marketing tool

export interface ScrapedApp {
  url: string;
  source: 'appstore' | 'googleplay' | 'website';
  name: string;
  icon?: string;
  description: string;
  shortDescription?: string;
  screenshots?: string[];
  pricing: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
  developer?: string;
  features: string[];
  keywords?: string[];
}

export interface AppConfig {
  app_name: string;
  app_url: string;
  app_type: 'web' | 'mobile' | 'saas' | 'desktop' | 'cli' | 'api' | 'browser-extension';
  category: string;
  one_liner: string;
  target_audience: string;
  pricing: string;
  differentiators: string[];
  competitors: string[];
  distribution_channels: string[];
  repo_url?: string;
  icon?: string;
}

export interface MarketingPlan {
  id: string;
  config: AppConfig;
  scraped: ScrapedApp;
  generated: string; // Full markdown
  createdAt: string;
  stages: {
    research: string;
    foundation: string;
    structure: string;
    assets: string;
    distribution: string;
  };
}

export interface AssetConfig {
  name: string;
  tagline: string;
  icon: string;
  url: string;
  features: string[];
  colors: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
  };
}

export interface GeneratedAsset {
  type: 'og-image' | 'social-card' | 'github-social';
  label: string;
  width: number;
  height: number;
  html: string;
}

export interface RecentAnalysis {
  id: string;
  url: string;
  name: string;
  icon?: string;
  source: string;
  createdAt: string;
}

```

# lib/utils.ts

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

# proxy.ts

```ts
import { NextRequest, NextResponse } from 'next/server';

function isAuthEnabled(raw: string | undefined): boolean {
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export function proxy(request: NextRequest) {
  // Skip auth for shared plan routes and healthcheck
  if (
    request.nextUrl.pathname.startsWith('/shared/') ||
    request.nextUrl.pathname.startsWith('/api/shared/') ||
    request.nextUrl.pathname === '/api/health'
  ) {
    return NextResponse.next();
  }

  // API key auth for automation (crons, scripts)
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const headerKey = request.headers.get('x-api-key');
    const queryKey = request.nextUrl.searchParams.get('api_key');
    if (headerKey === apiKey || queryKey === apiKey) {
      return NextResponse.next();
    }
  }

  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  const authEnabled = isAuthEnabled(process.env.BASIC_AUTH_ENABLED);

  // Basic auth is opt-in. Keep app public by default unless explicitly enabled.
  if (!authEnabled || !user || !pass) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const [authUser, authPass] = decoded.split(':');
      if (authUser === user && authPass === pass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Marketing Tool"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

```

