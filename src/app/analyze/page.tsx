'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ScrapedApp, RecentAnalysis } from '@/lib/types';

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ScrapedApp | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!url) {
      router.push('/');
      return;
    }

    const doScrape = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Scraping failed');
        setData(result);

        // Save to recent
        const recent: RecentAnalysis[] = JSON.parse(localStorage.getItem('recent-analyses') || '[]');
        const entry: RecentAnalysis = {
          id: `${Date.now()}`,
          url,
          name: result.name,
          icon: result.icon,
          source: result.source,
          createdAt: new Date().toISOString(),
        };
        const filtered = recent.filter(r => r.url !== url);
        filtered.unshift(entry);
        localStorage.setItem('recent-analyses', JSON.stringify(filtered.slice(0, 20)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to scrape');
      } finally {
        setLoading(false);
      }
    };
    doScrape();
  }, [url, router]);

  const handleGeneratePlan = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scraped: data }),
      });
      const plan = await res.json();
      if (!res.ok) throw new Error(plan.error || 'Generation failed');

      // Store plan in sessionStorage and navigate
      sessionStorage.setItem(`plan-${plan.id}`, JSON.stringify(plan));
      router.push(`/plan/${plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="inline-flex items-center gap-3 text-lg text-slate-300">
          <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Scraping {url}...
        </div>
        <p className="text-sm text-slate-500 mt-4">Extracting app info, features, and metadata</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-red-400 text-lg mb-4">⚠️ {error}</div>
        <button onClick={() => router.push('/')} className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Go back
        </button>
      </div>
    );
  }

  if (!data) return null;

  const sourceLabel = { appstore: 'Apple App Store', googleplay: 'Google Play', website: 'Website' }[data.source];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <a href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6 inline-block">
        ← Back to home
      </a>

      {/* App Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 mb-6">
        <div className="flex items-start gap-5">
          {data.icon ? (
            <img src={data.icon} alt={data.name} className="w-20 h-20 rounded-2xl flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-700 flex items-center justify-center text-3xl flex-shrink-0">🔗</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{data.name}</h1>
              <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">{sourceLabel}</span>
            </div>
            {data.developer && (
              <p className="text-sm text-slate-400 mb-2">{data.developer}</p>
            )}
            <p className="text-slate-300 line-clamp-3">{data.description.substring(0, 300)}{data.description.length > 300 ? '...' : ''}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-700">
          {data.rating && (
            <div className="bg-slate-900/50 rounded-lg px-4 py-2">
              <div className="text-xs text-slate-500">Rating</div>
              <div className="text-white font-semibold">{data.rating}★ {data.ratingCount ? `(${data.ratingCount.toLocaleString()})` : ''}</div>
            </div>
          )}
          {data.category && (
            <div className="bg-slate-900/50 rounded-lg px-4 py-2">
              <div className="text-xs text-slate-500">Category</div>
              <div className="text-white font-semibold">{data.category}</div>
            </div>
          )}
          <div className="bg-slate-900/50 rounded-lg px-4 py-2">
            <div className="text-xs text-slate-500">Pricing</div>
            <div className="text-white font-semibold">{data.pricing}</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg px-4 py-2">
            <div className="text-xs text-slate-500">Features Found</div>
            <div className="text-white font-semibold">{data.features.length}</div>
          </div>
        </div>
      </div>

      {/* Features */}
      {data.features.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Extracted Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                <span className="text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screenshots */}
      {data.screenshots && data.screenshots.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Screenshots</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {data.screenshots.slice(0, 6).map((ss, i) => (
              <img key={i} src={ss} alt={`Screenshot ${i + 1}`} className="h-48 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Generate Plan Button */}
      <div className="text-center py-6">
        <button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating Marketing Plan...
            </span>
          ) : (
            '📋 Generate Marketing Plan →'
          )}
        </button>
        <p className="text-sm text-slate-500 mt-2">5-stage brief using Vibe Marketing methodology</p>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-lg text-slate-300">Loading...</div>
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
