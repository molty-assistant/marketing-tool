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
