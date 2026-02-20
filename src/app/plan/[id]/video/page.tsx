'use client';

import { use, useMemo, useState } from 'react';
import PlanNav from '@/components/PlanNav';

type Style = 'landscape' | 'square' | 'vertical';

function emptySlots(n: number) {
  return Array.from({ length: n }, () => '');
}

export default function PlanVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [style, setStyle] = useState<Style>('landscape');
  const [screenshots, setScreenshots] = useState<string[]>(emptySlots(3));
  const [headlines, setHeadlines] = useState<string[]>([
    'A better way to market your product',
    'Turn research into copy in minutes',
    'Ship campaigns faster',
  ]);
  const [musicUrl, setMusicUrl] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const canGenerate = useMemo(() => {
    const filledShots = screenshots.filter((s) => s.trim().length > 0);
    return filledShots.length >= 3 && filledShots.length <= 5 && headlines.length >= 1;
  }, [screenshots, headlines]);

  const updateScreenshot = (idx: number, value: string) => {
    setScreenshots((prev) => prev.map((s, i) => (i === idx ? value : s)));
  };

  const updateHeadline = (idx: number, value: string) => {
    setHeadlines((prev) => prev.map((h, i) => (i === idx ? value : h)));
  };

  const addScreenshot = () => {
    setScreenshots((prev) => (prev.length >= 5 ? prev : [...prev, '']));
  };

  const removeScreenshot = (idx: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
  };

  const addHeadline = () => setHeadlines((prev) => [...prev, '']);
  const removeHeadline = (idx: number) => setHeadlines((prev) => prev.filter((_, i) => i !== idx));

  const handleGenerate = async () => {
    setError('');
    setLoading(true);

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    try {
      const payload = {
        planId: id,
        style,
        screenshots: screenshots.map((s) => s.trim()).filter(Boolean),
        headlines: headlines.map((h) => h.trim()).filter(Boolean),
        musicUrl: musicUrl.trim() || undefined,
      };

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to generate video');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PlanNav planId={id} appName="Video" />

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
        <h1 className="text-xl font-semibold text-white mb-2">🎬 Promo video generator</h1>
        <p className="text-slate-400 text-sm mb-6">
          Paste 3–5 screenshot URLs (or data URLs), add headlines, choose an aspect ratio, and generate a short MP4.
        </p>

        {/* Aspect ratio */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-200 mb-2">Aspect ratio</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as Style)}
            className="w-full sm:w-72 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2"
          >
            <option value="landscape">Landscape (16:9)</option>
            <option value="square">Square (1:1)</option>
            <option value="vertical">Vertical (9:16)</option>
          </select>
        </div>

        {/* Screenshots */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-200">Screenshots (3–5)</label>
            <button
              onClick={addScreenshot}
              disabled={screenshots.length >= 5}
              className="text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
            >
              + Add
            </button>
          </div>

          <div className="space-y-3">
            {screenshots.map((s, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={s}
                  onChange={(e) => updateScreenshot(idx, e.target.value)}
                  placeholder={`Screenshot ${idx + 1} URL or data:image/...`}
                  className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2"
                />
                <button
                  onClick={() => removeScreenshot(idx)}
                  disabled={screenshots.length <= 3}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-3 py-2 rounded-lg border border-slate-700"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Headlines */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-200">Headlines</label>
            <button
              onClick={addHeadline}
              className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg"
            >
              + Add
            </button>
          </div>

          <div className="space-y-3">
            {headlines.map((h, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={h}
                  onChange={(e) => updateHeadline(idx, e.target.value)}
                  placeholder={`Headline ${idx + 1}`}
                  className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2"
                />
                <button
                  onClick={() => removeHeadline(idx)}
                  disabled={headlines.length <= 1}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-3 py-2 rounded-lg border border-slate-700"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-2">
            If you provide fewer headlines than screenshots, the last headline will repeat.
          </p>
        </div>

        {/* Music */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-200 mb-2">Optional music URL</label>
          <input
            value={musicUrl}
            onChange={(e) => setMusicUrl(e.target.value)}
            placeholder="https://.../track.mp3"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2"
          />
          <p className="text-xs text-slate-500 mt-2">If omitted, the video will be generated with silent audio.</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-900/40 text-red-200 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            {loading ? 'Generating… (FFmpeg)' : 'Generate video'}
          </button>

          {videoUrl && (
            <a
              href={videoUrl}
              download={`promo-${id}-${style}.mp4`}
              className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg"
            >
              Download MP4
            </a>
          )}
        </div>

        {videoUrl && (
          <div className="mt-6">
            <div className="text-sm text-slate-300 mb-2">Preview</div>
            <video className="w-full rounded-xl border border-slate-700" controls src={videoUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
