'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

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
  const [topicInput, setTopicInput] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{
    dataUrl?: string;
    filename?: string;
    publicUrl?: string;
    mimeType: string;
    base64Data?: string;
  }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [ideaGenerating, setIdeaGenerating] = useState(false);
  const [ideaError, setIdeaError] = useState<string>('');
  const [idea, setIdea] = useState<GeneratedIdea | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');

  // Step 3
  const [imageMode, setImageMode] = useState<'screenshot' | 'hero' | 'hybrid'>('hybrid');
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

  // Guard to prevent save effect from re-writing hydrated data on mount
  const hydrated = useRef(false);

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
      .catch(() => { });
  }, []);

  // Hydrate state from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`social-${planId}`);
      if (!saved) { hydrated.current = true; return; }
      const data = JSON.parse(saved);
      if (data.selectedPlatform) setSelectedPlatform(data.selectedPlatform);
      if (data.topicInput) setTopicInput(data.topicInput);
      if (data.caption) setCaption(data.caption);
      if (data.hashtagsInput) setHashtagsInput(data.hashtagsInput);
      if (data.imageMode) setImageMode(data.imageMode);
      if (data.idea) setIdea(data.idea);
      if (data.image) setImage(data.image);
      if (Array.isArray(data.uploadedPhotos)) setUploadedPhotos(data.uploadedPhotos);
    } catch { /* ignore corrupted data */ }
    // Mark hydration complete after a tick so the save effect skips the first run
    requestAnimationFrame(() => { hydrated.current = true; });
  }, [planId]);

  // Debounced save state to sessionStorage
  useEffect(() => {
    if (!selectedPlatform || !hydrated.current) return; // don't save empty or pre-hydration state
    const timer = setTimeout(() => {
      try {
        // Strip base64/dataUrl from photos to avoid exceeding sessionStorage limits
        const photosForStorage = uploadedPhotos.map(({ dataUrl: _d, base64Data: _b, ...rest }) => rest);
        const snapshot = { selectedPlatform, topicInput, caption, hashtagsInput, imageMode, idea, image, uploadedPhotos: photosForStorage };
        sessionStorage.setItem(`social-${planId}`, JSON.stringify(snapshot));
      } catch { /* sessionStorage full or unavailable */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedPlatform, topicInput, caption, hashtagsInput, imageMode, idea, image, uploadedPhotos, planId]);

  // Elapsed timer for video progress bar
  useEffect(() => {
    if (!videoOperation || videoUrl || !videoStartTime) return;

    const timer = setInterval(() => {
      setVideoElapsed(Math.floor((Date.now() - videoStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [videoOperation, videoUrl, videoStartTime]);

  // Poll video status every 10s while operation exists and URL not ready
  // Times out after 5 minutes to avoid infinite polling
  useEffect(() => {
    if (!videoOperation || videoUrl) return;

    let cancelled = false;
    const VIDEO_TIMEOUT_MS = 5 * 60 * 1000;
    const startedAt = Date.now();

    async function pollOnce() {
      if (Date.now() - startedAt > VIDEO_TIMEOUT_MS) {
        if (!cancelled) {
          setVideoError('Video generation timed out. Please try again.');
          setVideoGenerating(false);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/generate-video/status?taskId=${encodeURIComponent(videoOperation)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to poll video status');
        if (cancelled) return;

        if (data?.done === true && data?.videoUrl) {
          setVideoUrl(String(data.videoUrl));
          setVideoGenerating(false);
        } else if (data?.done === true) {
          setVideoError(data?.error ? String(data.error) : 'Video generation completed without a result');
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

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const remaining = 3 - uploadedPhotos.length;
    const toProcess = Array.from(files).slice(0, remaining);
    let skipped = 0;

    for (const file of toProcess) {
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        skipped++;
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) return;

        setUploadedPhotos((prev) => {
          if (prev.length >= 3) return prev;
          return [...prev, { dataUrl, mimeType: match[1], base64Data: match[2] }];
        });
      };
      reader.readAsDataURL(file);
    }

    if (skipped > 0) {
      setIdeaError(`${skipped} file(s) skipped — only PNG, JPEG, and WebP under 5 MB are accepted.`);
    }

    // Reset input so re-selecting the same file triggers change
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(index: number) {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function generateIdea() {
    if (!selectedPlatform) return;

    setIdeaGenerating(true);
    setIdeaError('');
    setQueueResult(null);

    try {
      // Upload photos to server if any are new (no filename yet)
      let photos = uploadedPhotos;
      const newPhotos = photos.filter((p) => !p.filename);
      if (newPhotos.length > 0) {
        setUploading(true);
        try {
          const uploadRes = await fetch('/api/upload-photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photos: newPhotos.map((p) => p.dataUrl) }),
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) {
            throw new Error(uploadData.error || 'Failed to upload photos');
          }
          if (Array.isArray(uploadData.files)) {
            let fileIdx = 0;
            photos = photos.map((p) => {
              if (!p.filename && fileIdx < uploadData.files.length) {
                const f = uploadData.files[fileIdx++];
                return { ...p, filename: f.filename, publicUrl: f.publicUrl };
              }
              return p;
            });
            setUploadedPhotos(photos);
          }
        } finally {
          setUploading(false);
        }
      }

      // Build images array for multimodal Gemini
      const images = photos
        .filter((p) => p.mimeType && p.base64Data)
        .map((p) => ({ mimeType: p.mimeType, base64Data: p.base64Data }));

      const res = await fetch('/api/generate-social-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          platform: selectedPlatform,
          topic: topicInput.trim() || undefined,
          images: images.length > 0 ? images : undefined,
        }),
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
      // Generate an image brief from the caption hook (best-effort). If it fails, we still render.
      let imageBrief: unknown = null;
      try {
        const briefRes = await fetch('/api/caption-to-image-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption, platform: selectedPlatform }),
        });
        if (briefRes.ok) imageBrief = await briefRes.json();
      } catch {
        // ignore
      }

      const res = await fetch('/api/generate-post-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, platform: 'instagram-post', caption, visualMode: imageMode, imageBrief }),
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
      // 1) Convert caption -> video prompt
      const promptRes = await fetch('/api/caption-to-veo-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      const promptData = await promptRes.json();
      if (!promptRes.ok) throw new Error(promptData.error || 'Failed to create video prompt');

      const videoPrompt = String(promptData.prompt || '').trim();
      if (!videoPrompt) throw new Error('Empty video prompt returned');

      // 2) Start video generation
      const aspectRatio = selectedPlatform === 'tiktok' ? '9:16' : '1:1';

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, prompt: videoPrompt, aspectRatio }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start video generation');

      setVideoOperation(String(data.taskId || ''));
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

      // Clear persisted state after successful queue
      sessionStorage.removeItem(`social-${planId}`);

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

  // ─── Combined generate: caption + hero in parallel ─────────────────────────

  const isGenerating = ideaGenerating || imageGenerating;

  async function generatePost() {
    if (!selectedPlatform) return;

    // Fire both caption and image generation in parallel
    // generateIdea sets the caption/hashtags state; once done, we also kick off the image
    // We sequence them: idea first (since image needs caption), but start image right after
    await generateIdea();
    // After idea completes, caption state is set — now generate hero image
    generateImage();
  }

  function startOver() {
    sessionStorage.removeItem(`social-${planId}`);
    setSelectedPlatform(null);
    setTopicInput('');
    setUploadedPhotos([]);
    setCaption('');
    setHashtagsInput('');
    setImageMode('hero');
    setIdea(null);
    setImage(null);
    setIdeaError('');
    setImageError('');
    setVideoOperation('');
    setVideoUrl('');
    setVideoError('');
    setQueueResult(null);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-6 text-slate-900 dark:text-white">

      <h1 className="text-3xl font-bold mb-2">Create a Post</h1>
      <p className="mb-8 text-slate-600 dark:text-slate-400">
        Pick a platform, add your direction or photos, and generate a ready-to-publish post.
      </p>

      {/* ── SETUP ZONE ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">

        {/* Platform toggle pills */}
        <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Platform
        </label>
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSelectedPlatform('instagram')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${selectedPlatform === 'instagram'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
          >
            📸 Instagram
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('tiktok')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${selectedPlatform === 'tiktok'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
          >
            🎵 TikTok
          </button>
        </div>

        {/* Direction */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            What&apos;s this post about? <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            rows={2}
            placeholder='e.g. "Launching dark mode" or "Behind the scenes of building v2"'
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Photo uploads */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Your photos <span className="text-slate-500 font-normal">(optional, max 3)</span>
          </label>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Upload your own images — they&apos;ll appear alongside the generated hero in your post.
          </p>

          <div className="flex flex-wrap gap-3 items-center">
            {uploadedPhotos.map((photo, idx) => (
              <div key={idx} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.dataUrl || photo.publicUrl || ''}
                  alt={`Upload ${idx + 1}`}
                  className="h-20 w-20 rounded-lg border border-slate-300 object-cover dark:border-slate-600"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}

            {uploadedPhotos.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:border-slate-500"
              >
                <span className="text-2xl">+</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* Generate Post button */}
        <button
          type="button"
          onClick={generatePost}
          disabled={!selectedPlatform || isGenerating}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          {isGenerating ? '✨ Generating post…' : '✨ Generate Post'}
        </button>

        {ideaError && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {ideaError}
          </div>
        )}
      </section>

      {/* ── RESULT ZONE ────────────────────────────────────────────────── */}
      {idea && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
          <h2 className="text-lg font-semibold mb-4">Your Post</h2>

          {/* Editable caption */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* Editable hashtags */}
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Hashtags <span className="text-slate-500 font-normal">(comma-separated)</span>
            </label>
            <input
              value={hashtagsInput}
              onChange={(e) => setHashtagsInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500"
              placeholder="e.g. appmarketing, saas, creator"
            />
          </div>

          {/* Media strip — hero image + user photos side by side */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Media
            </label>

            <div className="flex flex-wrap gap-3">
              {/* Generated hero image */}
              {image && (
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.publicUrl}
                    alt="Generated hero"
                    className="h-32 w-32 rounded-xl border border-slate-300 object-cover dark:border-slate-700"
                  />
                  <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    AI Hero
                  </div>
                </div>
              )}

              {imageGenerating && !image && (
                <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-center">
                    <div className="animate-spin text-xl mb-1">⏳</div>
                    <div className="text-xs text-slate-500">Generating…</div>
                  </div>
                </div>
              )}

              {/* User-uploaded photos */}
              {uploadedPhotos.filter((p) => p.publicUrl || p.dataUrl).map((photo, idx) => (
                <div key={idx} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.dataUrl || photo.publicUrl || ''}
                    alt={`Your photo ${idx + 1}`}
                    className="h-32 w-32 rounded-xl border border-slate-300 object-cover dark:border-slate-700"
                  />
                  <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    Your photo
                  </div>
                </div>
              ))}
            </div>

            {imageError && (
              <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                {imageError}
              </div>
            )}

            {/* Media actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateImage}
                disabled={imageGenerating}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {imageGenerating ? 'Generating…' : image ? '🖼 New Hero Image' : '🖼 Generate Hero Image'}
              </button>
              <button
                type="button"
                onClick={generateVideo}
                disabled={videoGenerating}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {videoGenerating ? 'Generating…' : '🎬 Generate Video'}
              </button>
            </div>
          </div>

          {/* Video progress */}
          {videoOperation && !videoUrl && (() => {
            const TOTAL_SECONDS = 90;
            const progress = Math.min(videoElapsed / TOTAL_SECONDS, 0.95);
            const remaining = Math.max(TOTAL_SECONDS - videoElapsed, 0);
            const remainingLabel = remaining > 0 ? `~${remaining}s remaining` : 'Almost done…';

            return (
              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl animate-pulse">🎬</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 dark:text-slate-200">Generating video…</div>
                    <div className="text-xs text-slate-500 mt-0.5">Typically takes ~90 seconds</div>
                  </div>
                  <div className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {remainingLabel}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-700">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Video result */}
          {videoUrl && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">✅ Video ready</div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/download-video?uri=${encodeURIComponent(videoUrl)}&aspect=${selectedPlatform === 'tiktok' ? '9:16' : '1:1'}`}
                  download="promo-video.mp4"
                  className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                >
                  ⬇ Download MP4
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (typeof navigator !== 'undefined' && navigator.share) {
                        const res = await fetch(`/api/download-video?uri=${encodeURIComponent(videoUrl)}`);
                        const blob = await res.blob();
                        const file = new File([blob], 'promo-video.mp4', { type: 'video/mp4' });
                        await navigator.share({ files: [file] });
                      }
                    } catch { /* user cancelled */ }
                  }}
                  className="inline-flex items-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                >
                  Share
                </button>
              </div>
            </div>
          )}

          {videoError && (
            <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
              {videoError}
            </div>
          )}

          {/* ── Action bar ─────────────────────────────────────────────── */}
          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex flex-wrap gap-3">
              {/* Primary: Queue to Buffer */}
              <button
                type="button"
                onClick={queueToBuffer}
                disabled={queueing}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                {queueing ? 'Queueing…' : '📤 Queue to Buffer'}
              </button>

              {/* Copy caption */}
              <button
                type="button"
                onClick={() => {
                  const fullText = `${caption}\n\n${hashtagsArray.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}`;
                  navigator.clipboard.writeText(fullText);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                📋 Copy
              </button>

              {/* Download image */}
              {image && (
                <a
                  href={image.fullPublicUrl || image.publicUrl}
                  download={image.filename}
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  ⬇ Download Image
                </a>
              )}

              {/* Regenerate */}
              <button
                type="button"
                onClick={generateIdea}
                disabled={ideaGenerating}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                ↻ Regenerate
              </button>

              {/* Start over */}
              <button
                type="button"
                onClick={startOver}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Start Over
              </button>
            </div>

            {queueResult && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${queueResult.ok
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                  }`}
              >
                {queueResult.message}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Posting History (only show if there are posts) ───────────────── */}
      {history.length > 0 && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/30">
          <h2 className="text-lg font-semibold mb-4">Posting History</h2>
          <div className="space-y-3">
            {history.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium capitalize">{post.platform}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${post.status === 'queued'
                        ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : post.status === 'failed'
                          ? 'border border-red-300 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200'
                          : 'border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                  >
                    {post.status}
                  </span>
                  <span className="text-xs text-slate-500 ml-auto">{post.created_at}</span>
                </div>
                <div className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                  {post.caption}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
