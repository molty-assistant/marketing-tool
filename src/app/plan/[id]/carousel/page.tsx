'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Loader2, Download, Share2, GripVertical, Pencil, Check, X, ImagePlus } from 'lucide-react';

type CarouselSlide = {
  index: number;
  type: 'hero' | 'feature' | 'cta';
  headline: string;
  subtext: string;
  publicUrl: string;
  filename: string;
};

type Mode = 'auto' | 'guided' | 'manual';

export default function CarouselPage() {
  const params = useParams();
  const planId = params.id as string;

  // Config
  const [mode, setMode] = useState<Mode>('auto');
  const [direction, setDirection] = useState('');
  const [slideCount, setSlideCount] = useState(5);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Results
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [concept, setConcept] = useState('');

  // Editing — keyed by filename (not index) to avoid race conditions on reorder
  const [editingFilename, setEditingFilename] = useState<string | null>(null);
  const [editHeadline, setEditHeadline] = useState('');
  const [editSubtext, setEditSubtext] = useState('');

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Buffer
  const [queueing, setQueueing] = useState(false);
  const [queueResult, setQueueResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Progress indicator
  const [generationStep, setGenerationStep] = useState('Generating concept...');
  const [elapsed, setElapsed] = useState(0);

  // Screenshots upload for guided/manual mode
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Generation progress timer ────────────────────────────────────────────

  useEffect(() => {
    if (!generating) {
      setElapsed(0);
      setGenerationStep('Generating concept...');
      return;
    }

    const start = Date.now();

    const t = setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000);
      setElapsed(secs);

      // Determine current step label based on elapsed time
      const finalizeAfter = 15 + (slideCount - 2) * 10;
      if (secs < 5) {
        setGenerationStep('Generating concept...');
      } else if (secs < 15) {
        setGenerationStep('Creating hero slide...');
      } else if (secs < finalizeAfter) {
        const slideNum = 2 + Math.floor((secs - 15) / 10);
        setGenerationStep(`Rendering slide ${slideNum} of ${slideCount}...`);
      } else {
        setGenerationStep('Finalizing...');
      }
    }, 1000);

    return () => clearInterval(t);
  }, [generating, slideCount]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function generateCarousel() {
    setGenerating(true);
    setError('');
    setSlides([]);
    setCaption('');
    setHashtags([]);
    setConcept('');
    setQueueResult(null);

    try {
      const res = await fetch('/api/generate-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          mode,
          direction: direction.trim() || undefined,
          slideCount,
          screenshots: screenshots.length > 0 ? screenshots : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate carousel');

      setSlides(data.slides || []);
      setCaption(data.caption || '');
      setHashtags(data.hashtags || []);
      setConcept(data.concept || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  }

  // ── Drag and drop reorder ─────────────────────────────────────────────────

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverItem.current = index;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const newSlides = [...slides];
    const draggedSlide = newSlides[dragItem.current];
    newSlides.splice(dragItem.current, 1);
    newSlides.splice(dragOverItem.current, 0, draggedSlide);

    // Re-index
    const reindexed = newSlides.map((s, i) => ({ ...s, index: i }));
    setSlides(reindexed);
    dragItem.current = null;
    dragOverItem.current = null;
  }

  // ── Edit slide text ───────────────────────────────────────────────────────

  function startEdit(slide: CarouselSlide) {
    setEditingFilename(slide.filename);
    setEditHeadline(slide.headline);
    setEditSubtext(slide.subtext);
  }

  function saveEdit() {
    if (editingFilename === null) return;
    setSlides((prev) =>
      prev.map((s) =>
        s.filename === editingFilename
          ? { ...s, headline: editHeadline, subtext: editSubtext }
          : s
      )
    );
    setEditingFilename(null);
  }

  function cancelEdit() {
    setEditingFilename(null);
  }

  // ── Screenshot upload (guided/manual modes) ───────────────────────────────

  const MAX_SCREENSHOTS = 10;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_SCREENSHOTS - screenshots.length;
    const toProcess = Array.from(files).slice(0, remaining);

    toProcess.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) return; // silently skip oversized files
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setScreenshots((prev) => {
            if (prev.length >= MAX_SCREENSHOTS) return prev;
            return [...prev, reader.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  function removeScreenshot(index: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Download all slides ───────────────────────────────────────────────────

  const downloadAll = useCallback(async () => {
    for (const slide of slides) {
      const a = document.createElement('a');
      a.href = slide.publicUrl;
      a.download = `carousel-slide-${slide.index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Stagger downloads to avoid browser blocking
      await new Promise((r) => setTimeout(r, 300));
    }
  }, [slides]);

  // ── Share (Web Share API) ─────────────────────────────────────────────────

  const shareSlides = useCallback(async () => {
    if (!navigator.share) {
      downloadAll();
      return;
    }

    try {
      // Fetch all slide images as File objects
      const files: File[] = [];
      for (const slide of slides) {
        const res = await fetch(slide.publicUrl);
        const blob = await res.blob();
        files.push(new File([blob], `carousel-slide-${slide.index + 1}.png`, { type: 'image/png' }));
      }

      await navigator.share({
        title: concept || 'Instagram Carousel',
        text: caption ? `${caption}\n\n${hashtags.map((h) => `#${h}`).join(' ')}` : undefined,
        files,
      });
    } catch (err) {
      // User cancelled or API unavailable — fallback to download
      if (err instanceof Error && err.name !== 'AbortError') {
        downloadAll();
      }
    }
  }, [slides, concept, caption, hashtags, downloadAll]);

  // ── Queue to Buffer ───────────────────────────────────────────────────────

  async function queueToBuffer() {
    if (slides.length === 0) return;

    setQueueing(true);
    setQueueResult(null);

    try {
      // Queue the first slide image with the carousel caption
      const firstSlide = slides[0];
      const res = await fetch('/api/post-to-buffer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          platform: 'instagram',
          caption,
          hashtags,
          imageFilename: firstSlide.filename,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue');

      setQueueResult({ ok: true, message: 'Queued to Buffer (carousel cover image attached)' });
    } catch (err) {
      setQueueResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to queue',
      });
    } finally {
      setQueueing(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasSlides = slides.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-8 pb-10">
      {/* Header */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-600 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Carousel Builder</h1>
        <p className="opacity-90 max-w-2xl text-lg">
          Generate a multi-slide Instagram carousel with AI-designed slides. Drag to reorder, edit text, then download or queue to Buffer.
        </p>
      </div>

      {/* Mode selector + config */}
      {!hasSlides && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>

          {/* Mode selector */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {([
                { key: 'auto' as Mode, label: 'Full Auto', desc: 'AI picks concept and generates all slides' },
                { key: 'guided' as Mode, label: 'Guided', desc: 'AI suggests structure, you upload screenshots' },
                { key: 'manual' as Mode, label: 'Manual', desc: 'You provide direction, AI generates hero + overlays' },
              ]).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`text-left rounded-xl border px-4 py-3 transition-all ${
                    mode === m.key
                      ? 'border-indigo-500 bg-indigo-600/15 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70'
                  }`}
                >
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Slide count */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Number of slides ({slideCount})
            </label>
            <input
              type="range"
              min={3}
              max={10}
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="w-full max-w-xs accent-indigo-600"
            />
            <div className="flex justify-between max-w-xs text-xs text-slate-500 mt-1">
              <span>3</span><span>5</span><span>7</span><span>10</span>
            </div>
          </div>

          {/* Direction (guided/manual) */}
          {(mode === 'guided' || mode === 'manual') && (
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Direction <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                rows={3}
                placeholder='e.g. "Show these 3 features: dark mode, export, and collaboration"'
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/40 dark:text-white"
              />
            </div>
          )}

          {/* Screenshot upload (guided/manual) */}
          {(mode === 'guided' || mode === 'manual') && (
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Screenshots <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-3 mb-3">
                {screenshots.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeScreenshot(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px] mt-1">Add</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={generateCarousel}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Generating carousel...
              </>
            ) : (
              'Generate Carousel'
            )}
          </button>

          {generating && (() => {
            const TOTAL = 75;
            const progress = Math.min(elapsed / TOTAL, 0.95);
            const remaining = Math.max(TOTAL - elapsed, 0);
            return (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{generationStep}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Typically takes 60-90 seconds</div>
                  </div>
                  <div className="text-xs text-slate-500">~{remaining}s left</div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-700">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="mt-1.5 text-right text-xs text-slate-500">{elapsed}s elapsed</div>
              </div>
            );
          })()}

          {error && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}
        </section>
      )}

      {/* Slides grid */}
      {hasSlides && (
        <>
          {/* Concept header */}
          {concept && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-white">Concept:</span> {concept}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {slides.map((slide, arrayIndex) => (
              <div
                key={`${slide.filename}-${arrayIndex}`}
                draggable
                onDragStart={() => handleDragStart(arrayIndex)}
                onDragEnter={(e) => handleDragEnter(e, arrayIndex)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="group rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md"
              >
                {/* Drag handle */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">
                      {slide.index + 1}/{slides.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      slide.type === 'hero' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                      slide.type === 'cta' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {slide.type}
                    </span>
                    <button
                      onClick={() => startEdit(slide)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Image preview */}
                <div className="aspect-[4/5] relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.publicUrl}
                    alt={`Slide ${slide.index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Editing overlay */}
                {editingFilename === slide.filename && (
                  <div className="p-3 space-y-2 border-t border-slate-100 dark:border-slate-800">
                    <input
                      value={editHeadline}
                      onChange={(e) => setEditHeadline(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      placeholder="Headline"
                    />
                    <input
                      value={editSubtext}
                      onChange={(e) => setEditSubtext(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      placeholder="Subtext"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-indigo-600 py-1.5 text-xs text-white hover:bg-indigo-500"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-200 py-1.5 text-xs dark:bg-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Slide text (when not editing) */}
                {editingFilename !== slide.filename && (
                  <div className="px-3 py-2">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {slide.headline}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {slide.subtext}
                    </div>
                  </div>
                )}

                {/* Individual download */}
                <div className="px-3 pb-2">
                  <a
                    href={slide.publicUrl}
                    download={`carousel-slide-${slide.index + 1}.png`}
                    className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition py-1"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Caption + hashtags */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50 mb-6">
            <h2 className="text-lg font-semibold mb-3">Caption &amp; Hashtags</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/40 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Hashtags
                </label>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50 mb-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadAll}
                className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" /> Download All Slides
              </button>

              <button
                onClick={shareSlides}
                className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>

              <button
                onClick={queueToBuffer}
                disabled={queueing}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                {queueing ? 'Queueing...' : 'Queue Cover to Buffer'}
              </button>

              <button
                onClick={() => {
                  setSlides([]);
                  setCaption('');
                  setHashtags([]);
                  setConcept('');
                  setQueueResult(null);
                }}
                className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Start Over
              </button>
            </div>

            {queueResult && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${
                  queueResult.ok
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                }`}
              >
                {queueResult.message}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
