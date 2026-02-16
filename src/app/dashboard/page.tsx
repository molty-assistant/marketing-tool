'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecentAnalysis } from '@/lib/types';

export default function DashboardPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<RecentAnalysis[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('recent-analyses');
    if (stored) {
      try {
        setRecent(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      setLoading(false);
      return;
    }

    router.push(`/analyze?url=${encodeURIComponent(url.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  const clearRecent = () => {
    localStorage.removeItem('recent-analyses');
    setRecent([]);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10 mt-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">Dashboard</h1>
        <p className="text-base text-slate-400 max-w-xl mx-auto">
          Start a new analysis or jump back into a recent marketing brief.
        </p>
      </div>

      {/* URL Input */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 mb-8">
        <label htmlFor="url-input" className="block text-sm font-medium text-slate-300 mb-3">
          Enter URL to analyze
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://apps.apple.com/app/... or any URL"
            className="w-full sm:flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            disabled={loading}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-xl transition-all whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze →'
            )}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        {/* Quick examples */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Try:</span>
          {[
            { label: 'LightScout AI', url: 'https://apps.apple.com/gb/app/lightscout-ai/id6748341779' },
            { label: 'Spotify', url: 'https://play.google.com/store/apps/details?id=com.spotify.music' },
            { label: 'Linear', url: 'https://linear.app' },
            { label: 'Notion', url: 'https://www.notion.so' },
          ].map((example) => (
            <button
              key={example.label}
              onClick={() => setUrl(example.url)}
              className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1 rounded-full transition-colors"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Analyses */}
      {recent.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Analyses</h2>
            <button onClick={clearRecent} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {recent.map((item) => (
              <a
                key={item.id}
                href={`/analyze?url=${encodeURIComponent(item.url)}`}
                className="flex items-center gap-4 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/60 transition-colors"
              >
                {item.icon ? (
                  <img src={item.icon} alt="" className="w-10 h-10 rounded-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-lg">🔗</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{item.name}</div>
                  <div className="text-sm text-slate-500 truncate">{item.url}</div>
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0">
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-slate-500">
          No recent analyses yet. Paste a URL above to generate your first brief.
        </div>
      )}
    </div>
  );
}
