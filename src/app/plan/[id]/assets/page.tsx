'use client';

import { useState, useEffect, useRef, use } from 'react';
import { MarketingPlan, GeneratedAsset, AssetConfig } from '@/lib/types';

function AssetPreview({ asset }: { asset: GeneratedAsset }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleDownload = () => {
    const blob = new Blob([asset.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.type}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(asset.html);
  };

  // Scale to fit container
  const scale = Math.min(1, 600 / asset.width);
  const scaledHeight = asset.height * scale;

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">{asset.label}</h3>
            <p className="text-xs text-slate-500">{asset.width}×{asset.height}px</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyHtml}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              📋 Copy HTML
            </button>
            <button
              onClick={handleDownload}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              📥 Download
            </button>
          </div>
        </div>
      </div>
      <div className="p-4 bg-slate-900/50 flex justify-center" style={{ minHeight: scaledHeight + 16 }}>
        <div
          style={{
            width: asset.width,
            height: asset.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={asset.html}
            width={asset.width}
            height={asset.height}
            style={{ border: 'none', borderRadius: '8px' }}
            sandbox="allow-same-origin"
            title={asset.label}
          />
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Color presets
  const [colors, setColors] = useState({
    background: '#0f172a',
    text: '#e2e8f0',
    primary: '#6366f1',
    secondary: '#8b5cf6',
  });

  useEffect(() => {
    // Try sessionStorage first
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        const p = JSON.parse(stored) as MarketingPlan;
        setPlan(p);
        return;
      } catch { /* fall through */ }
    }

    // Fall back to DB
    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setPlan(data);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      })
      .catch(() => {
        // Plan not found
      });
  }, [id]);

  useEffect(() => {
    if (!plan) return;
    generateAssetsFromPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, colors]);

  const generateAssetsFromPlan = async () => {
    if (!plan) return;
    setLoading(true);
    setError('');
    try {
      const config: AssetConfig = {
        name: plan.config.app_name,
        tagline: plan.config.one_liner,
        icon: plan.config.icon || '🚀',
        url: plan.config.app_url,
        features: plan.config.differentiators,
        colors,
      };

      const res = await fetch('/api/generate-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to generate assets');
      setAssets(result.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate assets');
    } finally {
      setLoading(false);
    }
  };

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

  const COLOR_PRESETS = [
    { name: 'Indigo Dark', bg: '#0f172a', text: '#e2e8f0', primary: '#6366f1', secondary: '#8b5cf6' },
    { name: 'Ocean', bg: '#0c1222', text: '#e0f2fe', primary: '#0ea5e9', secondary: '#06b6d4' },
    { name: 'Emerald', bg: '#0f1f17', text: '#d1fae5', primary: '#10b981', secondary: '#34d399' },
    { name: 'Rose', bg: '#1a0f16', text: '#fce7f3', primary: '#f43f5e', secondary: '#ec4899' },
    { name: 'Amber', bg: '#1a1508', text: '#fef3c7', primary: '#f59e0b', secondary: '#eab308' },
    { name: 'Light', bg: '#f8fafc', text: '#1e293b', primary: '#6366f1', secondary: '#8b5cf6' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <a href={`/plan/${id}`} className="text-sm text-slate-500 hover:text-slate-300 transition-colors mb-2 inline-block">
            ← Back to plan
          </a>
          <h1 className="text-2xl font-bold text-white">🎨 Visual Assets</h1>
          <p className="text-slate-400">{plan.config.app_name} — Marketing visuals</p>
        </div>
      </div>

      {/* Color Customization */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-3">Color Theme</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setColors({ background: preset.bg, text: preset.text, primary: preset.primary, secondary: preset.secondary })}
              className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full border border-slate-500"
                style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
              />
              {preset.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {[
            { key: 'background' as const, label: 'Background' },
            { key: 'text' as const, label: 'Text' },
            { key: 'primary' as const, label: 'Primary' },
            { key: 'secondary' as const, label: 'Secondary' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="color"
                value={colors[key]}
                onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Assets */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-slate-400">Generating assets...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {assets.map((asset) => (
            <AssetPreview key={asset.type} asset={asset} />
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 mt-8 mb-8">
        <h3 className="text-sm font-semibold text-white mb-2">💡 Tips</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• Download the HTML files and open in a browser to take screenshots at full resolution</li>
          <li>• Use a tool like Puppeteer or Playwright to programmatically render these as PNGs</li>
          <li>• Customize colors using the theme picker above</li>
          <li>• The templates use Google Fonts (Inter, JetBrains Mono) — ensure internet access when rendering</li>
        </ul>
      </div>
    </div>
  );
}
