'use client';

import { useEffect, useMemo, useState, use } from 'react';
import type { MarketingPlan } from '@/lib/types';
import PlanNav from '@/components/PlanNav';
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

const TONE_OPTIONS: { value: Tone; label: string; help: string }[] = [
  { value: 'professional', label: 'Professional', help: 'Clear, credible, polished.' },
  { value: 'casual', label: 'Casual', help: 'Friendly, conversational.' },
  { value: 'bold', label: 'Bold', help: 'Punchy, energetic, confident.' },
  { value: 'minimal', label: 'Minimal', help: 'Short, tight, no fluff.' },
];

function sectionToTitle(section: DraftSection) {
  return SECTION_OPTIONS.find((s) => s.key === section)?.label || section;
}

export default function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);

  const [tone, setTone] = useState<Tone>('professional');
  const [selected, setSelected] = useState<Record<DraftSection, boolean>>({
    app_store_description: true,
    short_description: true,
    keywords: true,
    whats_new: true,
    feature_bullets: true,
    landing_page_hero: true,
  });

  const [draft, setDraft] = useState<Partial<Record<DraftSection, string>>>({});
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState<Partial<Record<DraftSection, boolean>>>({});
  const [copiedAll, setCopiedAll] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const loadPlan = () => {
    setPlanLoading(true);
    setPlanError('');
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch { /* fall through */ }
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
  };

  useEffect(() => {
    loadPlan();
  }, [id]);

  const selectedSections = useMemo(() => {
    return SECTION_OPTIONS.map((s) => s.key).filter((k) => selected[k]);
  }, [selected]);

  const generate = async (sections: DraftSection[]) => {
    setError('');
    const res = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: id,
        sections,
        tone,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to generate draft');

    return data as { draft: Record<string, string> };
  };

  const handleGenerate = async () => {
    if (selectedSections.length === 0) {
      setError('Please select at least one section.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await generate(selectedSections);
      setDraft((prev) => ({
        ...prev,
        ...(data.draft as Partial<Record<DraftSection, string>>),
      }));
      toastSuccess('Draft generated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate draft';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (section: DraftSection) => {
    setRegenerating((p) => ({ ...p, [section]: true }));
    setError('');
    try {
      const data = await generate([section]);
      const value = data.draft?.[section];
      if (typeof value === 'string') {
        setDraft((prev) => ({ ...prev, [section]: value }));
      }
      toastSuccess(`Regenerated ${sectionToTitle(section)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to regenerate';
      setError(msg);
      toastError(msg);
    } finally {
      setRegenerating((p) => ({ ...p, [section]: false }));
    }
  };

  const handleCopyAll = async () => {
    const orderedKeys = SECTION_OPTIONS.map((s) => s.key).filter(
      (k) => typeof draft[k] === 'string' && (draft[k] || '').trim().length > 0
    );

    if (orderedKeys.length === 0) return;

    const text = orderedKeys
      .map((k) => `## ${sectionToTitle(k)}\n\n${draft[k]}\n`)
      .join('\n');

    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

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
        <a
          href="/"
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Start a new analysis
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">📝 First Draft Generator</h1>
          <p className="text-slate-400">
            {plan.config.app_name} — Generate a complete first draft for your listing
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCopyAll}
            disabled={Object.keys(draft).length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            {copiedAll ? '✓ Copied!' : '📋 Copy All'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Generating…' : '✨ Generate Draft'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Sections</h2>
            <div className="space-y-2">
              {SECTION_OPTIONS.map((s) => (
                <label
                  key={s.key}
                  className="flex items-start gap-3 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected[s.key]}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [s.key]: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm text-white">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.help}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Tone</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                    tone === t.value
                      ? 'bg-indigo-600/20 border-indigo-500/50'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40'
                  }`}
                >
                  <div className="text-sm text-white">{t.label}</div>
                  <div className="text-xs text-slate-500">{t.help}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tip: Generate everything once, then tweak the draft and regenerate per section.
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {SECTION_OPTIONS.map((s) => {
          const value = draft[s.key] || '';
          const hasValue = value.trim().length > 0;

          return (
            <div
              key={s.key}
              className={`rounded-2xl overflow-hidden border ${
                hasValue
                  ? 'bg-slate-800/30 border-slate-700/60'
                  : 'bg-slate-900/20 border-slate-700/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/40">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{s.label}</div>
                  <div className="text-xs text-slate-500">{s.help}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleRegenerate(s.key)}
                    disabled={!!regenerating[s.key]}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    title="Regenerate this section"
                  >
                    {regenerating[s.key] ? '…' : '🔄 Regenerate'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!hasValue) return;
                      await navigator.clipboard.writeText(value);
                    }}
                    disabled={!hasValue}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    title="Copy section"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div className="p-4">
                <textarea
                  value={value}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [s.key]: e.target.value,
                    }))
                  }
                  placeholder="Not generated yet…"
                  className="w-full min-h-[140px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Drafts are a starting point — review for accuracy before publishing.
      </div>
    </div>
  );
}
