'use client';

import { useState, useEffect, use } from 'react';
import { MarketingPlan } from '@/lib/types';

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
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-3 text-slate-400 font-medium">Keyword</th>
              <th className="text-right py-3 px-3 text-slate-400 font-medium">Volume</th>
              <th className="text-center py-3 px-3 text-slate-400 font-medium">Difficulty</th>
              <th className="text-center py-3 px-3 text-slate-400 font-medium">Relevance</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw, i) => (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="py-3 px-3 text-white">{kw.keyword}</td>
                <td className="py-3 px-3 text-right text-slate-300">
                  {(kw.volume ?? 0).toLocaleString()}
                </td>
                <td className="py-3 px-3 text-center">
                  <DifficultyBadge value={kw.difficulty ?? 0} />
                </td>
                <td className="py-3 px-3 text-center">
                  <RelevanceBadge value={kw.relevance ?? 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="h-5 bg-slate-700 rounded w-48 mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 mb-3">
            <div className="h-4 bg-slate-700 rounded flex-1" />
            <div className="h-4 bg-slate-700 rounded w-16" />
            <div className="h-4 bg-slate-700 rounded w-20" />
            <div className="h-4 bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>
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
  }, [id]);

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
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
          Discover high-value ASO keywords for your app — filter by search volume, difficulty score, and relevance to find the terms that will boost your store ranking.
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold mb-2">🔑 Keyword Research</h1>
            {data && isCached && (
              <span className="text-xs text-slate-500">Cached · Re-run research to refresh</span>
            )}
          </div>
          <p className="text-slate-400">
            Discover high-value ASO/SEO keywords for{' '}
            <span className="text-white font-medium">{appName || 'your app'}</span>.
          </p>
        </div>

        {planLoading ? (
          <Skeleton />
        ) : (
          <>
            {!data && !loading && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400 mb-4">
                  Click below to research relevant keywords using AI-powered analysis.
                </p>
                <button
                  onClick={runResearch}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                >
                  Research Keywords
                </button>
              </div>
            )}

            {loading && <Skeleton />}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 mb-4">
                {error}
              </div>
            )}

            {data && (
              <div className="space-y-6">
                <KeywordTable keywords={data.keywords} title="🎯 Primary Keywords" />
                <KeywordTable keywords={data.longTail} title="🔗 Long-Tail Keywords" />

                {data.suggestions && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-3">💡 Strategy Suggestions</h2>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{data.suggestions}</p>
                  </div>
                )}

                <div className="text-center">
                  <button
                    onClick={runResearch}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Re-run Research
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
