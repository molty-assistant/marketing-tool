'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import { DraftSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';

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
  const [isCached, setIsCached] = useState(false);

  const storageKey = `draft-${id}`;
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState<Partial<Record<DraftSection, boolean>>>({});
  const [copiedAll, setCopiedAll] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const loadPlan = useCallback(() => {
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
  }, [id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      setDraft(JSON.parse(stored) as Partial<Record<DraftSection, string>>);
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

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
      const patch = data.draft as Partial<Record<DraftSection, string>>;
      const nextDraft = { ...draft, ...patch };
      sessionStorage.setItem(storageKey, JSON.stringify(nextDraft));
      setDraft(nextDraft);
      setIsCached(false);
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
        const nextDraft = { ...draft, [section]: value };
        sessionStorage.setItem(storageKey, JSON.stringify(nextDraft));
        setDraft(nextDraft);
        setIsCached(false);
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
        <div className="text-muted-foreground mb-4">Plan not found</div>
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-sm text-muted-foreground bg-card border border-border rounded-xl px-4 py-3">
        Generate polished App Store descriptions, landing page hero copy, and feature bullets — choose your tone and section, then copy straight to your listing.
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">📝 First Draft Generator</h1>
            {Object.keys(draft).length > 0 && isCached && (
              <span className="text-xs text-muted-foreground">Cached · ↻ Generate to refresh</span>
            )}
          </div>
          <p className="text-muted-foreground">
            {plan.config.app_name} — Generate a complete first draft for your listing
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleCopyAll}
            disabled={Object.keys(draft).length === 0}
            variant="secondary"
            className="text-sm px-4 py-2.5 rounded-xl"
          >
            {copiedAll ? '✓ Copied!' : '📋 Copy All'}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="text-sm px-5 py-2.5 rounded-xl"
          >
            {loading ? 'Generating…' : '✨ Generate Draft'}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Sections</h2>
            <div className="space-y-2">
              {SECTION_OPTIONS.map((s) => (
                <label
                  key={s.key}
                  className="flex items-start gap-3 bg-card hover:bg-muted/50 border border-border rounded-xl px-4 py-3 cursor-pointer"
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
                    <div className="text-sm text-foreground">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.help}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Tone</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                    tone === t.value
                      ? 'bg-indigo-600/20 border-indigo-500/50'
                      : 'bg-card hover:bg-muted/50 border-border'
                  }`}
                >
                  <div className="text-sm text-foreground">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.help}</div>
                  <div className="text-xs italic text-muted-foreground mt-0.5">{t.sample}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
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
                  ? 'bg-card border-border'
                  : 'bg-muted/50 border-border'
              }`}
            >
              <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.help}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handleRegenerate(s.key)}
                    disabled={!!regenerating[s.key]}
                    variant="secondary"
                    size="sm"
                    className="text-xs px-3 py-1.5 rounded-lg"
                    title="Regenerate this section"
                  >
                    {regenerating[s.key] ? '…' : '🔄 Regenerate'}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!hasValue) return;
                      await navigator.clipboard.writeText(value);
                    }}
                    disabled={!hasValue}
                    variant="secondary"
                    size="sm"
                    className="text-xs px-3 py-1.5 rounded-lg"
                    title="Copy section"
                  >
                    📋 Copy
                  </Button>
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
                  className="w-full min-h-[140px] bg-muted/50 border border-border rounded-xl p-3 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground mt-10 mb-6">
        Drafts are a starting point — review for accuracy before publishing.
      </div>
    </div>
  );
}
