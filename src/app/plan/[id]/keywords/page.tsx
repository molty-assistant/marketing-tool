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
