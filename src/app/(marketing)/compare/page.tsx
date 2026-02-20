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
        !line.startsWith('```') &&
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
