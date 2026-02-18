'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import PlanNav from '@/components/PlanNav';

type Platform = 'instagram' | 'tiktok';

interface SocialPost {
  id: number;
  plan_id: string;
  platform: string;
  caption: string;
  hashtags: string;
  method: string;
  status: string;
  created_at: string;
}

type GeneratedIdea = {
  caption: string;
  hashtags: string[];
};

type ImageResult = {
  filename: string;
  publicUrl: string;
  fullPublicUrl?: string;
};

export default function SocialPage() {
  const params = useParams();
  const planId = params.id as string;

  // Step 1
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

  // Step 2
  const [ideaGenerating, setIdeaGenerating] = useState(false);
  const [ideaError, setIdeaError] = useState<string>('');
  const [idea, setIdea] = useState<GeneratedIdea | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');

  // Step 3
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageError, setImageError] = useState('');
  const [image, setImage] = useState<ImageResult | null>(null);

  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoOperation, setVideoOperation] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null);
  const [videoElapsed, setVideoElapsed] = useState(0);

  // Step 4
  const [queueing, setQueueing] = useState(false);
  const [queueResult, setQueueResult] = useState<{ ok: boolean; message: string } | null>(null);

  // History
  const [history, setHistory] = useState<SocialPost[]>([]);

  // Visibility gates
  const canShowStep2 = selectedPlatform !== null;
  const canShowStep3AndStep4 = idea !== null;

  const hashtagsArray = useMemo(() => {
    if (!hashtagsInput.trim()) return [] as string[];
    return hashtagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [hashtagsInput]);

  // Load history on mount
  useEffect(() => {
    fetch('/api/post-to-buffer')
      .then((r) => r.json())
      .then((d) => setHistory(d.posts || []))
      .catch(() => {});
  }, []);

  // Elapsed timer for video progress bar
  useEffect(() => {
    if (!videoOperation || videoUrl || !videoStartTime) return;

    const timer = setInterval(() => {
      setVideoElapsed(Math.floor((Date.now() - videoStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [videoOperation, videoUrl, videoStartTime]);

  // Poll video status every 10s while operation exists and URL not ready
  useEffect(() => {
    if (!videoOperation || videoUrl) return;

    let cancelled = false;

    async function pollOnce() {
      try {
        const res = await fetch(
          `/api/generate-video/status?operation=${encodeURIComponent(videoOperation)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to poll video status');
        if (cancelled) return;

        if (data?.done === true && data?.videoUrl) {
          setVideoUrl(String(data.videoUrl));
          setVideoGenerating(false);
        }
      } catch (err) {
        if (cancelled) return;
        setVideoError(err instanceof Error ? err.message : 'Failed to poll status');
        setVideoGenerating(false);
      }
    }

    pollOnce();
    const t = setInterval(pollOnce, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [videoOperation, videoUrl]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function generateIdea() {
    if (!selectedPlatform) return;

    setIdeaGenerating(true);
    setIdeaError('');
    setQueueResult(null);

    try {
      const res = await fetch('/api/generate-social-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, platform: selectedPlatform }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      const p = data?.post || {};
      const nextCaption = typeof p.caption === 'string' ? p.caption : '';
      const nextHashtags = Array.isArray(p.hashtags) ? p.hashtags : [];

      setIdea({ caption: nextCaption, hashtags: nextHashtags });
      setCaption(nextCaption);
      setHashtagsInput(nextHashtags.join(', '));

      // Reset media when regenerating
      setImage(null);
      setImageError('');
      setVideoOperation('');
      setVideoUrl('');
      setVideoError('');
    } catch (err) {
      setIdeaError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIdeaGenerating(false);
    }
  }

  async function generateImage() {
    if (!selectedPlatform) return;
    if (!caption.trim()) {
      setImageError('Caption is empty — generate or write a caption first.');
      return;
    }

    setImageGenerating(true);
    setImageError('');
    setQueueResult(null);

    try {
      const res = await fetch('/api/generate-post-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, platform: 'instagram-post', caption }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate image');

      setImage({
        filename: String(data.filename),
        publicUrl: String(data.publicUrl),
        fullPublicUrl: data.fullPublicUrl ? String(data.fullPublicUrl) : undefined,
      });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setImageGenerating(false);
    }
  }

  async function generateVideo() {
    if (!selectedPlatform) return;
    if (!caption.trim()) {
      setVideoError('Caption is empty — generate or write a caption first.');
      return;
    }

    setVideoGenerating(true);
    setVideoError('');
    setVideoOperation('');
    setVideoUrl('');
    setVideoStartTime(null);
    setVideoElapsed(0);
    setQueueResult(null);

    try {
      // 1) Convert caption → Veo prompt
      const promptRes = await fetch('/api/caption-to-veo-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      const promptData = await promptRes.json();
      if (!promptRes.ok) throw new Error(promptData.error || 'Failed to create Veo prompt');

      const veoPrompt = String(promptData.prompt || '').trim();
      if (!veoPrompt) throw new Error('Empty Veo prompt returned');

      // 2) Start Veo video generation
      const aspectRatio = selectedPlatform === 'tiktok' ? '9:16' : '1:1';

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, prompt: veoPrompt, aspectRatio }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start video generation');

      setVideoOperation(String(data.operationName || ''));
      setVideoStartTime(Date.now());
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Failed to generate video');
      setVideoGenerating(false);
    }
  }

  async function queueToBuffer() {
    if (!selectedPlatform) return;

    setQueueing(true);
    setQueueResult(null);

    try {
      const res = await fetch('/api/post-to-buffer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          platform: selectedPlatform,
          caption,
          hashtags: hashtagsArray,
          ...(image?.filename ? { imageFilename: image.filename } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue');

      setQueueResult({ ok: true, message: `✅ Queued to ${selectedPlatform}` });

      // Refresh history
      const histRes = await fetch('/api/post-to-buffer');
      const histData = await histRes.json();
      setHistory(histData.posts || []);
    } catch (err) {
      setQueueResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to queue to Buffer',
      });
    } finally {
      setQueueing(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PlanNav planId={planId} />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Page description */}
        <div className="mb-8 text-sm text-slate-300 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
          Generate platform-native captions and hashtags for Instagram and TikTok, optionally create
          media, then queue directly via Buffer.
        </div>

        <h1 className="text-3xl font-bold mb-2">Social Publishing</h1>
        <p className="text-slate-400 mb-8">A simple 4-step flow to generate, create, and queue posts.</p>

        {/* ── Step 1 ─ Choose channel ─────────────────────────────────────── */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-1">Step 1 · Choose channel</h2>
          <p className="text-sm text-slate-400 mb-5">Pick the platform you want to post to.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedPlatform('instagram')}
              className={`text-left rounded-2xl border p-5 transition-all ${
                selectedPlatform === 'instagram'
                  ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500/30'
                  : 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-600'
              }`}
            >
              <div className="text-3xl mb-3">📸</div>
              <div className="text-lg font-semibold mb-1">Instagram</div>
              <div className="text-sm text-slate-400">
                Square-first content, rich captions and up to 30 hashtags.
              </div>
              {selectedPlatform === 'instagram' && (
                <div className="mt-3 text-xs font-medium text-indigo-400">✓ Selected</div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlatform('tiktok')}
              className={`text-left rounded-2xl border p-5 transition-all ${
                selectedPlatform === 'tiktok'
                  ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500/30'
                  : 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-600'
              }`}
            >
              <div className="text-3xl mb-3">🎵</div>
              <div className="text-lg font-semibold mb-1">TikTok</div>
              <div className="text-sm text-slate-400">
                Vertical-first, punchy copy and trending hashtags (3–5 max).
              </div>
              {selectedPlatform === 'tiktok' && (
                <div className="mt-3 text-xs font-medium text-indigo-400">✓ Selected</div>
              )}
            </button>
          </div>
        </section>

        {/* ── Step 2 ─ Generate post idea ─────────────────────────────────── */}
        {canShowStep2 && (
          <>
            <div className="h-px bg-slate-800 my-8" />

            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-1">Step 2 · Generate post idea</h2>
              <p className="text-sm text-slate-400 mb-5">
                AI will write a{' '}
                <span className="capitalize">{selectedPlatform}</span>-optimised caption and hashtags.
              </p>

              {!idea && (
                <button
                  type="button"
                  onClick={generateIdea}
                  disabled={ideaGenerating}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed font-medium transition"
                >
                  {ideaGenerating ? '✨ Generating…' : 'Generate Post Idea'}
                </button>
              )}

              {ideaError && (
                <div className="mt-4 rounded-xl bg-red-950/40 border border-red-800 p-3 text-sm text-red-200">
                  {ideaError}
                </div>
              )}

              {idea && (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Caption
                      </label>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={6}
                        className="w-full bg-slate-950/40 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Hashtags{' '}
                        <span className="text-slate-500 font-normal">(comma-separated)</span>
                      </label>
                      <input
                        value={hashtagsInput}
                        onChange={(e) => setHashtagsInput(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. appmarketing, saas, creator"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700/60">
                    <button
                      type="button"
                      onClick={generateIdea}
                      disabled={ideaGenerating}
                      className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-sm font-medium transition"
                    >
                      {ideaGenerating ? '✨ Regenerating…' : '↺ Regenerate'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Steps 3 & 4 — only visible after a post idea is generated ────── */}
        {canShowStep3AndStep4 && (
          <>
            {/* ── Step 3 ─ Create media (optional) ──────────────────────── */}
            <div className="h-px bg-slate-800 my-8" />

            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-1">
                Step 3 · Create media{' '}
                <span className="text-slate-500 font-normal text-base">(optional)</span>
              </h2>
              <p className="text-sm text-slate-400 mb-5">
                Generate an image or video tailored to your post idea.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={generateImage}
                  disabled={imageGenerating}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed font-medium transition"
                >
                  {imageGenerating ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Generating image…
                    </>
                  ) : (
                    <>🖼 Generate Image</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={generateVideo}
                  disabled={videoGenerating}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed font-medium transition"
                >
                  {videoGenerating ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Generating video…
                    </>
                  ) : (
                    <>🎬 Generate Video (Veo 2)</>
                  )}
                </button>
              </div>

              {imageError && (
                <div className="mt-4 rounded-xl bg-red-950/40 border border-red-800 p-3 text-sm text-red-200">
                  {imageError}
                </div>
              )}

              {videoError && (
                <div className="mt-4 rounded-xl bg-red-950/40 border border-red-800 p-3 text-sm text-red-200">
                  {videoError}
                </div>
              )}

              {/* Image preview */}
              {image && (
                <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
                  <div className="text-sm font-medium text-emerald-400 mb-3">✅ Image ready</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.publicUrl}
                    alt="Generated post image"
                    className="w-full max-w-sm rounded-xl border border-slate-700"
                  />
                  <div className="text-xs text-slate-500 mt-2 break-all">{image.filename}</div>
                </div>
              )}

              {/* Video polling state — progress bar */}
              {videoOperation && !videoUrl && (() => {
                const TOTAL_SECONDS = 90;
                const progress = Math.min(videoElapsed / TOTAL_SECONDS, 0.95);
                const remaining = Math.max(TOTAL_SECONDS - videoElapsed, 0);
                const remainingLabel = remaining > 0 ? `~${remaining}s remaining` : 'Almost done…';

                return (
                  <div className="mt-6 bg-slate-900/40 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl animate-pulse">🎬</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-200">Generating video…</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Veo 2 typically takes ~90 seconds
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">
                        {remainingLabel}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-xs text-slate-600 text-right">
                      {videoElapsed}s elapsed
                    </div>
                  </div>
                );
              })()}

              {/* Video download */}
              {videoUrl && (
                <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
                  <div className="text-sm font-medium text-emerald-400 mb-3">✅ Video ready</div>
                  <a
                    href={`/api/download-video?uri=${encodeURIComponent(videoUrl)}`}
                    download="promo-video.mp4"
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                  >
                    ⬇️ Download MP4
                  </a>
                </div>
              )}
            </section>

            {/* ── Step 4 ─ Queue to Buffer ───────────────────────────────── */}
            <div className="h-px bg-slate-800 my-8" />

            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-1">Step 4 · Queue to Buffer</h2>
              <p className="text-sm text-slate-400 mb-5">
                {image
                  ? 'Your post will be queued with the generated image attached.'
                  : 'Your post will be queued as text + hashtags (no media).'}
              </p>

              <button
                type="button"
                onClick={queueToBuffer}
                disabled={queueing}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed font-medium transition"
              >
                {queueing ? 'Queueing…' : 'Add to Buffer Queue'}
              </button>

              {queueResult && (
                <div
                  className={`mt-4 rounded-xl border p-3 text-sm ${
                    queueResult.ok
                      ? 'bg-emerald-950/30 border-emerald-700 text-emerald-200'
                      : 'bg-red-950/40 border-red-800 text-red-200'
                  }`}
                >
                  {queueResult.message}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Posting History ─────────────────────────────────────────────── */}
        <div className="mt-10 bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Posting History</h2>
          {history.length === 0 ? (
            <p className="text-slate-500 text-sm">No posts yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map((post) => (
                <div
                  key={post.id}
                  className="bg-slate-900/40 border border-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium capitalize">{post.platform}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        post.status === 'queued'
                          ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-800/50'
                          : post.status === 'failed'
                            ? 'bg-red-950/40 text-red-200 border border-red-800/50'
                            : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {post.status}
                    </span>
                    <span className="text-xs text-slate-500 ml-auto">{post.created_at}</span>
                  </div>
                  <div className="text-sm text-slate-200 whitespace-pre-wrap line-clamp-3">
                    {post.caption}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
