'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, Copy, Share2, Download, Send, LayoutGrid, Film, RefreshCw, Clock } from 'lucide-react';
import Link from 'next/link';

type SocialPostData = {
    caption: string;
    hashtags: string[];
    hook?: string;
    cta?: string;
    best_posting_time?: string;
    engagement_tips?: string[];
    media_concept?: string;
};

type ImageResult = {
    publicUrl: string;
    filename?: string;
};

export default function QuickWinPage() {
    const params = useParams();
    const planId = params.id as string;

    const [igData, setIgData] = useState<SocialPostData | null>(null);
    const [tiktokData, setTiktokData] = useState<SocialPostData | null>(null);
    const [image, setImage] = useState<ImageResult | null>(null);

    const [igGenerating, setIgGenerating] = useState(false);
    const [tiktokGenerating, setTiktokGenerating] = useState(false);
    const [imageGenerating, setImageGenerating] = useState(false);

    // Whether the user has started generation (click or cache)
    const [hasStarted, setHasStarted] = useState(false);

    // Buffer queue state
    const [igQueueing, setIgQueueing] = useState(false);
    const [igQueueResult, setIgQueueResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [ttQueueing, setTtQueueing] = useState(false);
    const [ttQueueResult, setTtQueueResult] = useState<{ ok: boolean; msg: string } | null>(null);

    // Video state
    const [videoGenerating, setVideoGenerating] = useState(false);
    const [videoTaskId, setVideoTaskId] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [videoError, setVideoError] = useState('');
    const [videoElapsed, setVideoElapsed] = useState(0);
    const [videoStartTime, setVideoStartTime] = useState<number | null>(null);


    // Tips disclosure toggles
    const [igTipsOpen, setIgTipsOpen] = useState(false);
    const [ttTipsOpen, setTtTipsOpen] = useState(false);

    // Copy feedback
    const [copied, setCopied] = useState<string | null>(null);

    // Shared generation logic used by both initial load and Regenerate
    const runGeneration = useCallback(async (cancelled: () => boolean) => {
        const cacheKey = `quickwin-${planId}`;

        // 1. Fire IG and TikTok simultaneously
        const igPromise = fetch('/api/generate-social-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId, platform: 'instagram' }),
        }).then(res => res.ok ? res.json() : null).catch(() => null);

        const ttPromise = fetch('/api/generate-social-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId, platform: 'tiktok' }),
        }).then(res => res.ok ? res.json() : null).catch(() => null);

        const [igJson, ttJson] = await Promise.all([igPromise, ttPromise]);

        if (cancelled()) return;
        if (igJson?.post) setIgData(igJson.post);
        setIgGenerating(false);

        if (ttJson?.post) setTiktokData(ttJson.post);
        setTiktokGenerating(false);

        // 2. Use IG caption for the Image Brief, then generate Image
        let resolvedImage: ImageResult | null = null;
        if (igJson?.post?.caption) {
            try {
                const briefRes = await fetch('/api/caption-to-image-brief', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caption: igJson.post.caption, platform: 'instagram' }),
                });

                let imageBrief = null;
                if (briefRes.ok) imageBrief = await briefRes.json();

                if (cancelled()) return;

                const imgRes = await fetch('/api/generate-post-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        planId,
                        platform: 'instagram-post',
                        visualMode: 'hero',
                        caption: igJson.post.caption,
                        imageBrief
                    }),
                });
                const imgJson = await imgRes.json();
                if (!cancelled() && imgRes.ok && imgJson.publicUrl) {
                    resolvedImage = { publicUrl: imgJson.publicUrl, filename: imgJson.filename };
                    setImage(resolvedImage);
                }
            } catch (err) {
                console.error('Image generation failed', err);
            } finally {
                if (!cancelled()) setImageGenerating(false);
            }
        } else {
            if (!cancelled()) setImageGenerating(false);
        }

        // 3. Cache results in sessionStorage
        if (!cancelled()) {
            try {
                const cachePayload = {
                    igData: igJson?.post ?? null,
                    tiktokData: ttJson?.post ?? null,
                    image: resolvedImage,
                };
                sessionStorage.setItem(cacheKey, JSON.stringify(cachePayload));
            } catch { /* sessionStorage full or unavailable */ }
            
        }
    }, [planId]);

    // Restore from sessionStorage cache on load (do NOT auto-generate)
    useEffect(() => {
        try {
            const cached = sessionStorage.getItem(`quickwin-${planId}`);
            if (cached) {
                const parsed = JSON.parse(cached) as { igData: SocialPostData | null; tiktokData: SocialPostData | null; image: ImageResult | null };
                if (parsed.igData) setIgData(parsed.igData);
                if (parsed.tiktokData) setTiktokData(parsed.tiktokData);
                if (parsed.image) setImage(parsed.image);
                
                setHasStarted(true);
            }
        } catch { /* ignore corrupt cache */ }
    }, [planId]);

    // Video polling — times out after 5 minutes to avoid infinite polling
    useEffect(() => {
        if (!videoTaskId || videoUrl) return;
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
                const res = await fetch(`/api/generate-video/status?taskId=${encodeURIComponent(videoTaskId)}`);
                const data = await res.json();
                if (cancelled) return;
                if (data?.done === true && data?.videoUrl) {
                    setVideoUrl(String(data.videoUrl));
                    setVideoGenerating(false);
                } else if (data?.done === true && data?.error) {
                    setVideoError(String(data.error));
                    setVideoGenerating(false);
                }
            } catch {
                if (cancelled) return;
                setVideoError('Failed to poll video status');
                setVideoGenerating(false);
            }
        }

        pollOnce();
        const t = setInterval(pollOnce, 10_000);
        return () => { cancelled = true; clearInterval(t); };
    }, [videoTaskId, videoUrl]);

    // Video elapsed timer
    useEffect(() => {
        if (!videoGenerating || !videoStartTime) return;
        const t = setInterval(() => {
            setVideoElapsed(Math.floor((Date.now() - videoStartTime) / 1000));
        }, 1000);
        return () => clearInterval(t);
    }, [videoGenerating, videoStartTime]);

    // ── Actions ──────────────────────────────────────────────────────────────

    const regenCancelRef = useRef<(() => void) | null>(null);

    function handleGenerate() {
        // Cancel any in-flight generation
        regenCancelRef.current?.();

        try { sessionStorage.removeItem(`quickwin-${planId}`); } catch { /* ignore */ }

        setHasStarted(true);
        setIgData(null);
        setTiktokData(null);
        setImage(null);
        setIgGenerating(true);
        setTiktokGenerating(true);
        setImageGenerating(true);
        setIgTipsOpen(false);
        setTtTipsOpen(false);

        let cancelled = false;
        regenCancelRef.current = () => { cancelled = true; };
        runGeneration(() => cancelled);
    }

    const copyToClipboard = useCallback((text: string, label: string) => {
        navigator.clipboard.writeText(text).catch(() => { /* clipboard unavailable */ });
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    }, []);

    async function queueToBuffer(platform: 'instagram' | 'tiktok') {
        const data = platform === 'instagram' ? igData : tiktokData;
        if (!data) return;

        const setQueueing = platform === 'instagram' ? setIgQueueing : setTtQueueing;
        const setResult = platform === 'instagram' ? setIgQueueResult : setTtQueueResult;

        setQueueing(true);
        setResult(null);

        try {
            const res = await fetch('/api/post-to-buffer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    platform,
                    caption: data.caption,
                    hashtags: data.hashtags,
                    ...(platform === 'instagram' && image?.filename ? { imageFilename: image.filename } : {}),
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to queue');
            setResult({ ok: true, msg: `Queued to ${platform}` });
        } catch (err) {
            setResult({ ok: false, msg: err instanceof Error ? err.message : 'Failed' });
        } finally {
            setQueueing(false);
        }
    }

    async function generateVideo() {
        if (!tiktokData?.caption) return;

        setVideoGenerating(true);
        setVideoError('');
        setVideoUrl('');
        setVideoTaskId('');
        setVideoStartTime(Date.now());
        setVideoElapsed(0);

        try {
            const promptRes = await fetch('/api/caption-to-veo-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caption: tiktokData.caption }),
            });
            const promptData = await promptRes.json();
            if (!promptRes.ok) throw new Error(promptData.error || 'Failed to create video prompt');

            const prompt = String(promptData.prompt || '').trim();
            if (!prompt) throw new Error('Empty video prompt');

            const res = await fetch('/api/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, prompt, aspectRatio: '9:16', duration: '6' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to start video');

            setVideoTaskId(String(data.taskId || ''));
        } catch (err) {
            setVideoError(err instanceof Error ? err.message : 'Failed to generate video');
            setVideoGenerating(false);
        }
    }

    async function shareContent(type: 'image' | 'video' | 'text', data: { text?: string; url?: string; filename?: string }) {
        // Try Web Share API first
        if (navigator.share) {
            try {
                if (type === 'image' && data.url) {
                    const res = await fetch(data.url);
                    const blob = await res.blob();
                    const file = new File([blob], data.filename || 'image.png', { type: 'image/png' });
                    await navigator.share({ files: [file], text: data.text });
                    return;
                }
                if (type === 'video' && data.url) {
                    const res = await fetch(`/api/download-video?uri=${encodeURIComponent(data.url)}`);
                    const blob = await res.blob();
                    const file = new File([blob], 'promo-video.mp4', { type: 'video/mp4' });
                    await navigator.share({ files: [file], text: data.text });
                    return;
                }
                if (type === 'text' && data.text) {
                    await navigator.share({ text: data.text });
                    return;
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
            }
        }
        // Fallback: copy to clipboard for text, download for media
        if (type === 'text' && data.text) {
            copyToClipboard(data.text, 'shared');
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────

    const allDone = !igGenerating && !tiktokGenerating && !imageGenerating;

    return (
        <div className="mx-auto max-w-5xl px-4 lg:px-8 pb-10">
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white shadow-lg">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Quick Wins</h1>
                        <p className="opacity-90 max-w-2xl text-lg">
                            {hasStarted
                                ? 'Ready-to-post assets generated from your app analysis.'
                                : 'Generate ready-to-post social content, captions, and a hero graphic in seconds.'}
                        </p>
                    </div>
                    {hasStarted && !igGenerating && !tiktokGenerating && !imageGenerating && (
                        <button
                            onClick={handleGenerate}
                            className="flex shrink-0 items-center gap-2 rounded-xl bg-white/20 backdrop-blur px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/30"
                        >
                            <RefreshCw className="h-4 w-4" /> Regenerate
                        </button>
                    )}
                </div>
                {!hasStarted && (
                    <button
                        onClick={handleGenerate}
                        className="mt-4 flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-md transition hover:bg-indigo-50"
                    >
                        Generate Quick Wins
                    </button>
                )}
            </div>

            {/* Suggest Social Posts for more control */}
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 dark:border-indigo-800/40 dark:bg-indigo-950/20">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                    For better results, try{' '}
                    <Link href={`/plan/${planId}/social`} className="font-medium text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400">
                        Social Posts
                    </Link>
                    {' '}&mdash; add your own photos and topic before generating.
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Instagram Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="text-2xl">📸</div>
                        <h2 className="font-semibold text-lg text-slate-900 dark:text-white">Instagram Post</h2>
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        {igGenerating ? (
                            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                                <Loader2 className="animate-spin h-5 w-5" /> Generating...
                            </div>
                        ) : igData ? (
                            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {igData.hook && (
                                    <div className="mb-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                                        {igData.hook}
                                    </div>
                                )}
                                {igData.caption}
                                <div className="mt-4 text-indigo-500 font-medium">
                                    {igData.hashtags?.map(tag => `#${tag}`).join(' ')}
                                </div>
                                {(igData.cta || igData.best_posting_time) && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {igData.cta && (
                                            <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                {igData.cta}
                                            </span>
                                        )}
                                        {igData.best_posting_time && (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                <Clock className="h-3 w-3" /> {igData.best_posting_time}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : hasStarted ? (
                            <div className="text-red-400 text-sm">Failed to generate</div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                Click &ldquo;Generate&rdquo; to create an Instagram caption
                            </div>
                        )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                            disabled={!igData}
                            onClick={() => igData && copyToClipboard(`${igData.caption}\n\n${(igData.hashtags ?? []).map(t => '#' + t).join(' ')}`, 'ig')}
                            className="flex justify-center items-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                        >
                            {copied === 'ig' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            {copied === 'ig' ? 'Copied' : 'Copy'}
                        </button>
                        <button
                            disabled={!igData || igQueueing}
                            onClick={() => queueToBuffer('instagram')}
                            className="flex justify-center items-center gap-2 py-2.5 rounded-xl bg-indigo-600 font-medium text-sm text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {igQueueing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Buffer
                        </button>
                    </div>
                    {igData && (
                        <button
                            onClick={() => shareContent('text', { text: `${igData.caption}\n\n${(igData.hashtags ?? []).map(t => '#' + t).join(' ')}` })}
                            className="mt-2 w-full flex justify-center items-center gap-2 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                        >
                            <Share2 className="h-3.5 w-3.5" /> Share
                        </button>
                    )}
                    {igData?.engagement_tips && igData.engagement_tips.length > 0 && (
                        <div className="mt-2">
                            <button
                                onClick={() => setIgTipsOpen(prev => !prev)}
                                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                            >
                                Tips {igTipsOpen ? '\u25B4' : '\u25BE'}
                            </button>
                            {igTipsOpen && (
                                <ul className="mt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                    {igData.engagement_tips.map((tip, i) => (
                                        <li key={i} className="flex gap-1.5">
                                            <span className="text-slate-400 dark:text-slate-500 select-none">&bull;</span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    {igQueueResult && (
                        <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${igQueueResult.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'}`}>
                            {igQueueResult.ok ? '✓' : '✗'} {igQueueResult.msg}
                        </div>
                    )}
                </div>

                {/* TikTok Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="text-2xl">🎵</div>
                        <h2 className="font-semibold text-lg text-slate-900 dark:text-white">TikTok Script</h2>
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        {tiktokGenerating ? (
                            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                                <Loader2 className="animate-spin h-5 w-5" /> Generating...
                            </div>
                        ) : tiktokData ? (
                            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {tiktokData.hook && (
                                    <div className="mb-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                                        {tiktokData.hook}
                                    </div>
                                )}
                                {tiktokData.caption}
                                <div className="mt-4 text-indigo-500 font-medium">
                                    {tiktokData.hashtags?.map(tag => `#${tag}`).join(' ')}
                                </div>
                                {(tiktokData.cta || tiktokData.best_posting_time) && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {tiktokData.cta && (
                                            <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                {tiktokData.cta}
                                            </span>
                                        )}
                                        {tiktokData.best_posting_time && (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                <Clock className="h-3 w-3" /> {tiktokData.best_posting_time}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : hasStarted ? (
                            <div className="text-red-400 text-sm">Failed to generate</div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                Click &ldquo;Generate&rdquo; to create a TikTok script
                            </div>
                        )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                            disabled={!tiktokData}
                            onClick={() => tiktokData && copyToClipboard(`${tiktokData.caption}\n\n${(tiktokData.hashtags ?? []).map(t => '#' + t).join(' ')}`, 'tt')}
                            className="flex justify-center items-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                        >
                            {copied === 'tt' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            {copied === 'tt' ? 'Copied' : 'Copy'}
                        </button>
                        <button
                            disabled={!tiktokData || ttQueueing}
                            onClick={() => queueToBuffer('tiktok')}
                            className="flex justify-center items-center gap-2 py-2.5 rounded-xl bg-indigo-600 font-medium text-sm text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {ttQueueing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Buffer
                        </button>
                    </div>
                    {tiktokData && (
                        <button
                            onClick={() => shareContent('text', { text: `${tiktokData.caption}\n\n${(tiktokData.hashtags ?? []).map(t => '#' + t).join(' ')}` })}
                            className="mt-2 w-full flex justify-center items-center gap-2 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                        >
                            <Share2 className="h-3.5 w-3.5" /> Share
                        </button>
                    )}
                    {tiktokData?.engagement_tips && tiktokData.engagement_tips.length > 0 && (
                        <div className="mt-2">
                            <button
                                onClick={() => setTtTipsOpen(prev => !prev)}
                                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                            >
                                Tips {ttTipsOpen ? '\u25B4' : '\u25BE'}
                            </button>
                            {ttTipsOpen && (
                                <ul className="mt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                    {tiktokData.engagement_tips.map((tip, i) => (
                                        <li key={i} className="flex gap-1.5">
                                            <span className="text-slate-400 dark:text-slate-500 select-none">&bull;</span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    {ttQueueResult && (
                        <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${ttQueueResult.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'}`}>
                            {ttQueueResult.ok ? '✓' : '✗'} {ttQueueResult.msg}
                        </div>
                    )}
                </div>

                {/* Image Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="text-2xl">🎨</div>
                        <h2 className="font-semibold text-lg text-slate-900 dark:text-white">Hero Graphic</h2>
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 relative">
                        {imageGenerating ? (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-2">
                                <Loader2 className="animate-spin h-5 w-5" /> Designing...
                            </div>
                        ) : image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image.publicUrl} alt="Hero graphic" className="w-full h-full object-cover" />
                        ) : hasStarted ? (
                            <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">Failed to generate</div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                                Click &ldquo;Generate&rdquo; to create a hero image
                            </div>
                        )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <a
                            href={image?.publicUrl}
                            download="hero-graphic.png"
                            className={`flex justify-center items-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700 ${!image ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <Download className="h-4 w-4" /> Save
                        </a>
                        <button
                            disabled={!image}
                            onClick={() => image && shareContent('image', { url: image.publicUrl, filename: 'hero-graphic.png' })}
                            className="flex justify-center items-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                        >
                            <Share2 className="h-4 w-4" /> Share
                        </button>
                    </div>
                </div>

            </div>

            {/* Video Generation Section */}
            {allDone && tiktokData && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 mb-3">
                        <Film className="h-5 w-5 text-indigo-500" />
                        <h2 className="font-semibold text-lg text-slate-900 dark:text-white">TikTok Video</h2>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Generate a short promo video (9:16) from your TikTok script using Kling 3.0.
                    </p>

                    {!videoTaskId && !videoUrl && !videoError && (
                        <button
                            onClick={generateVideo}
                            disabled={videoGenerating}
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                        >
                            {videoGenerating ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</>
                            ) : (
                                'Generate Video'
                            )}
                        </button>
                    )}

                    {/* Progress bar */}
                    {videoTaskId && !videoUrl && !videoError && (() => {
                        const TOTAL = 90;
                        const progress = Math.min(videoElapsed / TOTAL, 0.95);
                        return (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-xl animate-pulse">🎬</span>
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-800 dark:text-slate-200">Generating video...</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Typically takes ~90 seconds</div>
                                    </div>
                                    <div className="text-xs text-slate-500">~{Math.max(TOTAL - videoElapsed, 0)}s left</div>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-700">
                                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${progress * 100}%` }} />
                                </div>
                                <div className="mt-1.5 text-right text-xs text-slate-500">{videoElapsed}s elapsed</div>
                            </div>
                        );
                    })()}

                    {/* Video ready */}
                    {videoUrl && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                            <div className="mb-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">Video ready</div>
                            <div className="flex flex-wrap gap-3">
                                <a
                                    href={`/api/download-video?uri=${encodeURIComponent(videoUrl)}`}
                                    download="promo-video.mp4"
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                                >
                                    <Download className="h-4 w-4" /> Download MP4
                                </a>
                                <button
                                    onClick={() => shareContent('video', { url: videoUrl, text: tiktokData?.caption })}
                                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                >
                                    <Share2 className="h-4 w-4" /> Share
                                </button>
                            </div>
                        </div>
                    )}

                    {videoError && (
                        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                            {videoError}
                        </div>
                    )}
                </div>
            )}

            {/* Next steps */}
            {allDone && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link
                        href={`/plan/${planId}/carousel`}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                            <LayoutGrid className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-semibold text-slate-900 dark:text-white">Create Carousel</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Multi-slide Instagram carousel</div>
                        </div>
                    </Link>
                    <Link
                        href={`/plan/${planId}/social`}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                            <Send className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-semibold text-slate-900 dark:text-white">Full Social Flow</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Advanced publishing with media options</div>
                        </div>
                    </Link>
                </div>
            )}
        </div>
    );
}
