'use client';

import { useEffect, useMemo, useState, use } from 'react';
import type { MarketingPlan } from '@/lib/types';
import ErrorRetry from '@/components/ErrorRetry';

function clampText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + '…';
}

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f-${i}`} className="text-amber-500">★</span>
      ))}
      {half && <span className="text-amber-500">☆</span>}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e-${i}`} className="text-slate-300">★</span>
      ))}
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 h-[50px] rounded-xl bg-slate-800/60 border border-slate-700 animate-pulse" />
      <div className="rounded-3xl border border-slate-700 bg-white overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex gap-5 items-start">
            <div className="w-20 h-20 rounded-2xl bg-slate-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-6 w-64 bg-slate-200 rounded animate-pulse" />
              <div className="mt-2 h-4 w-72 bg-slate-200 rounded animate-pulse" />
              <div className="mt-4 h-9 w-24 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[9/19.5] rounded-2xl bg-slate-200 animate-pulse"
              />
            ))}
          </div>

          <div className="mt-8 h-5 w-44 bg-slate-200 rounded animate-pulse" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>

          <div className="mt-8 h-5 w-44 bg-slate-200 rounded animate-pulse" />
          <div className="mt-3 h-16 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function PlanPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);

  const [appName, setAppName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [whatsNew, setWhatsNew] = useState('');
  const [rating, setRating] = useState<number>(4.7);
  const [ratingCount, setRatingCount] = useState<number>(12800);
  const [expanded, setExpanded] = useState(false);

  const screenshots = useMemo(() => {
    // Prefer real scraped screenshots if present; fall back to placeholders.
    const scraped = plan?.scraped?.screenshots ?? [];
    if (scraped.length > 0) return scraped.slice(0, 6);
    return Array.from({ length: 5 }).map((_, i) => `placeholder-${i}`);
  }, [plan]);

  const loadPlan = async () => {
    try {
      setPlanLoading(true);
      setPlanError(null);
      const res = await fetch(`/api/plans/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to load plan (${res.status})`);
      }
      const data = (await res.json()) as MarketingPlan;
      setPlan(data);

      // Seed editable fields.
      setAppName(data.config?.app_name || 'Your App');
      setSubtitle(
        data.config?.one_liner ||
          data.scraped?.shortDescription ||
          'A short, store-friendly one-liner that sells the value.'
      );
      setDescription(
        data.scraped?.description ||
          'Write a clear, benefit-led description. Focus on outcomes, not features — then back it up with proof.'
      );
      setWhatsNew(
        '• Improvements & bug fixes\n• Faster onboarding\n• Updated screenshots and copy'
      );
      setRating(data.scraped?.rating ? Number(data.scraped.rating) : 4.7);
      setRatingCount(data.scraped?.ratingCount ? Number(data.scraped.ratingCount) : 12800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plan';
      setPlanError(message);
    } finally {
      setPlanLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (planLoading) return <PreviewSkeleton />;

  if (planError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-slate-300">Plan not found</div>
    );
  }

  const shownDescription = expanded ? description : clampText(description, 520);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        See exactly how your app looks in the App Store and Google Play — with your real listing data, so you can spot issues before they go live.
      </div>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">📱 App Store Preview</h1>
          <p className="text-slate-400">
            Tweak your copy inline and see a realistic iOS App Store listing preview.
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-800/40 border border-slate-700 rounded-xl px-3 py-2">
          Tip: Click any editable field
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Preview */}
        <div className="lg:col-span-3">
          <div className="rounded-3xl border border-slate-700 bg-white overflow-hidden shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
            {/* Header */}
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                  {plan.config.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={plan.config.icon}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-slate-600 font-semibold">
                      {appName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <input
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full text-xl font-bold text-slate-900 bg-transparent focus:outline-none"
                    aria-label="App name"
                  />
                  <input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full mt-1 text-sm text-slate-600 bg-transparent focus:outline-none"
                    aria-label="Subtitle"
                  />

                  <div className="mt-4 flex items-center gap-3">
                    <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors">
                      Get
                    </button>
                    <div className="text-xs text-slate-500">In-App Purchases</div>
                  </div>
                </div>
              </div>

              {/* Rating row */}
              <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">
                    {rating.toFixed(1)}
                  </div>
                  <div>
                    <Stars value={rating} />
                    <div className="text-xs text-slate-500 mt-0.5">
                      {ratingCount.toLocaleString()} Ratings
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500">Edit rating</div>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-20 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Rating"
                  />
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={ratingCount}
                    onChange={(e) => setRatingCount(Number(e.target.value))}
                    className="w-28 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Rating count"
                  />
                </div>
              </div>
            </div>

            {/* Screenshots */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-slate-900">Preview</div>
                <div className="text-xs text-slate-500">iPhone</div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2">
                {screenshots.map((s) => (
                  <div
                    key={s}
                    className="w-[160px] sm:w-[180px] aspect-[9/19.5] rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 overflow-hidden shrink-0"
                  >
                    {typeof s === 'string' && s.startsWith('http') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full p-4 flex flex-col justify-end">
                        <div className="text-[11px] text-slate-500">Screenshot {String(s).split('-').pop()}</div>
                        <div className="mt-2 h-2 w-20 bg-slate-200 rounded" />
                        <div className="mt-2 h-2 w-28 bg-slate-200 rounded" />
                        <div className="mt-2 h-2 w-16 bg-slate-200 rounded" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-slate-100">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-slate-900">Description</div>
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="text-blue-600 hover:text-blue-500 text-sm font-semibold"
                  >
                    {expanded ? 'Less' : 'More'}
                  </button>
                </div>

                <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap leading-6">
                  {shownDescription}
                </div>
              </div>
            </div>

            {/* What's New */}
            <div className="border-t border-slate-100">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-slate-900">What’s New</div>
                  <div className="text-xs text-slate-500">Version 1.4.0</div>
                </div>

                <textarea
                  value={whatsNew}
                  onChange={(e) => setWhatsNew(e.target.value)}
                  rows={4}
                  className="mt-3 w-full text-sm text-slate-700 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
                  aria-label="What's new"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Inline editor</h2>

            <label className="block text-xs text-slate-400 mb-1">App name</label>
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full bg-slate-900/40 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <label className="block text-xs text-slate-400 mb-1 mt-4">Subtitle</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full bg-slate-900/40 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <label className="block text-xs text-slate-400 mb-1 mt-4">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={10}
              className="w-full bg-slate-900/40 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 whitespace-pre-wrap"
            />

            <div className="mt-4 text-xs text-slate-500">
              This preview is visual-only (doesn’t save back to the plan yet).
            </div>
          </div>

          <div className="mt-4 bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-2">Using your plan data</h3>
            <div className="text-xs text-slate-400 leading-5">
              <div>
                <span className="text-slate-300">Source:</span> {plan.scraped?.source}
              </div>
              <div className="mt-1">
                <span className="text-slate-300">Category:</span> {plan.config?.category}
              </div>
              <div className="mt-1">
                <span className="text-slate-300">Pricing:</span> {plan.config?.pricing}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
