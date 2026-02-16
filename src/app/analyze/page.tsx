'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ScrapedApp, AppConfig, RecentAnalysis } from '@/lib/types';
import { useToast } from '@/components/Toast';
import ErrorRetry from '@/components/ErrorRetry';

const APP_TYPES: AppConfig['app_type'][] = ['web', 'mobile', 'saas', 'desktop', 'cli', 'api', 'browser-extension'];

const DISTRIBUTION_CHANNELS = [
  { id: 'reddit', label: 'Reddit' },
  { id: 'hackernews', label: 'Hacker News' },
  { id: 'producthunt', label: 'Product Hunt' },
  { id: 'twitter', label: 'Twitter / X' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'appstore', label: 'App Store' },
];

function EditableListField({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    const trimmed = newItem.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 bg-slate-700/70 text-slate-300 text-sm px-3 py-1.5 rounded-lg"
          >
            {item}
            <button
              onClick={() => removeItem(i)}
              className="text-slate-500 hover:text-red-400 transition-colors ml-1"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full sm:flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ScrapedApp | null>(null);
  const [generating, setGenerating] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  // Editable config state
  const [configReady, setConfigReady] = useState(false);
  const [appName, setAppName] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [category, setCategory] = useState('');
  const [appType, setAppType] = useState<AppConfig['app_type']>('web');
  const [targetAudience, setTargetAudience] = useState('');
  const [pricing, setPricing] = useState('');
  const [differentiators, setDifferentiators] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);

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

        // Pre-populate config from scrape data
        const isApp = result.source === 'appstore' || result.source === 'googleplay';
        setAppName(result.name || '');
        setOneLiner(result.shortDescription || result.description?.substring(0, 120) || '');
        setCategory(result.category || 'tool');
        setAppType(isApp ? 'mobile' : 'web');
        setTargetAudience(`Users of ${result.category || 'this type of'} apps`);
        setPricing(result.pricing || 'Free');
        setDifferentiators(result.features?.slice(0, 6) || []);
        setCompetitors([]);
        setChannels(
          isApp
            ? ['reddit', 'twitter', 'producthunt', 'appstore']
            : ['reddit', 'hackernews', 'twitter', 'linkedin', 'producthunt']
        );
        setConfigReady(true);

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
        const filtered = recent.filter((r: RecentAnalysis) => r.url !== url);
        filtered.unshift(entry);
        localStorage.setItem('recent-analyses', JSON.stringify(filtered.slice(0, 20)));
        toastSuccess(`Scraped ${result.name || url} successfully`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to scrape';
        setError(msg);
        toastError(msg);
      } finally {
        setLoading(false);
      }
    };
    doScrape();
  }, [url, router]);

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleGeneratePlan = async () => {
    if (!data) return;
    setGenerating(true);
    setError('');
    try {
      const editedConfig: Partial<AppConfig> = {
        app_name: appName,
        app_url: url,
        app_type: appType,
        category,
        one_liner: oneLiner,
        target_audience: targetAudience,
        pricing,
        differentiators,
        competitors,
        distribution_channels: channels,
        icon: data.icon,
      };

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scraped: data, config: editedConfig }),
      });
      const plan = await res.json();
      if (!res.ok) throw new Error(plan.error || 'Generation failed');

      // Store plan in sessionStorage and navigate
      sessionStorage.setItem(`plan-${plan.id}`, JSON.stringify(plan));
      toastSuccess('Marketing plan generated!');
      router.push(`/plan/${plan.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate plan';
      setError(msg);
      toastError(msg);
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
        <ErrorRetry error={error} onRetry={() => window.location.reload()} />
        <button onClick={() => router.push('/')} className="text-indigo-400 hover:text-indigo-300 transition-colors mt-4 block mx-auto">
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
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {data.icon ? (
            <img src={data.icon} alt={data.name} className="w-20 h-20 rounded-2xl flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-700 flex items-center justify-center text-3xl flex-shrink-0">🔗</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
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

      {/* Screenshots */}
      {data.screenshots && data.screenshots.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Screenshots</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {data.screenshots.slice(0, 6).map((ss, i) => (
              <img key={i} src={ss} alt={`Screenshot ${i + 1}`} className="h-40 sm:h-48 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>
      )}

      {/* Editable Config Form */}
      {configReady && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-1">⚙️ Configure Plan</h2>
          <p className="text-sm text-slate-400 mb-6">Review and edit the detected data before generating your marketing plan.</p>

          <div className="space-y-5">
            {/* Row 1: Name + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">App Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* One-liner */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">One-Liner</label>
              <input
                type="text"
                value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value)}
                placeholder="What does this app do in one sentence?"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Row 2: App Type + Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">App Type</label>
                <select
                  value={appType}
                  onChange={(e) => setAppType(e.target.value as AppConfig['app_type'])}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {APP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Pricing</label>
                <input
                  type="text"
                  value={pricing}
                  onChange={(e) => setPricing(e.target.value)}
                  placeholder="Free, Freemium, $9.99/mo, etc."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Who is this for?"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Differentiators */}
            <EditableListField
              label="Differentiators / Key Features"
              items={differentiators}
              onChange={setDifferentiators}
              placeholder="Add a feature or differentiator..."
            />

            {/* Competitors */}
            <EditableListField
              label="Competitors"
              items={competitors}
              onChange={setCompetitors}
              placeholder="Add a competitor..."
            />

            {/* Distribution Channels */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Distribution Channels</label>
              <div className="flex flex-wrap gap-2">
                {DISTRIBUTION_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                      channels.includes(ch.id)
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>
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
      {configReady && (
        <div className="text-center py-6">
          <button
            onClick={handleGeneratePlan}
            disabled={generating || !appName.trim()}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg transition-all"
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
              'Generate Plan →'
            )}
          </button>
          <p className="text-sm text-slate-500 mt-2">5-stage brief using Vibe Marketing methodology</p>
        </div>
      )}
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
