'use client';

import { useState, useEffect, useMemo, use } from 'react';
import PlanNav from '@/components/PlanNav';

interface Keyword {
  keyword: string;
  searchVolume: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  relevance: number;
}

interface KeywordData {
  primaryKeywords: Keyword[];
  longTailKeywords: Keyword[];
  generatedAt: string;
}

type SortKey = 'keyword' | 'searchVolume' | 'difficulty' | 'relevance';
type SortDir = 'asc' | 'desc';

const VOLUME_ORDER = { high: 3, medium: 2, low: 1 };
const DIFF_ORDER = { hard: 3, medium: 2, easy: 1 };

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[difficulty] || colors.medium}`}>
      {difficulty}
    </span>
  );
}

function VolumeBadge({ volume }: { volume: string }) {
  const colors: Record<string, string> = {
    high: 'bg-indigo-500/20 text-indigo-400',
    medium: 'bg-slate-500/20 text-slate-300',
    low: 'bg-slate-700/20 text-slate-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[volume] || colors.medium}`}>
      {volume}
    </span>
  );
}

function sortKeywords(keywords: Keyword[], sortKey: SortKey, sortDir: SortDir): Keyword[] {
  return [...keywords].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'keyword':
        cmp = a.keyword.localeCompare(b.keyword);
        break;
      case 'searchVolume':
        cmp = (VOLUME_ORDER[a.searchVolume] || 0) - (VOLUME_ORDER[b.searchVolume] || 0);
        break;
      case 'difficulty':
        cmp = (DIFF_ORDER[a.difficulty] || 0) - (DIFF_ORDER[b.difficulty] || 0);
        break;
      case 'relevance':
        cmp = a.relevance - b.relevance;
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

function KeywordTable({
  keywords,
  title,
  selected,
  onToggle,
}: {
  keywords: Keyword[];
  title: string;
  selected: Set<string>;
  onToggle: (kw: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('relevance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => sortKeywords(keywords, sortKey, sortDir), [keywords, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 text-slate-400 text-left">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={keywords.every(k => selected.has(k.keyword))}
                  onChange={() => {
                    const allSelected = keywords.every(k => selected.has(k.keyword));
                    keywords.forEach(k => {
                      if (allSelected) onToggle(k.keyword);
                      else if (!selected.has(k.keyword)) onToggle(k.keyword);
                    });
                  }}
                  className="rounded border-slate-600"
                />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('keyword')}>
                Keyword{arrow('keyword')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('searchVolume')}>
                Volume{arrow('searchVolume')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('difficulty')}>
                Difficulty{arrow('difficulty')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('relevance')}>
                Relevance{arrow('relevance')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((kw) => (
              <tr
                key={kw.keyword}
                className={`border-t border-slate-700/50 transition-colors ${
                  selected.has(kw.keyword) ? 'bg-indigo-500/10' : 'hover:bg-slate-800/40'
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(kw.keyword)}
                    onChange={() => onToggle(kw.keyword)}
                    className="rounded border-slate-600"
                  />
                </td>
                <td className="px-4 py-3 text-white font-medium">{kw.keyword}</td>
                <td className="px-4 py-3"><VolumeBadge volume={kw.searchVolume} /></td>
                <td className="px-4 py-3"><DifficultyBadge difficulty={kw.difficulty} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${kw.relevance * 10}%` }}
                      />
                    </div>
                    <span className="text-slate-400 text-xs">{kw.relevance}/10</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function KeywordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<KeywordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [appName, setAppName] = useState('');

  useEffect(() => {
    // Load existing keywords from plan
    setLoading(true);
    fetch(`/api/plans/${id}`)
      .then(r => r.json())
      .then(plan => {
        setAppName(plan?.config?.app_name || '');
        const stages = plan?.stages || {};
        if (stages.keywords) {
          setData(stages.keywords as KeywordData);
          // Select all by default
          const all = new Set<string>();
          (stages.keywords as KeywordData).primaryKeywords.forEach((k: Keyword) => all.add(k.keyword));
          (stages.keywords as KeywordData).longTailKeywords.forEach((k: Keyword) => all.add(k.keyword));
          setSelected(all);
        }
      })
      .catch(() => setError('Failed to load plan'))
      .finally(() => setLoading(false));
  }, [id]);

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const resp = await fetch('/api/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Failed to generate keywords');
      setData(result.keywords);
      const all = new Set<string>();
      result.keywords.primaryKeywords.forEach((k: Keyword) => all.add(k.keyword));
      result.keywords.longTailKeywords.forEach((k: Keyword) => all.add(k.keyword));
      setSelected(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  function toggleKeyword(kw: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  }

  const selectedKeywordsStr = useMemo(() => {
    return Array.from(selected).join(',');
  }, [selected]);

  const charCount = selectedKeywordsStr.length;
  const isOverLimit = charCount > 100;

  function copyAll() {
    navigator.clipboard.writeText(selectedKeywordsStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 max-w-6xl mx-auto">
        <PlanNav planId={id} appName={appName} />
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="h-64 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-6xl mx-auto">
      <PlanNav planId={id} appName={appName} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🔑 Keyword Research</h1>
          <p className="text-slate-400 mt-1">
            Discover high-value keywords for App Store and SEO optimization
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Researching…
            </span>
          ) : data ? '🔄 Re-research' : '🔍 Research Keywords'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Copy bar */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300">
                App Store Keyword Field ({selected.size} selected)
              </h3>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-mono ${isOverLimit ? 'text-red-400' : 'text-slate-400'}`}>
                  {charCount}/100 characters
                </span>
                <button
                  onClick={copyAll}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                >
                  {copied ? '✓ Copied!' : '📋 Copy All'}
                </button>
              </div>
            </div>
            <div className={`text-xs font-mono p-3 rounded-lg break-all ${
              isOverLimit ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-slate-900 text-slate-400'
            }`}>
              {selectedKeywordsStr || 'Select keywords to build your keyword field'}
            </div>
            {isOverLimit && (
              <p className="text-red-400 text-xs mt-2">
                ⚠️ Over the 100 character limit. Deselect some keywords to fit.
              </p>
            )}
          </div>

          <div className="space-y-8">
            <KeywordTable
              keywords={data.primaryKeywords}
              title="🎯 Primary Keywords"
              selected={selected}
              onToggle={toggleKeyword}
            />
            <KeywordTable
              keywords={data.longTailKeywords}
              title="🔗 Long-Tail Keywords"
              selected={selected}
              onToggle={toggleKeyword}
            />
          </div>

          <p className="text-slate-500 text-xs mt-6 text-center">
            Generated {new Date(data.generatedAt).toLocaleString()} via Perplexity Sonar
          </p>
        </>
      )}

      {!data && !generating && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔑</div>
          <h2 className="text-xl font-semibold text-slate-300 mb-2">No keywords yet</h2>
          <p className="text-slate-500 mb-6">
            Click &quot;Research Keywords&quot; to discover high-value keywords for your app
          </p>
        </div>
      )}
    </div>
  );
}
