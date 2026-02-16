'use client';

import { useState, useEffect, use } from 'react';
import { MarketingPlan } from '@/lib/types';
import { SerpPreview } from '@/components/SerpPreview';
import PlanNav from '@/components/PlanNav';
import { SerpSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';

export default function SerpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    // Try sessionStorage first (just generated)
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        const planData = JSON.parse(stored);
        setPlan(planData);
        initializeFields(planData);
        setLoading(false);
        return;
      } catch {
        /* fall through to DB */
      }
    }

    // Fall back to DB
    loadFromDb();
  }, [id]);

  const loadFromDb = () => {
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
  };

  const initializeFields = (planData: MarketingPlan) => {
    // Extract app name, one-liner, and URL from plan config
    const appName = planData.config.app_name || '';
    const oneLiner = planData.config.one_liner || '';
    const appUrl = planData.config.app_url || '';

    // Set initial values
    setTitle(`${appName} — ${oneLiner}`);
    setUrl(appUrl);
    setDescription(oneLiner);
  };

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
        <p className="text-sm text-slate-500 mb-4">
          This plan may have been deleted or doesn&apos;t exist.
        </p>
        <a href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 min-w-0 mb-2">
          {plan.config.icon && (
            <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white break-words">
              SERP Preview: {plan.config.app_name}
            </h1>
            <p className="text-slate-400 break-words">
              Preview how your site appears in Google search results
            </p>
          </div>
        </div>
      </div>

      {/* Info box */}
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

      {/* SERP Preview Component */}
      <SerpPreview
        title={title}
        url={url}
        description={description}
        editable={true}
        onTitleChange={setTitle}
        onUrlChange={setUrl}
        onDescriptionChange={setDescription}
      />

      {/* Footer */}
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
