'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { MarketingPlan, GeneratedAsset, AssetConfig } from '@/lib/types';
import PlanNav from '@/components/PlanNav';
import {
  generateSocialTemplates,
  type SocialPlatform,
  type SocialStyle,
} from '@/lib/socialTemplates';

type CompositeDevice = 'iphone-15' | 'iphone-15-pro' | 'android';

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

type ComposerItem = {
  id: string;
  imageUrl: string;
  imageBase64?: string;
  headline: string;
  subheadline: string;
  badge: string;
  previewUrl?: string;
  loading?: boolean;
  error?: string;
};

function ScreenshotCompositorSection({
  planId,
  appName,
}: {
  planId: string;
  appName: string;
}) {
  const [device, setDevice] = useState<CompositeDevice>('iphone-15-pro');
  const [background, setBackground] = useState(
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  );
  const [textColor, setTextColor] = useState('#ffffff');

  const [items, setItems] = useState<ComposerItem[]>(() => [
    {
      id: crypto.randomUUID(),
      imageUrl: '',
      headline: 'Your headline here',
      subheadline: '',
      badge: '',
    },
  ]);

  const [generatingAll, setGeneratingAll] = useState(false);
  const [generateAllError, setGenerateAllError] = useState('');

  useEffect(() => {
    return () => {
      // revoke previews on unmount
      items.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<ComposerItem>) => {
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          if (patch.previewUrl && i.previewUrl && i.previewUrl !== patch.previewUrl) {
            URL.revokeObjectURL(i.previewUrl);
          }
          return { ...i, ...patch };
        })
      );
    },
    []
  );

  const handlePickFile = async (id: string, file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    updateItem(id, {
      imageBase64: dataUrl,
      imageUrl: '',
      error: '',
    });
  };

  const handlePreview = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    updateItem(id, { loading: true, error: '' });
    try {
      const res = await fetch('/api/composite-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: item.imageUrl || undefined,
          imageBase64: item.imageBase64 || undefined,
          headline: item.headline,
          subheadline: item.subheadline || undefined,
          badge: item.badge || undefined,
          device,
          backgroundColor: background,
          textColor,
          appName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Composite failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      updateItem(id, { previewUrl: url });
    } catch (err) {
      updateItem(id, {
        error: err instanceof Error ? err.message : 'Failed to generate preview',
      });
    } finally {
      updateItem(id, { loading: false });
    }
  };

  const handleDownloadPreview = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item?.previewUrl) return;
    const a = document.createElement('a');
    a.href = item.previewUrl;
    a.download = `composited-${id}.png`;
    a.click();
  };

  const handleGenerateAll = async () => {
    const usable = items.filter((i) => i.headline && (i.imageUrl || i.imageBase64));
    if (usable.length === 0) {
      setGenerateAllError('Add at least one screenshot with a headline and an image.');
      return;
    }

    setGeneratingAll(true);
    setGenerateAllError('');
    try {
      const res = await fetch('/api/composite-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          device,
          backgroundColor: background,
          textColor,
          screenshots: usable.map((s) => ({
            imageUrl: s.imageUrl || undefined,
            imageBase64: s.imageBase64 || undefined,
            headline: s.headline,
            subheadline: s.subheadline || undefined,
            badge: s.badge || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Batch composite failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-screenshots.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setGenerateAllError(
        err instanceof Error ? err.message : 'Failed to generate ZIP'
      );
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 mt-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">📱 Screenshot Compositor</h2>
          <p className="text-sm text-slate-400 mt-1">
            Wrap raw app screenshots in a device frame + headline (App Store / Play Store size: 1290×2796)
          </p>
        </div>
        <button
          onClick={handleGenerateAll}
          disabled={generatingAll}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
        >
          {generatingAll ? (
            <>
              <Spinner className="h-4 w-4" />
              Generating…
            </>
          ) : (
            '📦 Generate All (ZIP)'
          )}
        </button>
      </div>

      {generateAllError && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {generateAllError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <label className="text-xs text-slate-400 flex flex-col gap-2">
          Device
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value as CompositeDevice)}
            className="bg-slate-900/60 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
          >
            <option value="iphone-15">iPhone 15</option>
            <option value="iphone-15-pro">iPhone 15 Pro</option>
            <option value="android">Android</option>
          </select>
        </label>

        <label className="text-xs text-slate-400 flex flex-col gap-2">
          Background (CSS)
          <input
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            className="bg-slate-900/60 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
            placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />
          <span className="text-[11px] text-slate-500">
            Tip: you can paste a CSS gradient or a hex color.
          </span>
        </label>

        <label className="text-xs text-slate-400 flex flex-col gap-2">
          Text color
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <input
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="flex-1 bg-slate-900/60 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
            />
          </div>
        </label>
      </div>

      <div className="mt-6 space-y-6">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="bg-slate-900/40 border border-slate-700/50 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-white">
                  Screenshot {idx + 1}
                </div>
                <div className="text-xs text-slate-500">
                  Provide either an image URL or upload a file.
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(item.id)}
                  disabled={item.loading}
                  className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  {item.loading ? (
                    <>
                      <Spinner className="h-3 w-3" />
                      Rendering…
                    </>
                  ) : (
                    '👀 Preview'
                  )}
                </button>
                <button
                  onClick={() => handleDownloadPreview(item.id)}
                  disabled={!item.previewUrl}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
                >
                  ⬇️ PNG
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Image URL
                  <input
                    value={item.imageUrl}
                    onChange={(e) =>
                      updateItem(item.id, {
                        imageUrl: e.target.value,
                        imageBase64: undefined,
                      })
                    }
                    className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                    placeholder="https://…"
                  />
                </label>

                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Upload file
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePickFile(item.id, file);
                    }}
                    className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                    Badge (optional)
                    <input
                      value={item.badge}
                      onChange={(e) => updateItem(item.id, { badge: e.target.value })}
                      className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                      placeholder="NEW"
                    />
                  </label>
                  <div className="text-xs text-slate-500 flex items-end pb-2">
                    Examples: NEW, FREE, ★ 4.9
                  </div>
                </div>

                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Headline
                  <input
                    value={item.headline}
                    onChange={(e) => updateItem(item.id, { headline: e.target.value })}
                    className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                    placeholder="Track your habits in seconds"
                  />
                </label>

                <label className="text-xs text-slate-400 flex flex-col gap-1.5">
                  Subheadline (optional)
                  <input
                    value={item.subheadline}
                    onChange={(e) =>
                      updateItem(item.id, { subheadline: e.target.value })
                    }
                    className="bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                    placeholder="Simple. Fast. Beautiful."
                  />
                </label>

                {item.error && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {item.error}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() =>
                      setItems((prev) =>
                        prev.filter((p) => {
                          if (p.id !== item.id) return true;
                          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
                          return false;
                        })
                      )
                    }
                    disabled={items.length <= 1}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    🗑️ Remove
                  </button>
                  <button
                    onClick={() =>
                      setItems((prev) => [
                        ...prev,
                        {
                          id: crypto.randomUUID(),
                          imageUrl: '',
                          headline: 'Another headline',
                          subheadline: '',
                          badge: '',
                        },
                      ])
                    }
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    ➕ Add
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-3 flex items-center justify-center">
                {item.previewUrl ? (
                  // Render at a sensible preview size
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt="Composited preview"
                    className="max-h-[560px] w-auto rounded-xl shadow-xl"
                  />
                ) : (
                  <div className="text-sm text-slate-500 text-center px-6">
                    Click <strong>Preview</strong> to render a PNG.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialTemplatePreview({
  template,
}: {
  template: {
    label: string;
    width: number;
    height: number;
    html: string;
  };
}) {
  const scale = Math.min(1, 360 / template.width);
  const scaledHeight = template.height * scale;

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-semibold text-white text-sm">{template.label}</div>
          <div className="text-[11px] text-slate-500">
            {template.width}×{template.height}
          </div>
        </div>
      </div>
      <div
        className="p-3 bg-slate-900/50 flex justify-center"
        style={{ minHeight: scaledHeight + 12 }}
      >
        <div
          style={{
            width: template.width,
            height: template.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <iframe
            srcDoc={template.html}
            width={template.width}
            height={template.height}
            style={{ border: 'none', borderRadius: '10px' }}
            sandbox="allow-same-origin"
            title={template.label}
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

  // Social images
  const ALL_PLATFORMS: { key: SocialPlatform; label: string }[] = [
    { key: 'twitter', label: 'Twitter Card' },
    { key: 'linkedin', label: 'LinkedIn Post' },
    { key: 'instagram-post', label: 'Instagram Post' },
    { key: 'instagram-story', label: 'Instagram Story' },
    { key: 'facebook-og', label: 'Facebook OG' },
  ];

  const [socialPlatforms, setSocialPlatforms] = useState<Record<SocialPlatform, boolean>>({
    twitter: true,
    linkedin: true,
    'instagram-post': true,
    'instagram-story': true,
    'facebook-og': true,
  });
  const [socialStyle, setSocialStyle] = useState<SocialStyle>('gradient');
  const [accentColor, setAccentColor] = useState('#667eea');
  const [socialTemplates, setSocialTemplates] = useState<
    { label: string; width: number; height: number; html: string }[]
  >([]);
  const [downloadingSocialZip, setDownloadingSocialZip] = useState(false);
  const [socialZipError, setSocialZipError] = useState('');

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

  useEffect(() => {
    if (!plan) return;
    const selected = (Object.entries(socialPlatforms) as [SocialPlatform, boolean][]) 
      .filter(([, on]) => on)
      .map(([k]) => k);

    const templates = generateSocialTemplates({
      plan,
      platforms: selected,
      style: socialStyle,
      accentColor,
    }).map((t) => ({
      label: t.label,
      width: t.width,
      height: t.height,
      html: t.html,
    }));

    setSocialTemplates(templates);
  }, [plan, socialPlatforms, socialStyle, accentColor]);

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

  const handleDownloadSocialPack = async () => {
    setDownloadingSocialZip(true);
    setSocialZipError('');
    try {
      const selected = (Object.entries(socialPlatforms) as [SocialPlatform, boolean][]) 
        .filter(([, on]) => on)
        .map(([k]) => k);

      if (selected.length === 0) {
        setSocialZipError('Select at least one platform.');
        return;
      }

      const res = await fetch('/api/generate-social-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          platforms: selected,
          style: socialStyle,
          accentColor,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error || 'Failed to generate social pack');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'social-images.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSocialZipError(
        err instanceof Error ? err.message : 'Failed to generate social pack'
      );
    } finally {
      setDownloadingSocialZip(false);
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

      {/* Screenshot compositor */}
      <ScreenshotCompositorSection planId={id} appName={plan.config.app_name} />

      {/* Social Images */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mt-10 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-white">📣 Social Images</h2>
            <p className="text-sm text-slate-400 mt-1">
              Platform-sized, branded PNGs generated from your plan.
            </p>
          </div>
          <button
            onClick={handleDownloadSocialPack}
            disabled={downloadingSocialZip}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          >
            {downloadingSocialZip ? (
              <>
                <Spinner className="h-4 w-4" />
                Generating…
              </>
            ) : (
              '📦 Generate Social Pack'
            )}
          </button>
        </div>

        {socialZipError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mt-4 text-red-400 text-sm">
            {socialZipError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <div className="text-xs font-semibold text-white mb-2">
              Platforms
            </div>
            <div className="space-y-2">
              {ALL_PLATFORMS.map((p) => (
                <label
                  key={p.key}
                  className="flex items-center justify-between gap-3 text-sm text-slate-300 bg-slate-900/40 border border-slate-700/60 rounded-xl px-3 py-2"
                >
                  <span>{p.label}</span>
                  <input
                    type="checkbox"
                    checked={socialPlatforms[p.key]}
                    onChange={(e) =>
                      setSocialPlatforms({
                        ...socialPlatforms,
                        [p.key]: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-indigo-500"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 text-xs font-semibold text-white mb-2">
              Style
            </div>
            <select
              value={socialStyle}
              onChange={(e) => setSocialStyle(e.target.value as SocialStyle)}
              className="w-full bg-slate-900/40 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200"
            >
              <option value="gradient">Gradient</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>

            <div className="mt-5 text-xs font-semibold text-white mb-2">
              Accent color
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-300 bg-slate-900/40 border border-slate-700/60 rounded-xl px-3 py-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer border-0"
              />
              <span className="text-xs text-slate-400">{accentColor}</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-white mb-2">
              Previews
            </div>
            {socialTemplates.length === 0 ? (
              <div className="text-sm text-slate-400">
                Select at least one platform.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {socialTemplates.map((t) => (
                  <SocialTemplatePreview
                    key={`${t.label}-${t.width}x${t.height}`}
                    template={t}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
            • Social templates use system fonts (Inter if available) — no external font loading
          </li>
        </ul>
      </div>
    </div>
  );
}
