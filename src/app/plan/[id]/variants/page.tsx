'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { PageSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import Link from 'next/link';
import { MarketingPlan } from '@/lib/types';
import { usePlan } from '@/hooks/usePlan';
import DismissableTip from '@/components/DismissableTip';

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
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="h-5 w-48 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="h-4 w-40 bg-slate-800 rounded" />
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-3 w-full bg-slate-800 rounded" />
              ))}
              <div className="h-4 w-3/4 bg-slate-800 rounded" />
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
        <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-400 mb-1">Variant {idx + 1}</div>
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
                    <span className="text-slate-400">{m.label}</span>
                    <span className="text-slate-200 tabular-nums">{value}/10</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${m.key === 'overall' ? 'bg-indigo-500' : 'bg-indigo-500/70'
                        }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 mb-1">Feedback</div>
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              {s.feedback || '—'}
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-1">Overall comparison</div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
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

  const { plan, loading: loadingPlan, error: fetchError, reload: loadFromDb } = usePlan(id);

  const [variants, setVariants] = useState<string[]>(['', '']);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const [result, setResult] = useState<ScoreVariantsResult | null>(null);

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
      <DismissableTip id="variants-tip">Generate multiple headline and hook variants, then score them side-by-side for clarity, emotion, urgency, and uniqueness — find your strongest angle before you go live.</DismissableTip>

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

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-sm font-semibold text-white">Copy variants</div>
            <div className="text-xs text-slate-400">One idea per field. Empty fields are ignored.</div>
          </div>
          <div className="text-xs text-slate-400 tabular-nums">{filledVariants.length}/5 ready</div>
        </div>

        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div key={idx} className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-400">Variant {idx + 1}</div>
                <button
                  onClick={() => {
                    setResult(null);
                    setVariants((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  disabled={variants.length <= 2}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${variants.length <= 2
                      ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800/50'
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
                className="w-full text-sm bg-transparent text-slate-100 placeholder:text-slate-500 outline-none resize-y"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => setVariants((prev) => (prev.length >= 5 ? prev : [...prev, '']))}
            disabled={variants.length >= 5}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${variants.length >= 5
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900/50 border border-slate-700 text-slate-200 hover:bg-slate-800/50'
              }`}
          >
            + Add Variant
          </button>

          <button
            onClick={onScore}
            disabled={!canScore || scoring}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${!canScore || scoring
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
          >
            {scoring ? 'Scoring…' : 'Score Variants'}
          </button>

          {result && (
            <button
              onClick={() => setResult(null)}
              className="text-sm px-4 py-2 rounded-lg transition-colors font-medium bg-slate-900/50 border border-slate-700 text-slate-200 hover:bg-slate-800/50"
            >
              Clear Results
            </button>
          )}
        </div>

        {!canScore && (
          <div className="mt-4 text-xs text-slate-400">
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
              <div className="text-xs text-slate-400">Winner chosen by strongest overall score.</div>
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
