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
