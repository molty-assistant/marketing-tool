'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import ErrorRetry from '@/components/ErrorRetry';
import { DraftSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

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
        <span key={i} className={i < r ? 'text-blue-300' : 'text-zinc-700'}>
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
        : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {s}
    </span>
  );
}

function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800/70 ${className}`} />;
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
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

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');

  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState<number | null>(null);

  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [sentiment, setSentiment] = useState<Sentiment | null>(null);

  const { success: toastOk, error: toastErr } = useToast();

  const loadPlan = () => {
    setPlanLoading(true);
    setPlanError('');

    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch {
        // fall through
      }
    }

    fetch(`/api/plans/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load plan');
        return r.json();
      })
      .then((d) => {
        setPlan(d);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(d));
      })
      .catch((e) => setPlanError(e instanceof Error ? e.message : 'Failed to load plan'))
      .finally(() => setPlanLoading(false));
  };

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

  useEffect(() => {
    loadPlan();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="text-zinc-400 mb-4">Plan not found</div>
        <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Monitor your App Store reviews, analyse sentiment trends, and surface the most common user themes — so you know what&apos;s working and what to fix next.
      </div>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">⭐ Review Monitoring</h1>
          <p className="text-zinc-400">Scrape App Store reviews and extract themes &amp; sentiment for {plan.config.app_name}</p>
        </div>
      </div>

      <section className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">📥 Load reviews</h2>
            <p className="text-sm text-zinc-500">Paste an App Store URL. We’ll attempt direct scraping, with research fallback if needed.</p>
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
              className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/60 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors border border-zinc-700"
            >
              {analyzing ? 'Analyzing…' : 'Analyze Sentiment'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="text-xs text-zinc-400">App Store URL</label>
            <input
              value={appStoreUrl}
              onChange={(e) => {
                setAppStoreUrl(e.target.value);
                persist({ appStoreUrl: e.target.value });
              }}
              placeholder="https://apps.apple.com/..."
              className="mt-1 w-full bg-zinc-950/40 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
            />
          </div>
          <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-2xl p-4">
            <div className="text-xs text-zinc-500">Quick stats</div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center justify-between"><span className="text-zinc-400">Loaded</span><span className="text-white font-semibold">{reviews.length}</span></div>
              <div className="flex items-center justify-between"><span className="text-zinc-400">Avg rating</span><span className="text-white font-semibold">{typeof averageRating === 'number' ? averageRating.toFixed(1) : ratingSummary?.toFixed(1) || '—'}</span></div>
              <div className="flex items-center justify-between"><span className="text-zinc-400">Total reviews</span><span className="text-white font-semibold">{typeof totalReviews === 'number' ? totalReviews.toLocaleString() : '—'}</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Reviews */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">🗣️ Reviews</h2>
            <div className="text-xs text-zinc-500">Showing up to 12</div>
          </div>

          {scraping ? (
            <ReviewsSkeleton />
          ) : !reviews.length ? (
            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-5 text-sm text-zinc-500">
              No reviews loaded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 12).map((rv, i) => (
                <div key={`${rv.author}-${rv.title}-${i}`} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-white font-semibold truncate">{rv.title || '(No title)'}</div>
                        <SentimentBadge rating={rv.rating} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                        <span className="text-zinc-300">{rv.author || 'Anonymous'}</span>
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

                  <div className="mt-3 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
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
            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-5 text-sm text-zinc-500">
              Run “Analyze Sentiment” after you’ve loaded reviews.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-2xl p-4">
                <div className="text-xs text-zinc-500">Overall sentiment</div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-200">Positive</span>
                    <span className="text-white font-semibold">{sentiment.sentiment.positive}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200">Neutral</span>
                    <span className="text-white font-semibold">{sentiment.sentiment.neutral}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rose-200">Negative</span>
                    <span className="text-white font-semibold">{sentiment.sentiment.negative}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-2xl p-4">
                <div className="text-xs text-zinc-500 mb-2">Themes</div>
                <div className="space-y-2">
                  {sentiment.themes?.length ? (
                    sentiment.themes.map((t, i) => {
                      const cls =
                        t.sentiment === 'positive'
                          ? 'border-emerald-800/40 text-emerald-200 bg-emerald-950/20'
                          : t.sentiment === 'negative'
                            ? 'border-rose-800/40 text-rose-200 bg-rose-950/20'
                            : 'border-zinc-700/60 text-zinc-200 bg-zinc-900/30';
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
                    <div className="text-sm text-zinc-500">No themes returned.</div>
                  )}
                </div>
              </div>

              <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-4">
                <div className="text-xs text-blue-200/80 mb-2">Summary</div>
                <div className="text-sm text-zinc-100 leading-relaxed">{sentiment.summary}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
