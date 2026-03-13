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
  if (!items?.length) return <span className="text-muted-foreground text-sm">—</span>;

  const icon = kind === 'bad' ? '❌' : kind === 'good' ? '✅' : '•';
  const color = kind === 'bad' ? 'text-red-200' : kind === 'good' ? 'text-emerald-200' : 'text-muted-foreground';

  return (
    <ul className={`space-y-1.5 text-sm ${color}`}>
      {items.slice(0, 8).map((it, i) => (
        <li key={`${it}-${i}`} className="flex items-start gap-2">
          <span className={kind === 'bad' ? 'text-red-400 mt-0.5 shrink-0' : kind === 'good' ? 'text-emerald-400 mt-0.5 shrink-0' : 'text-muted-foreground mt-0.5 shrink-0'}>
            {icon}
          </span>
          <span className="text-muted-foreground">{it}</span>
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
  return <span className={`${base} bg-card border-border text-muted-foreground`}>{text}</span>;
}

function isFreeish(pricing?: string) {
  const p = (pricing || '').toLowerCase();
  return p.includes('free') || p.includes('freemium');
}

function CompetitiveSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-60 bg-muted rounded mb-3" />
      <div className="h-4 w-full bg-muted rounded mb-6" />
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="h-12 bg-muted/40" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-card border-t border-border" />
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
        <div className="text-muted-foreground mb-4">Plan not found</div>
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
          <h1 className="text-2xl font-bold text-foreground break-words">🏆 Competitors</h1>
          <p className="text-muted-foreground break-words">
            Side-by-side comparison for <span className="text-muted-foreground font-semibold">{plan.config.app_name}</span>.
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
              className="bg-card hover:bg-muted/50 border border-border text-muted-foreground text-sm px-4 py-2.5 rounded-xl transition-colors"
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
        <section className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Comparison table</h2>
              <p className="text-sm text-muted-foreground">
                Scroll horizontally on mobile. Strengths are highlighted in green; weaknesses in red.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Showing {Math.min(cols.length, 6)} competitor{cols.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="min-w-[900px] w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-muted backdrop-blur border border-border rounded-tl-xl px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Feature / Aspect
                  </th>
                  <th className="bg-card border border-border px-4 py-3 text-left text-xs font-semibold text-foreground">
                    {plan.config.app_name} <span className="text-muted-foreground font-normal">(Our App)</span>
                  </th>
                  {cols.map((c, idx) => (
                    <th key={`${c.name}-${idx}`} className="bg-card border border-border px-4 py-3 text-left text-xs font-semibold text-foreground">
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
                  <td className="sticky left-0 z-10 bg-muted backdrop-blur border border-border px-4 py-4 text-sm font-semibold text-muted-foreground">
                    Pricing
                  </td>
                  <td className="border border-border px-4 py-4 align-top">
                    {ourPricing ? (
                      <PricingBadge
                        text={ourPricing}
                        highlight={ourFree && !anyCompetitorFree ? 'good' : !ourFree && anyCompetitorFree ? 'bad' : undefined}
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  {cols.map((c, idx) => (
                    <td key={`pricing-${idx}`} className="border border-border px-4 py-4 align-top">
                      {c.pricing ? (
                        <PricingBadge
                          text={c.pricing}
                          highlight={!ourFree && isFreeish(c.pricing) ? 'good' : ourFree && !isFreeish(c.pricing) ? 'bad' : undefined}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr>
                  <td className="sticky left-0 z-10 bg-muted backdrop-blur border border-border px-4 py-4 text-sm font-semibold text-muted-foreground">
                    Rating
                  </td>
                  <td className="border border-border px-4 py-4 align-top">
                    {ourRating !== null ? (
                      <div className="text-sm text-muted-foreground">
                        <span className="text-amber-300">★</span> {ourRating.toFixed(1)}
                        {typeof plan.scraped.ratingCount === 'number' && (
                          <span className="text-muted-foreground text-xs ml-2">({plan.scraped.ratingCount.toLocaleString()} ratings)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  {cols.map((_, idx) => (
                    <td key={`rating-${idx}`} className="border border-border px-4 py-4 align-top">
                      <span className="text-muted-foreground text-sm">—</span>
                    </td>
                  ))}
                </tr>

                {/* Key Features */}
                <tr>
                  <td className="sticky left-0 z-10 bg-muted backdrop-blur border border-border px-4 py-4 text-sm font-semibold text-muted-foreground">
                    Key Features
                  </td>
                  <td className="border border-border px-4 py-4 align-top">
                    <CellList items={ourFeatures} kind="good" />
                  </td>
                  {cols.map((c, idx) => (
                    <td key={`features-${idx}`} className="border border-border px-4 py-4 align-top">
                      <CellList items={c.keyMessaging || (c.positioning ? [c.positioning] : [])} kind="good" />
                    </td>
                  ))}
                </tr>

                {/* Strengths */}
                <tr>
                  <td className="sticky left-0 z-10 bg-muted backdrop-blur border border-border px-4 py-4 text-sm font-semibold text-muted-foreground">
                    Strengths
                  </td>
                  <td className="border border-border px-4 py-4 align-top">
                    <CellList items={plan.config.differentiators || []} kind="good" />
                  </td>
                  {cols.map((c, idx) => (
                    <td key={`strengths-${idx}`} className="border border-border px-4 py-4 align-top">
                      <CellList items={c.strengths || []} kind="good" />
                    </td>
                  ))}
                </tr>

                {/* Weaknesses */}
                <tr>
                  <td className="sticky left-0 z-10 bg-muted backdrop-blur border border-border rounded-bl-xl px-4 py-4 text-sm font-semibold text-muted-foreground">
                    Weaknesses
                  </td>
                  <td className="border border-border px-4 py-4 align-top">
                    <span className="text-muted-foreground text-sm">—</span>
                  </td>
                  {cols.map((c, idx) => (
                    <td key={`weaknesses-${idx}`} className="border border-border px-4 py-4 align-top">
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
                <div className="bg-card border border-indigo-900/40 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-indigo-200 mb-2">💡 Opportunities</div>
                  <ul className="space-y-2">
                    {competitive.opportunities.slice(0, 8).map((o, i) => (
                      <li key={`${o}-${i}`} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {competitive?.gaps?.length ? (
                <div className="bg-card border border-blue-900/40 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-blue-200 mb-2">🔍 Gaps</div>
                  <ul className="space-y-2">
                    {competitive.gaps.slice(0, 8).map((g, i) => (
                      <li key={`${g}-${i}`} className="text-sm text-muted-foreground flex items-start gap-2">
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
        <div className="text-center py-14 text-muted-foreground">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-sm">No competitor comparison yet. Click <span className="text-muted-foreground font-medium">Analyze</span> to generate one.</p>
        </div>
      )}

      <div className="mt-10 text-center">
        <div className="inline-flex gap-3">
          <a
            href={`/plan/${id}`}
            className="bg-muted hover:bg-muted text-foreground text-sm px-5 py-2.5 rounded-lg transition-colors"
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
