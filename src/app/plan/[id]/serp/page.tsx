'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { MarketingPlan } from '@/lib/types';
import { SerpPreview } from '@/components/SerpPreview';
import { SerpSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';

function readSessionPlan(id: string): MarketingPlan | null {
  try {
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (!stored) return null;
    return JSON.parse(stored) as MarketingPlan;
  } catch {
    return null;
  }
}

export default function SerpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [plan, setPlan] = useState<MarketingPlan | null>(() => readSessionPlan(id));
  const [loading, setLoading] = useState(() => !readSessionPlan(id));
  const [fetchError, setFetchError] = useState('');
  const [title, setTitle] = useState(() => {
    const p = readSessionPlan(id);
    if (!p) return '';
    return `${p.config.app_name || ''} — ${p.config.one_liner || ''}`;
  });
  const [url, setUrl] = useState(() => readSessionPlan(id)?.config.app_url || '');
  const [description, setDescription] = useState(() => readSessionPlan(id)?.config.one_liner || '');
  const [isCached, setIsCached] = useState(false);

  const storageKey = `serp-${id}`;

  const initializeFields = useCallback((planData: MarketingPlan) => {
    const appName = planData.config.app_name || '';
    const oneLiner = planData.config.one_liner || '';
    const appUrl = planData.config.app_url || '';

    setTitle(`${appName} — ${oneLiner}`);
    setUrl(appUrl);
    setDescription(oneLiner);
  }, []);

  const loadFromDb = useCallback(() => {
    setLoading(true);
    setFetchError('');
    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((data) => {
        setPlan(data);
        initializeFields(data);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setLoading(false));
  }, [id, initializeFields]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { title?: string; url?: string; description?: string };
      if (typeof parsed.title === 'string') setTitle(parsed.title);
      if (typeof parsed.url === 'string') setUrl(parsed.url);
      if (typeof parsed.description === 'string') setDescription(parsed.description);
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    // If we already loaded from sessionStorage, skip
    if (plan) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState calls are in async .then() callbacks, not synchronous
    loadFromDb();
  }, [plan, loadFromDb]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ title, url, description }));
    } catch {
      /* ignore */
    }
  }, [id, title, url, description]);

  if (loading) {
    return <SerpSkeleton />;
  }

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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Preview how your app appears in Google search results — tweak your title and meta description to maximise click-through from organic search.
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-4 min-w-0 mb-2">
          {plan.config.icon && <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />}
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white break-words">SERP Preview: {plan.config.app_name}</h1>
              {isCached && (
                <span className="text-xs text-slate-500">Cached</span>
              )}
            </div>
            <p className="text-slate-400 break-words">Preview how your site appears in Google search results</p>
          </div>
        </div>
      </div>

      <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm text-indigo-300 space-y-1">
            <p className="font-medium">SEO Best Practices:</p>
            <ul className="list-disc list-inside space-y-1 text-indigo-300/80">
              <li>Keep titles under 60 characters for full display</li>
              <li>Keep descriptions under 160 characters to avoid truncation</li>
              <li>Include your main keyword in both title and description</li>
              <li>Make the description compelling to improve click-through rate</li>
            </ul>
          </div>
        </div>
      </div>

      <SerpPreview
        title={title}
        url={url}
        description={description}
        editable={true}
        onTitleChange={setTitle}
        onUrlChange={setUrl}
        onDescriptionChange={setDescription}
      />

      <div className="mt-8 text-center">
        <div className="inline-flex gap-3">
          <a
            href={`/plan/${id}`}
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            ← Back to Plan
          </a>
          <a
            href={`/plan/${id}/assets`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            View Assets →
          </a>
        </div>
      </div>
    </div>
  );
}
