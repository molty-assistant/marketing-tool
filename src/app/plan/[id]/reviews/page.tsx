'use client';

import { use, useEffect, useMemo, useState } from 'react';
import PlanNav from '@/components/PlanNav';
import { useToast } from '@/components/Toast';

type Review = { author: string; rating: number; title: string; body: string; date: string };
type ReviewsData = { appStoreUrl: string; fetchedAt: string; items: Review[] };
type Sentiment = {
  overallScore: number;
  summary: string;
  topPraiseThemes: { theme: string; evidence: string[] }[];
  topComplaintThemes: { theme: string; evidence: string[] }[];
  suggestedImprovements: { title: string; description: string; priority: string }[];
  analysedAt?: string;
};
type Plan = {
  id: string;
  config?: { app_name?: string; app_url?: string };
  scraped?: { url?: string };
  content?: { reviews?: ReviewsData; reviewSentiment?: Sentiment };
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function ReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    fetch(`/api/plans/${id}`).then(r => r.json()).then(p => {
      setPlan(p);
      setUrl(p?.content?.reviews?.appStoreUrl || p?.config?.app_url || p?.scraped?.url || '');
    }).catch(() => setPlan(null)).finally(() => setLoading(false));
  }, [id]);

  const reviews = plan?.content?.reviews?.items ?? [];
  const sentiment = plan?.content?.reviewSentiment ?? null;

  const counts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    for (const r of reviews) c[clamp(Math.round(r.rating), 1, 5)]++;
    return c;
  }, [reviews]);
  const maxCount = Math.max(1, ...Object.values(counts));

  const run = async () => {
    if (!url) { toast.error('Paste an App Store URL first.'); return; }
    setFetching(true);
    try {
      const sr = await fetch('/api/scrape-reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: id, appStoreUrl: url }) });
      const sd = await sr.json();
      if (!sr.ok) throw new Error(sd?.error || 'Scrape failed');

      const ar = await fetch('/api/review-sentiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: id, reviews: sd.reviews.items }) });
      const ad = await ar.json();
      if (!ar.ok) throw new Error(ad?.error || 'Analysis failed');

      const pr = await fetch(`/api/plans/${id}`);
      setPlan(await pr.json());
      toast.success('Reviews scraped + sentiment analysed.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setFetching(false); }
  };

  if (loading) return <div className="max-w-4xl mx-auto py-10"><div className="h-10 bg-slate-800 rounded animate-pulse" /></div>;
  if (!plan) return <div className="max-w-4xl mx-auto py-20 text-center text-slate-400">Plan not found</div>;

  const score = clamp(Number(sentiment?.overallScore) || 0, 0, 100);

  return (
    <div className="max-w-4xl mx-auto">
      <PlanNav planId={id} appName={plan.config?.app_name} />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reviews</h1>
          <p className="text-slate-400 text-sm">Scrape App Store reviews and analyse sentiment.</p>
        </div>
        <button onClick={run} disabled={fetching} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          {fetching ? 'Working…' : 'Fetch + analyse'}
        </button>
      </div>

      {/* URL input */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <label className="block text-sm font-medium text-slate-200 mb-2">App Store URL</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://apps.apple.com/gb/app/.../id1234567890" className="flex-1 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500" />
          <button onClick={run} disabled={fetching} className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">{fetching ? '…' : 'Run'}</button>
        </div>
        {plan.content?.reviews?.fetchedAt && <div className="text-xs text-slate-500 mt-2">Last fetched: {fmtDate(plan.content.reviews.fetchedAt)} · {reviews.length} reviews</div>}
      </div>

      {/* Sentiment + Ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Sentiment</h2>
          {sentiment ? (<>
            <div className="flex items-end gap-3 mb-3"><div className="text-4xl font-bold text-white">{score}</div><div className="text-sm text-slate-400 mb-1">/ 100</div></div>
            <div className="h-2.5 bg-slate-900/60 border border-slate-700 rounded-full overflow-hidden mb-4"><div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: `${score}%` }} /></div>
            <p className="text-slate-300 text-sm leading-relaxed">{sentiment.summary}</p>
          </>) : <div className="text-sm text-slate-500">No analysis yet. Click &ldquo;Fetch + analyse&rdquo;.</div>}
        </div>

        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Ratings distribution</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(star => (
              <div key={star} className="flex items-center gap-3">
                <div className="w-10 text-sm text-slate-400">{star}★</div>
                <div className="flex-1 h-3 bg-slate-900/60 border border-slate-700 rounded overflow-hidden"><div className="h-full bg-indigo-500/80" style={{ width: `${Math.round((counts[star] / maxCount) * 100)}%` }} /></div>
                <div className="w-12 text-right text-sm text-slate-400 tabular-nums">{counts[star]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Themes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {[{ title: 'Top praise themes', data: sentiment?.topPraiseThemes, color: 'text-green-300' },
          { title: 'Top complaint themes', data: sentiment?.topComplaintThemes, color: 'text-red-300' }].map(sec => (
          <div key={sec.title} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white mb-3">{sec.title}</h2>
            {sec.data?.length ? <div className="space-y-3">{sec.data.slice(0, 5).map((t, i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                <div className={`text-sm font-semibold ${sec.color}`}>{t.theme}</div>
                {t.evidence?.length ? <ul className="mt-2 text-sm list-disc pl-5 space-y-1">{t.evidence.slice(0, 3).map((q, j) => <li key={j} className="text-slate-300">&ldquo;{q}&rdquo;</li>)}</ul> : null}
              </div>
            ))}</div> : <div className="text-sm text-slate-500">No data yet.</div>}
          </div>
        ))}
      </div>

      {/* Improvements */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Suggested improvements</h2>
        {sentiment?.suggestedImprovements?.length ? <div className="space-y-3">{sentiment.suggestedImprovements.slice(0, 8).map((s, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-indigo-200">{s.title}</div>
              <span className={`text-xs px-2 py-1 rounded-full border ${s.priority === 'high' ? 'bg-red-500/10 text-red-300 border-red-500/30' : s.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' : 'bg-slate-500/10 text-slate-300 border-slate-500/30'}`}>{s.priority}</span>
            </div>
            <div className="text-sm text-slate-300 mt-2">{s.description}</div>
          </div>
        ))}</div> : <div className="text-sm text-slate-500">No data yet.</div>}
      </div>

      {/* Reviews list */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Latest reviews</h2>
          <span className="text-sm text-slate-500">{reviews.length}</span>
        </div>
        {reviews.length ? <div className="divide-y divide-slate-700/40">{reviews.slice(0, 50).map((r, i) => (
          <div key={i} className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="text-sm text-slate-200 font-medium">{r.title || 'Untitled'}<span className="text-slate-500 font-normal"> · {r.author}</span></div>
              <div className="text-sm text-slate-400 tabular-nums">{'★'.repeat(clamp(r.rating, 1, 5))}<span className="text-slate-700">{'★'.repeat(5 - clamp(r.rating, 1, 5))}</span><span className="ml-2 text-xs text-slate-500">{fmtDate(r.date)}</span></div>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{r.body}</div>
          </div>
        ))}</div> : <div className="p-5 text-sm text-slate-500">No reviews scraped yet.</div>}
      </div>
    </div>
  );
}
