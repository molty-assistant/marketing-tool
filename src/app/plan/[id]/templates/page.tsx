'use client';

import { useEffect, useMemo, useState, use } from 'react';
import type { MarketingPlan } from '@/lib/types';
import ErrorRetry from '@/components/ErrorRetry';
import { PageSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

type Template = {
  id:
    | 'app_store_short'
    | 'app_store_full'
    | 'twitter_bio'
    | 'instagram_bio'
    | 'linkedin_about'
    | 'google_play_short'
    | 'product_hunt_tagline'
    | 'press_release_opener';
  name: string;
  charLimit: number;
  description: string;
  template: string;
};

const TEMPLATES: Template[] = [
  {
    id: 'app_store_short',
    name: 'App Store Description (short)',
    charLimit: 170,
    description: 'A concise, store-friendly short description.',
    template:
      '{{app_name}} — {{one_liner}} Built for {{target_audience}}. Try it today: {{app_url}}',
  },
  {
    id: 'app_store_full',
    name: 'App Store Description (full)',
    charLimit: 4000,
    description: 'A longer, structured description with keyword-friendly sections.',
    template: `Meet {{app_name}}\n\n{{one_liner}}\n\nWhy you\'ll love it\n• Designed for {{target_audience}}\n• Clear, fast workflows that reduce friction\n• Simple pricing: {{pricing}}\n\nWhat you can do with {{app_name}}\n• [Feature 1] {{differentiator_1}}\n• [Feature 2] {{differentiator_2}}\n• [Feature 3] {{differentiator_3}}\n\nPerfect for\n• {{target_audience}}\n• Teams who want to ship faster\n\nGet started\nDownload {{app_name}} and see results in minutes.\n{{app_url}}\n\nKeywords (edit)\n{{keywords}}\n`,
  },
  {
    id: 'twitter_bio',
    name: 'Twitter/X Bio',
    charLimit: 160,
    description: 'Short, punchy bio suitable for X.',
    template: '{{app_name}}: {{one_liner}} | For {{target_audience}} | {{app_url}}',
  },
  {
    id: 'instagram_bio',
    name: 'Instagram Bio',
    charLimit: 150,
    description: 'Bio with clear benefit + CTA.',
    template: '{{app_name}}\n{{one_liner}}\nFor {{target_audience}}\n👇 {{app_url}}',
  },
  {
    id: 'linkedin_about',
    name: 'LinkedIn Page About',
    charLimit: 2000,
    description: 'A professional “About” section for your LinkedIn page.',
    template: `{{app_name}} is built for {{target_audience}}.\n\n{{one_liner}}\n\nWhat we\'re focused on\n• Practical outcomes over vanity metrics\n• Simple, reliable workflows\n• A product experience people actually enjoy\n\nWhy {{app_name}}\n{{differentiators_sentence}}\n\nPricing\n{{pricing}}\n\nLearn more: {{app_url}}`,
  },
  {
    id: 'google_play_short',
    name: 'Google Play Short Description',
    charLimit: 80,
    description: 'Ultra-short Play Store description.',
    template: '{{one_liner}}',
  },
  {
    id: 'product_hunt_tagline',
    name: 'Product Hunt tagline',
    charLimit: 60,
    description: 'A short PH tagline (keep it benefit-forward).',
    template: '{{one_liner}}',
  },
  {
    id: 'press_release_opener',
    name: 'Press Release opener',
    charLimit: 500,
    description: 'An opening paragraph you can paste into a press release.',
    template:
      'Today, {{app_name}} announced its launch — {{one_liner}} Built for {{target_audience}}, {{app_name}} helps teams move faster with a simple, reliable workflow. Learn more at {{app_url}}.',
  },
];

function clamp(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}…`;
}

function fillTemplate(template: string, plan: MarketingPlan | null) {
  const appName = plan?.config?.app_name || 'Your app';
  const oneLiner = plan?.config?.one_liner || 'A short one-line description';
  const targetAudience = plan?.config?.target_audience || 'your audience';
  const pricing = plan?.config?.pricing || 'Simple pricing';
  const appUrl = plan?.config?.app_url || plan?.scraped?.url || '';

  const differentiators = Array.isArray(plan?.config?.differentiators)
    ? plan!.config.differentiators
    : [];
  const d1 = differentiators[0] || 'A key differentiator';
  const d2 = differentiators[1] || 'Another differentiator';
  const d3 = differentiators[2] || 'A third differentiator';

  const keywords = (plan?.scraped?.keywords || [])
    .slice(0, 20)
    .join(', ') ||
    (plan?.scraped?.features || [])
      .slice(0, 12)
      .map((f) => f.toLowerCase())
      .join(', ');

  const differentiatorsSentence = differentiators.length
    ? differentiators.join(' • ')
    : 'Add your differentiators in the plan foundation to personalise this further.';

  return template
    .replaceAll('{{app_name}}', appName)
    .replaceAll('{{one_liner}}', oneLiner)
    .replaceAll('{{target_audience}}', targetAudience)
    .replaceAll('{{pricing}}', pricing)
    .replaceAll('{{app_url}}', appUrl || 'https://example.com')
    .replaceAll('{{differentiator_1}}', d1)
    .replaceAll('{{differentiator_2}}', d2)
    .replaceAll('{{differentiator_3}}', d3)
    .replaceAll('{{keywords}}', keywords || 'keyword 1, keyword 2, keyword 3')
    .replaceAll('{{differentiators_sentence}}', differentiatorsSentence);
}

function CharBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 px-2 py-1 text-xs text-slate-300">
      {value.toLocaleString()} chars
    </span>
  );
}

function PriorityNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/30 p-4 text-sm text-indigo-200">
      {text}
    </div>
  );
}

export default function TemplatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');
  const { success: toastSuccess, error: toastError } = useToast();

  const storageKey = `templates-${id}`;
  const [isCached, setIsCached] = useState(false);
  const [cachedPopulated, setCachedPopulated] = useState<Record<string, string> | null>(null);

  const [edited, setEdited] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadPlan = () => {
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
  };

  useEffect(() => {
    loadPlan();
  }, [id]);

  useEffect(() => {
    // Load persisted template edits (if any)
    fetch(`/api/plans/${id}/templates`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const templates = json?.templates;
        if (!templates || typeof templates !== 'object') return;
        setEdited((prev) => ({ ...prev, ...(templates as Record<string, string>) }));
      })
      .catch(() => {
        /* ignore */
      });
  }, [id]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, string>;
      setCachedPopulated(parsed);
      setEdited(parsed);
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [id]);

  const appName = plan?.config?.app_name;

  const populatedTemplates = useMemo(() => {
    return TEMPLATES.map((t) => ({
      ...t,
      populated: fillTemplate(t.template, plan),
    }));
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    try {
      // If we don't have any edited content yet, seed it from populated templates.
      setEdited((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const payload: Record<string, string> = {};
        for (const tpl of populatedTemplates) payload[tpl.id] = tpl.populated;
        return payload;
      });
    } catch {
      /* ignore */
    }
  }, [plan, populatedTemplates]);

  useEffect(() => {
    try {
      if (Object.keys(edited).length === 0) return;
      sessionStorage.setItem(storageKey, JSON.stringify(edited));
    } catch {
      /* ignore */
    }
  }, [storageKey, edited]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess('Copied to clipboard');
    } catch {
      toastError('Failed to copy');
    }
  };

  const handleSaveChanges = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const entries = Object.entries(edited);
      if (entries.length === 0) {
        toastError('Nothing to save');
        return;
      }

      await Promise.all(
        entries.map(([templateId, content]) =>
          fetch(`/api/plans/${id}/templates/${templateId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          }).then(async (res) => {
            if (res.ok) return;
            const j = await res.json().catch(() => ({}));
            throw new Error(j?.error || 'Failed to save templates');
          })
        )
      );

      toastSuccess('Saved template changes');
      setIsCached(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save templates';
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (planLoading) {
    return (
      <div className="px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (planError) {
    return (
      <div className="px-4 py-8">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  }

  const hasAppInfo = Boolean(plan?.config?.app_name || plan?.config?.one_liner);

  return (
    <div className="px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
          Ready-to-copy marketing templates pre-filled with your app&apos;s details — App Store blurbs, social bios, Product Hunt taglines, and more.
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white mb-2">Templates</h1>
            {cachedPopulated && isCached && (
              <span className="text-xs text-slate-500">Cached</span>
            )}
            <button
              onClick={handleSaveChanges}
              disabled={saving || Object.keys(edited).length === 0}
              className="ml-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
          <p className="text-slate-400">
            Browse ready-to-use marketing copy templates. We\'ll auto-fill placeholders
            from your plan.
          </p>
        </div>

        {!hasAppInfo && (
          <div className="mb-6">
            <PriorityNote text="Tip: add your app name + one-liner in the plan foundation to populate these templates automatically." />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {populatedTemplates.map((t) => {
            const charCount = (edited[t.id] ?? t.populated).length;
            const overLimit = charCount > t.charLimit;
            const current = edited[t.id] ?? t.populated;

            return (
              <div
                key={t.id}
                className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-white">{t.name}</h2>
                      <CharBadge value={t.charLimit} />
                    </div>
                    <p className="text-sm text-slate-400">{t.description}</p>
                  </div>

                  <button
                    onClick={() => handleCopy(current)}
                    className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    📋 Copy
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>
                      {charCount.toLocaleString()} / {t.charLimit.toLocaleString()} chars
                    </span>
                    {overLimit && (
                      <span className="text-amber-300">Over limit — trim before publishing</span>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-2">
                    <textarea
                      value={current}
                      onChange={(e) => setEdited((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      className="w-full min-h-[160px] bg-transparent p-2 text-sm text-slate-200 font-sans whitespace-pre-wrap focus:outline-none"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Preview: {clamp(current.replace(/\s+/g, ' ').trim(), 140)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
