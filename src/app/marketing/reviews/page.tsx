'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';

type Review = {
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
};

type Analysis = {
  overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  summary: string;
  themes: { praise: string[]; complaints: string[] };
  improvementSuggestions: Array<{ title: string; details: string; impact: 'high' | 'medium' | 'low' }>;
};

function stars(rating: number) {
  const full = '★'.repeat(Math.max(0, Math.min(5, Math.round(rating))));
  const empty = '☆'.repeat(Math.max(0, 5 - full.length));
  return full + empty;
}

export default function ReviewsPage() {
  const [appId, setAppId] = useState('');
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsError, setReviewsError] = useState('');

  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  const { error: toastError, success: toastSuccess } = useToast();

  const canAnalyse = reviews.length > 0 && !loadingReviews;

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
  }, [reviews]);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    setReviewsError('');
    setAnalysis(null);
    setAnalysisError('');

    try {
      const res = await fetch('/api/scrape-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: appId.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch reviews');

      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      toastSuccess('Fetched reviews');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch reviews';
      setReviewsError(msg);
      toastError(msg);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const analyseSentiment = async () => {
    setLoadingAnalysis(true);
    setAnalysis(null);
    setAnalysisError('');

    try {
      const res = await fetch('/api/review-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to analyse sentiment');

      setAnalysis(data?.analysis ?? null);
      toastSuccess('Analysis complete');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyse sentiment';
      setAnalysisError(msg);
      toastError(msg);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">⭐ Review Monitoring</h1>
          <p className="text-slate-400">Fetch the most recent App Store reviews, then run sentiment + themes analysis.</p>
        </div>
        <a href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">← Dashboard</a>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">App Store iTunes App ID</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder='e.g. "6748341779"'
            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={fetchReviews}
            disabled={!appId.trim() || loadingReviews}
            className="bg-indigo-600 disabled:opacity-50 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
          >
            {loadingReviews ? 'Fetching…' : 'Fetch Reviews'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Uses <span className="font-mono">itunes.apple.com/gb/rss/customerreviews</span> (most recent).
        </p>
        {reviewsError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mt-4 text-red-400 text-sm">{reviewsError}</div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Latest reviews</h2>
              <p className="text-sm text-slate-400">
                {reviews.length} review{reviews.length !== 1 ? 's' : ''} • Avg rating {averageRating.toFixed(1)} / 5
              </p>
            </div>
            <button
              onClick={analyseSentiment}
              disabled={!canAnalyse || loadingAnalysis}
              className="bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
            >
              {loadingAnalysis ? 'Analysing…' : 'Analyse Sentiment'}
            </button>
          </div>

          <div className="space-y-3">
            {reviews.map((r, idx) => (
              <div key={`${r.author}-${r.date}-${idx}`} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="text-white font-semibold">{r.title}</div>
                  <div className="text-amber-400 text-sm" aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</div>
                </div>
                <div className="text-xs text-slate-500 mb-3">
                  {r.author ? `by ${r.author}` : 'Anonymous'}
                  {r.date ? ` • ${new Date(r.date).toLocaleString('en-GB')}` : ''}
                </div>
                <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{r.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysisError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">{analysisError}</div>
      )}

      {analysis && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-white">Sentiment analysis</h2>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full">
              Overall: {analysis.overallSentiment}
            </span>
          </div>

          <p className="text-slate-200 text-sm leading-relaxed mb-5">{analysis.summary}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4">
              <div className="font-semibold text-white mb-2">Praise themes</div>
              <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                {analysis.themes?.praise?.length
                  ? analysis.themes.praise.map((t, i) => <li key={i}>{t}</li>)
                  : <li className="list-none text-slate-500">None detected</li>}
              </ul>
            </div>
            <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4">
              <div className="font-semibold text-white mb-2">Complaint themes</div>
              <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                {analysis.themes?.complaints?.length
                  ? analysis.themes.complaints.map((t, i) => <li key={i}>{t}</li>)
                  : <li className="list-none text-slate-500">None detected</li>}
              </ul>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4">
            <div className="font-semibold text-white mb-3">Improvement suggestions</div>
            {analysis.improvementSuggestions?.length ? (
              <div className="space-y-3">
                {analysis.improvementSuggestions.map((s, i) => (
                  <div key={i} className="border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-white font-semibold">{s.title}</div>
                      <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full">impact: {s.impact}</span>
                    </div>
                    <div className="text-sm text-slate-300">{s.details}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No suggestions returned.</p>
            )}
          </div>
        </div>
      )}

      {reviews.length === 0 && !loadingReviews && (
        <div className="text-center py-10 text-slate-500 text-sm">Enter an App Store app id to load reviews.</div>
      )}
    </div>
  );
}
