'use client';

import { useEffect, useState, use, useCallback } from 'react';
import type { MarketingPlan } from '@/lib/types';
import PlanNav from '@/components/PlanNav';
import { useToast } from '@/components/Toast';

interface VariantScore {
  variant: string;
  scores: {
    clarity: number;
    persuasion: number;
    seo_strength: number;
    emotional_appeal: number;
    overall: number;
  };
  reasoning: string;
}

interface ScoreResponse {
  results: VariantScore[];
  winner: number;
  winner_reasoning: string;
}

const SCORE_LABELS: { key: keyof VariantScore['scores']; label: string; color: string }[] = [
  { key: 'clarity', label: 'Clarity', color: 'bg-blue-500' },
  { key: 'persuasion', label: 'Persuasion', color: 'bg-purple-500' },
  { key: 'seo_strength', label: 'SEO Strength', color: 'bg-green-500' },
  { key: 'emotional_appeal', label: 'Emotional Appeal', color: 'bg-pink-500' },
  { key: 'overall', label: 'Overall', color: 'bg-amber-500' },
];

function ScoreBar({ value, color, max = 10 }: { value: number; color: string; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-300 w-6 text-right">{value}</span>
    </div>
  );
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function VariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [variants, setVariants] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scores, setScores] = useState<ScoreResponse | null>(null);
  const [error, setError] = useState('');
  const { error: toastError } = useToast();

  useEffect(() => {
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try { setPlan(JSON.parse(stored)); } catch { /* ignore */ }
    }
    fetch(`/api/plans/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load plan'))))
      .then((data) => {
        setPlan(data);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      })
      .catch((e) => toastError(e.message))
      .finally(() => setPlanLoading(false));
  }, [id, toastError]);

  const generateVariants = useCallback(async () => {
    if (!plan || generating) return;
    setGenerating(true);
    setError('');
    setScores(null);
    try {
      const description = plan.config?.one_liner || plan.config?.app_name || '';
      const context = [
        plan.config?.app_name,
        plan.config?.category,
        plan.config?.target_audience,
        plan.config?.one_liner,
      ].filter(Boolean).join('. ');

      const res = await fetch('/api/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description, context, count: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setVariants(data.variants);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  }, [plan, generating]);

  const scoreVariants = useCallback(async () => {
    if (variants.length === 0 || scoring) return;
    setScoring(true);
    setError('');
    try {
      const res = await fetch('/api/score-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id, variants }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to score');
      setScores(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setScoring(false);
    }
  }, [variants, scoring, id]);

  if (planLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {plan && <PlanNav planId={id} appName={plan.config?.app_name} />}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">A/B Copy Variant Scoring</h1>
            <p className="text-slate-400 text-sm mt-1">Generate variants and score them side-by-side</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateVariants}
              disabled={generating}
              className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {generating ? <><Spinner /> Generating…</> : '🔀 Generate Variants'}
            </button>
            {variants.length > 0 && (
              <button
                onClick={scoreVariants}
                disabled={scoring}
                className="text-sm bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {scoring ? <><Spinner /> Scoring…</> : '📊 Score Variants'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-900/30 border border-red-700/50 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Variants display */}
        {variants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {variants.map((v, i) => {
              const isWinner = scores ? scores.winner === i + 1 : false;
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                    isWinner
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                      : 'border-slate-700/30 bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isWinner
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {isWinner ? '🏆 Winner' : `Variant ${String.fromCharCode(65 + i)}`}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed flex-1">{v}</p>

                  {/* Scores for this variant */}
                  {scores?.results?.[i] && (
                    <div className="border-t border-slate-700/50 pt-3 mt-2 space-y-2">
                      {SCORE_LABELS.map(({ key, label, color }) => (
                        <div key={key}>
                          <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                            <span>{label}</span>
                          </div>
                          <ScoreBar value={scores.results[i].scores[key]} color={color} />
                        </div>
                      ))}
                      <p className="text-xs text-slate-400 mt-2 italic">{scores.results[i].reasoning}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Winner reasoning */}
        {scores && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-amber-300 mb-2">🏆 Recommended Winner: Variant {String.fromCharCode(64 + scores.winner)}</h3>
            <p className="text-sm text-slate-300">{scores.winner_reasoning}</p>
          </div>
        )}

        {variants.length === 0 && !generating && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg mb-2">No variants yet</p>
            <p className="text-sm">Click &quot;Generate Variants&quot; to create 3 copy variants with different tones</p>
          </div>
        )}
      </div>
    </div>
  );
}
