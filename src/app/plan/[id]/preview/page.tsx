'use client';

import { useEffect, useState, use } from 'react';
import type { MarketingPlan } from '@/lib/types';
import PlanNav from '@/components/PlanNav';
import AppStorePreview, { type AppStoreData } from '@/components/AppStorePreview';
import ErrorRetry from '@/components/ErrorRetry';

type ViewMode = 'current' | 'proposed';

function planToCurrentData(plan: MarketingPlan): AppStoreData {
  return {
    icon: plan.scraped.icon || plan.config.icon,
    name: plan.scraped.name || plan.config.app_name,
    subtitle: plan.scraped.shortDescription || plan.config.one_liner,
    screenshots: plan.scraped.screenshots,
    rating: plan.scraped.rating,
    ratingCount: plan.scraped.ratingCount,
    description: plan.scraped.description,
    developer: plan.scraped.developer,
    category: plan.scraped.category || plan.config.category,
    pricing: plan.scraped.pricing || plan.config.pricing,
  };
}

function extractDraftSection(generated: string, sectionName: string): string | undefined {
  // Try to extract a section from the generated markdown
  const patterns = [
    new RegExp(`##\\s*${sectionName}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n##|$)`, 'i'),
    new RegExp(`\\*\\*${sectionName}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\n\\*\\*|\\n##|$)`, 'i'),
  ];
  for (const pat of patterns) {
    const m = generated.match(pat);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

function planToProposedData(plan: MarketingPlan): AppStoreData {
  const gen = plan.generated || '';
  const stages = plan.stages || {};
  const allText = [gen, stages.foundation, stages.assets, stages.structure].filter(Boolean).join('\n');

  return {
    icon: plan.scraped.icon || plan.config.icon,
    name: plan.config.app_name,
    subtitle:
      extractDraftSection(allText, 'Short description') ||
      extractDraftSection(allText, 'Tagline') ||
      plan.config.one_liner,
    screenshots: plan.scraped.screenshots,
    rating: plan.scraped.rating,
    ratingCount: plan.scraped.ratingCount,
    description:
      extractDraftSection(allText, 'App Store description') ||
      extractDraftSection(allText, 'Description') ||
      plan.scraped.description,
    whatsNew: extractDraftSection(allText, "What's New") || extractDraftSection(allText, 'Whats New'),
    featureBullets: extractDraftSection(allText, 'Feature bullets') || extractDraftSection(allText, 'Features'),
    developer: plan.scraped.developer,
    category: plan.scraped.category || plan.config.category,
    pricing: plan.scraped.pricing || plan.config.pricing,
  };
}

export default function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ViewMode>('current');

  const loadPlan = () => {
    setLoading(true);
    setError('');
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setLoading(false);
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load plan'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlan();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <div className="animate-pulse text-slate-400">Loading preview…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={error} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <a href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </a>
      </div>
    );
  }

  const currentData = planToCurrentData(plan);
  const proposedData = planToProposedData(plan);
  const activeData = mode === 'current' ? currentData : proposedData;

  return (
    <div className="max-w-5xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">📱 App Store Preview</h1>
          <p className="text-slate-400">
            See how {plan.config.app_name} looks in the App Store
          </p>
        </div>

        {/* Toggle */}
        <div className="flex bg-slate-800/50 border border-slate-700 rounded-xl p-1">
          <button
            onClick={() => setMode('current')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'current'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setMode('proposed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'proposed'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Proposed
          </button>
        </div>
      </div>

      {mode === 'proposed' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-amber-400 text-sm">
          💡 Showing proposed copy from your generated draft. Generate a draft first on the Draft tab for best results.
        </div>
      )}

      {/* Phone frame */}
      <div className="flex justify-center py-4">
        <div className="bg-black rounded-[40px] p-3 shadow-2xl">
          <div className="bg-white rounded-[28px] overflow-hidden w-[428px]">
            {/* Status bar mock */}
            <div className="bg-[#f2f2f7] px-6 py-2 flex items-center justify-between text-[12px] font-semibold text-black">
              <span>9:41</span>
              <div className="flex gap-1 items-center">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>
            <AppStorePreview data={activeData} />
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-slate-600 mt-6 mb-6">
        This is a visual approximation — actual App Store rendering may vary.
      </div>
    </div>
  );
}
