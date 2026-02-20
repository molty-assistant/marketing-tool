'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { PageSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import Link from 'next/link';
import { MarketingPlan } from '@/lib/types';

type VariantScore = {
  text: string;
  clarity: number;
  emotion: number;
  urgency: number;
  uniqueness: number;
  overall: number;
  feedback: string;
};

type ScoreVariantsResult = {
  scores: VariantScore[];
  winner: number;
};

const METRICS: Array<{ key: keyof Omit<VariantScore, 'text' | 'feedback'>; label: string }> = [
  { key: 'clarity', label: 'Clarity' },
  { key: 'emotion', label: 'Emotion' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'uniqueness', label: 'Uniqueness' },
  { key: 'overall', label: 'Overall' },
];

function ScoreSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="h-5 w-48 bg-zinc-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="h-4 w-40 bg-zinc-800 rounded" />
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-3 w-full bg-zinc-800 rounded" />
              ))}
              <div className="h-4 w-3/4 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricBars({ scores, winner }: { scores: VariantScore[]; winner: number }) {
  const maxOverall = Math.max(...scores.map((s) => s.overall || 0), 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {scores.map((s, idx) => (
        <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <div className="text-xs text-zinc-400 mb-1">Variant {idx + 1}</div>
              <div className="text-sm text-white whitespace-pre-wrap break-words">{s.text}</div>
            </div>
            {winner === idx && (
              <div className="shrink-0 text-xs px-2 py-1 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-200">
                Winner
              </div>
            )}
          </div>

          <div className="space-y-2">
            {METRICS.map((m) => {
              const value = s[m.key] ?? 0;
              const width = Math.max(0, Math.min(100, (value / 10) * 100));
              return (
                <div key={m.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400">{m.label}</span>
                    <span className="text-zinc-200 tabular-nums">{value}/10</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        m.key === 'overall' ? 'bg-indigo-500' : 'bg-indigo-500/70'
                      }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Feedback</div>
            <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
              {s.feedback || '—'}
            </div>

            <div className="mt-4">
              <div className="text-xs text-zinc-400 mb-1">Overall comparison</div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-2.5 bg-indigo-500 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, (s.overall / maxOverall) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [variants, setVariants] = useState<string[]>(['', '']);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const [result, setResult] = useState<ScoreVariantsResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setLoadingPlan(false);
      } catch {
        loadFromDb();
      }
    } else {
      loadFromDb();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadFromDb = () => {
    setLoadingPlan(true);
    setFetchError('');
    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((data) => {
        setPlan(data);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setLoadingPlan(false));
  };

  const filledVariants = useMemo(
    () => variants.map((v) => v.trim()).filter((v) => v.length > 0),
    [variants]
  );

  const canScore = filledVariants.length >= 2 && filledVariants.length <= 5;

  const onScore = async () => {
    if (!canScore) return;

    setScoring(true);
    setScoreError('');

    try {
      const res = await fetch('/api/score-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id, variants: filledVariants }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to score variants');
      }
      if (!Array.isArray(data?.scores)) {
        throw new Error('Unexpected response shape');
      }
      setResult(data);
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Failed to score variants');
    } finally {
      setScoring(false);
    }
  };

  if (loadingPlan) return <PageSkeleton />;

  if (fetchError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={fetchError} onRetry={loadFromDb} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <p className="text-sm text-slate-500 mb-4">This plan may have been deleted or doesn&apos;t exist.</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Generate multiple headline and hook variants, then score them side-by-side for clarity, emotion, urgency, and uniqueness — find your strongest angle before you go live.
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-4 min-w-0 mb-2">
          {plan.config.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white break-words">🏆 Variants: {plan.config.app_name}</h1>
            <p className="text-slate-400 break-words">Paste 2–5 copy variants and score them side-by-side.</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-sm font-semibold text-white">Copy variants</div>
            <div className="text-xs text-zinc-400">One idea per field. Empty fields are ignored.</div>
          </div>
          <div className="text-xs text-zinc-400 tabular-nums">{filledVariants.length}/5 ready</div>
        </div>

        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div key={idx} className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-zinc-400">Variant {idx + 1}</div>
                <button
                  onClick={() => {
                    setResult(null);
                    setVariants((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  disabled={variants.length <= 2}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                    variants.length <= 2
                      ? 'border-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  Remove
                </button>
              </div>
              <textarea
                value={v}
                onChange={(e) => {
                  setResult(null);
                  setVariants((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)));
                }}
                placeholder="Paste copy here…"
                rows={3}
                className="w-full text-sm bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none resize-y"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => setVariants((prev) => (prev.length >= 5 ? prev : [...prev, '']))}
            disabled={variants.length >= 5}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${
              variants.length >= 5
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-zinc-900/50 border border-zinc-700 text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            + Add Variant
          </button>

          <button
            onClick={onScore}
            disabled={!canScore || scoring}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${
              !canScore || scoring
                ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {scoring ? 'Scoring…' : 'Score Variants'}
          </button>

          {result && (
            <button
              onClick={() => setResult(null)}
              className="text-sm px-4 py-2 rounded-lg transition-colors font-medium bg-zinc-900/50 border border-zinc-700 text-zinc-200 hover:bg-zinc-800/50"
            >
              Clear Results
            </button>
          )}
        </div>

        {!canScore && (
          <div className="mt-4 text-xs text-zinc-400">
            Add at least 2 non-empty variants (up to 5) to score.
          </div>
        )}

        {scoreError && (
          <div className="mt-4 bg-red-950/30 border border-red-900/60 rounded-xl p-4 text-sm text-red-200">
            {scoreError}
          </div>
        )}
      </div>

      {scoring && <ScoreSkeleton />}

      {!scoring && result && result.scores?.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Scores</div>
              <div className="text-xs text-zinc-400">Winner chosen by strongest overall score.</div>
            </div>
            {typeof result.winner === 'number' && result.winner >= 0 && result.winner < result.scores.length && (
              <div className="text-xs px-3 py-1.5 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-200">
                Winner: Variant {result.winner + 1}
              </div>
            )}
          </div>

          <MetricBars scores={result.scores} winner={result.winner} />
        </div>
      )}
    </div>
  );
}
