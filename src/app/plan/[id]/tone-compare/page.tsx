'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import { DraftSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

type DraftSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets'
  | 'landing_page_hero';

const SECTION_OPTIONS: {
  key: DraftSection;
  label: string;
  help: string;
}[] = [
  {
    key: 'app_store_description',
    label: 'App Store description',
    help: 'Full description for the store listing.',
  },
  {
    key: 'short_description',
    label: 'Short description',
    help: 'A concise store-friendly tagline.',
  },
  {
    key: 'keywords',
    label: 'Keywords',
    help: 'Comma-separated keywords for ASO.',
  },
  {
    key: 'whats_new',
    label: "What's New",
    help: 'Release notes / update text.',
  },
  {
    key: 'feature_bullets',
    label: 'Feature bullets',
    help: 'A bullet list of benefits/features.',
  },
  {
    key: 'landing_page_hero',
    label: 'Landing page hero copy',
    help: 'Headline, subheadline, and CTA.',
  },
];

const TONE_OPTIONS: { value: Tone; label: string; help: string; sample: string }[] = [
  {
    value: 'professional',
    label: 'Professional',
    help: 'Clear, credible, polished.',
    sample: '"Designed for teams who demand reliability — at every scale."',
  },
  {
    value: 'casual',
    label: 'Casual',
    help: 'Friendly, conversational.',
    sample: '"Honestly? It just works. And it\'s kind of amazing."',
  },
  {
    value: 'bold',
    label: 'Bold',
    help: 'Punchy, energetic, confident.',
    sample: '"Stop settling. Start winning. Your competitors already did."',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    help: 'Short, tight, no fluff.',
    sample: '"Fast. Simple. Done."',
  },
];

function sectionToMeta(section: DraftSection) {
  return SECTION_OPTIONS.find((s) => s.key === section);
}

function toneToMeta(tone: Tone) {
  return TONE_OPTIONS.find((t) => t.value === tone);
}

export default function ToneComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);

  const [section, setSection] = useState<DraftSection>('app_store_description');
  const [toneA, setToneA] = useState<Tone>('professional');
  const [toneB, setToneB] = useState<Tone>('casual');

  const [resultA, setResultA] = useState('');
  const [resultB, setResultB] = useState('');

  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');
  const [errorA, setErrorA] = useState('');
  const [errorB, setErrorB] = useState('');

  const { success: toastSuccess, error: toastError } = useToast();

  const storageKey = useMemo(() => `tone-compare-${id}`, [id]);

  const loadPlan = useCallback(() => {
    setPlanLoading(true);
    setPlanError('');
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch {
        /* fall through */
      }
    }
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
        setPlanError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setPlanLoading(false));
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlan();
  }, [loadPlan]);

  // Restore last selections per plan
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        section: DraftSection;
        toneA: Tone;
        toneB: Tone;
      }>;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (parsed.section) setSection(parsed.section);
      if (parsed.toneA) setToneA(parsed.toneA);
      if (parsed.toneB) setToneB(parsed.toneB);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // Persist selections per plan
  useEffect(() => {
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ section, toneA, toneB })
      );
    } catch {
      /* ignore */
    }
  }, [storageKey, section, toneA, toneB]);

  const generateOne = async (tone: Tone) => {
    const res = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: id,
        sections: [section],
        tone,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to generate draft');

    return data as { draft: Record<string, string> };
  };

  const handleGenerate = async () => {
    setErrorA('');
    setErrorB('');

    setLoadingA(true);
    setLoadingB(true);

    const [a, b] = await Promise.allSettled([
      generateOne(toneA),
      generateOne(toneB),
    ]);

    if (a.status === 'fulfilled') {
      const next = a.value.draft?.[section];
      setResultA(typeof next === 'string' ? next : '');
    } else {
      const msg = a.reason instanceof Error ? a.reason.message : 'Failed to generate';
      setErrorA(msg);
      toastError(msg);
    }

    if (b.status === 'fulfilled') {
      const next = b.value.draft?.[section];
      setResultB(typeof next === 'string' ? next : '');
    } else {
      const msg = b.reason instanceof Error ? b.reason.message : 'Failed to generate';
      setErrorB(msg);
      toastError(msg);
    }

    setLoadingA(false);
    setLoadingB(false);

    if (a.status === 'fulfilled' && b.status === 'fulfilled') {
      toastSuccess('Generated both tones');
    }
  };

  const sectionMeta = sectionToMeta(section);

  if (planLoading) {
    return <DraftSkeleton />;
  }

  if (planError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link
          href="/"
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Generate the <span className="text-slate-200 font-medium">same section</span> in two tones side-by-side. Useful for quick tone checks before you commit.
      </div>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">🌓 Tone Compare</h1>
          <p className="text-slate-400">{plan.config.app_name} — Compare tone A vs tone B</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={loadingA || loadingB}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loadingA || loadingB ? 'Generating…' : '✨ Generate'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Section</h2>
            <div className="space-y-2">
              {SECTION_OPTIONS.map((s) => {
                const active = s.key === section;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSection(s.key)}
                    className={`w-full text-left border rounded-xl px-4 py-3 transition-colors ${
                      active
                        ? 'bg-indigo-600/20 border-indigo-500/50'
                        : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40'
                    }`}
                  >
                    <div className="text-sm text-white">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.help}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Tone A</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setToneA(t.value)}
                  className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                    toneA === t.value
                      ? 'bg-indigo-600/20 border-indigo-500/50'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40'
                  }`}
                >
                  <div className="text-sm text-white">{t.label}</div>
                  <div className="text-xs text-slate-500">{t.help}</div>
                  <div className="text-xs italic text-slate-400 mt-0.5">{t.sample}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Tone B</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setToneB(t.value)}
                  className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                    toneB === t.value
                      ? 'bg-indigo-600/20 border-indigo-500/50'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40'
                  }`}
                >
                  <div className="text-sm text-white">{t.label}</div>
                  <div className="text-xs text-slate-500">{t.help}</div>
                  <div className="text-xs italic text-slate-400 mt-0.5">{t.sample}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {sectionMeta && (
          <div className="mt-4 text-xs text-slate-500">
            Comparing: <span className="text-slate-300">{sectionMeta.label}</span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden border bg-slate-800/30 border-slate-700/60">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/40">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">
                Tone A: {toneToMeta(toneA)?.label || toneA}
              </div>
              <div className="text-xs text-slate-500">{toneToMeta(toneA)?.help}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => {
                  if (!resultA.trim()) return;
                  await navigator.clipboard.writeText(resultA);
                }}
                disabled={!resultA.trim() || loadingA}
                className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                📋 Copy
              </button>
            </div>
          </div>

          {errorA && (
            <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-3 text-red-400 text-sm">
              {errorA}
            </div>
          )}

          <div className="p-4">
            <textarea
              value={loadingA ? 'Generating…' : resultA}
              onChange={(e) => setResultA(e.target.value)}
              placeholder="Not generated yet…"
              className="w-full min-h-[220px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border bg-slate-800/30 border-slate-700/60">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/40">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">
                Tone B: {toneToMeta(toneB)?.label || toneB}
              </div>
              <div className="text-xs text-slate-500">{toneToMeta(toneB)?.help}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => {
                  if (!resultB.trim()) return;
                  await navigator.clipboard.writeText(resultB);
                }}
                disabled={!resultB.trim() || loadingB}
                className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                📋 Copy
              </button>
            </div>
          </div>

          {errorB && (
            <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-3 text-red-400 text-sm">
              {errorB}
            </div>
          )}

          <div className="p-4">
            <textarea
              value={loadingB ? 'Generating…' : resultB}
              onChange={(e) => setResultB(e.target.value)}
              placeholder="Not generated yet…"
              className="w-full min-h-[220px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Tip: Keep the section fixed, then swap tones to quickly judge voice.
      </div>
    </div>
  );
}
