'use client';

import { useState, useEffect, useRef, use } from 'react';
import { MarketingPlan, GeneratedAsset, AssetConfig } from '@/lib/types';
import PlanNav from '@/components/PlanNav';

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className || 'h-4 w-4'}`}
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function AssetPreview({ asset }: { asset: GeneratedAsset }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [renderingPng, setRenderingPng] = useState(false);
  const [renderError, setRenderError] = useState('');

  const handleDownloadHtml = () => {
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

  const handleDownloadPng = async () => {
    setRenderingPng(true);
    setRenderError('');
    try {
      const res = await fetch('/api/render-png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: asset.html,
          width: asset.width,
          height: asset.height,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Render failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asset.type}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setRenderError(
        err instanceof Error ? err.message : 'Failed to render PNG'
      );
    } finally {
      setRenderingPng(false);
    }
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
            <p className="text-xs text-slate-500">
              {asset.width}×{asset.height}px
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopyHtml}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              📋 Copy HTML
            </button>
            <button
              onClick={handleDownloadHtml}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              📄 HTML
            </button>
            <button
              onClick={handleDownloadPng}
              disabled={renderingPng}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {renderingPng ? (
                <>
                  <Spinner className="h-3 w-3" />
                  Rendering…
                </>
              ) : (
                '⬇️ Download PNG'
              )}
            </button>
          </div>
        </div>
        {renderError && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {renderError}
          </div>
        )}
      </div>
      <div
        className="p-4 bg-slate-900/50 flex justify-center"
        style={{ minHeight: scaledHeight + 16 }}
      >
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

export default function AssetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipError, setZipError] = useState('');

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
      } catch {
        /* fall through */
      }
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
      if (!res.ok)
        throw new Error(result.error || 'Failed to generate assets');
      setAssets(result.assets);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate assets'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (assets.length === 0) return;
    setDownloadingZip(true);
    setZipError('');
    try {
      const zipAssets = assets.map((a) => ({
        html: a.html,
        width: a.width,
        height: a.height,
        filename: `${a.type}.png`,
      }));

      const res = await fetch('/api/render-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: zipAssets }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Render failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'marketing-assets.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setZipError(
        err instanceof Error ? err.message : 'Failed to render ZIP'
      );
    } finally {
      setDownloadingZip(false);
    }
  };

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <a
          href="/"
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Start a new analysis
        </a>
      </div>
    );
  }

  const COLOR_PRESETS = [
    {
      name: 'Indigo Dark',
      bg: '#0f172a',
      text: '#e2e8f0',
      primary: '#6366f1',
      secondary: '#8b5cf6',
    },
    {
      name: 'Ocean',
      bg: '#0c1222',
      text: '#e0f2fe',
      primary: '#0ea5e9',
      secondary: '#06b6d4',
    },
    {
      name: 'Emerald',
      bg: '#0f1f17',
      text: '#d1fae5',
      primary: '#10b981',
      secondary: '#34d399',
    },
    {
      name: 'Rose',
      bg: '#1a0f16',
      text: '#fce7f3',
      primary: '#f43f5e',
      secondary: '#ec4899',
    },
    {
      name: 'Amber',
      bg: '#1a1508',
      text: '#fef3c7',
      primary: '#f59e0b',
      secondary: '#eab308',
    },
    {
      name: 'Light',
      bg: '#f8fafc',
      text: '#1e293b',
      primary: '#6366f1',
      secondary: '#8b5cf6',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">🎨 Visual Assets</h1>
          <p className="text-slate-400">
            {plan.config.app_name} — Marketing visuals
          </p>
        </div>
        {assets.length > 0 && !loading && (
          <button
            onClick={handleDownloadAllZip}
            disabled={downloadingZip}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          >
            {downloadingZip ? (
              <>
                <Spinner className="h-4 w-4" />
                Rendering all…
              </>
            ) : (
              '📦 Download All (ZIP)'
            )}
          </button>
        )}
      </div>

      {/* ZIP error */}
      {zipError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {zipError}
        </div>
      )}

      {/* Color Customization */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-3">Color Theme</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                setColors({
                  background: preset.bg,
                  text: preset.text,
                  primary: preset.primary,
                  secondary: preset.secondary,
                })
              }
              className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full border border-slate-500"
                style={{
                  background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                }}
              />
              {preset.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {(
            [
              { key: 'background' as const, label: 'Background' },
              { key: 'text' as const, label: 'Text' },
              { key: 'primary' as const, label: 'Primary' },
              { key: 'secondary' as const, label: 'Secondary' },
            ] as const
          ).map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 text-xs text-slate-400"
            >
              <input
                type="color"
                value={colors[key]}
                onChange={(e) =>
                  setColors({ ...colors, [key]: e.target.value })
                }
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
          <li>
            • Click <strong>&quot;⬇️ Download PNG&quot;</strong> on each asset
            for a pixel-perfect render
          </li>
          <li>
            • Use <strong>&quot;📦 Download All (ZIP)&quot;</strong> to get all
            assets in one file
          </li>
          <li>
            • Customize colors using the theme picker above — PNGs render with
            your chosen theme
          </li>
          <li>
            • Templates use Google Fonts (Inter, JetBrains Mono) — renders
            include them automatically
          </li>
        </ul>
      </div>
    </div>
  );
}
