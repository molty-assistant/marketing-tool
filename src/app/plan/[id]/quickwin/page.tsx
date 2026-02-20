'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Copy } from 'lucide-react';

type SocialPostData = {
    caption: string;
    hashtags: string[];
};

type ImageResult = {
    publicUrl: string;
};

export default function QuickWinPage() {
    const params = useParams();
    const planId = params.id as string;

    const [igData, setIgData] = useState<SocialPostData | null>(null);
    const [tiktokData, setTiktokData] = useState<SocialPostData | null>(null);
    const [image, setImage] = useState<ImageResult | null>(null);

    const [igGenerating, setIgGenerating] = useState(true);
    const [tiktokGenerating, setTiktokGenerating] = useState(true);
    const [imageGenerating, setImageGenerating] = useState(true);

    // Auto-fire generation on load
    useEffect(() => {
        let active = true;

        async function generateAll() {
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

            if (active && igJson?.post) setIgData(igJson.post);
            if (active) setIgGenerating(false);

            if (active && ttJson?.post) setTiktokData(ttJson.post);
            if (active) setTiktokGenerating(false);

            // 2. Use IG caption for the Image Brief, then generate Image
            if (igJson?.post?.caption) {
                try {
                    // Get Image Brief
                    const briefRes = await fetch('/api/caption-to-image-brief', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ caption: igJson.post.caption, platform: 'instagram' }),
                    });

                    let imageBrief = null;
                    if (briefRes.ok) imageBrief = await briefRes.json();

                    // Generate Image
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
                    if (active && imgRes.ok && imgJson.publicUrl) setImage(imgJson);
                } catch (err) {
                    console.error('Image generation failed', err);
                } finally {
                    if (active) setImageGenerating(false);
                }
            } else {
                if (active) setImageGenerating(false); // Can't generate without IG caption
            }
        }

        generateAll();

        return () => {
            active = false;
        };
    }, [planId]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="mx-auto max-w-5xl px-4 lg:px-8 pb-10">
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white shadow-lg">
                <h1 className="text-3xl font-bold mb-2">🎉 Quick Wins</h1>
                <p className="opacity-90 max-w-2xl text-lg">
                    We analyzed your app and instantly generated these ready-to-post assets to help you get started right now.
                </p>
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
                                {igData.caption}
                                <div className="mt-4 text-indigo-500 font-medium">
                                    {igData.hashtags?.map(tag => `#${tag}`).join(' ')}
                                </div>
                            </div>
                        ) : (
                            <div className="text-red-400 text-sm">Failed to generate</div>
                        )}
                    </div>
                    <button
                        disabled={!igData}
                        onClick={() => igData && copyToClipboard(`${igData.caption}\n\n${igData.hashtags.map(t => '#' + t).join(' ')}`)}
                        className="mt-4 w-full flex justify-center items-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                        <Copy className="h-4 w-4" /> Copy Text
                    </button>
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
                                {tiktokData.caption}
                                <div className="mt-4 text-indigo-500 font-medium">
                                    {tiktokData.hashtags?.map(tag => `#${tag}`).join(' ')}
                                </div>
                            </div>
                        ) : (
                            <div className="text-red-400 text-sm">Failed to generate</div>
                        )}
                    </div>
                    <button
                        disabled={!tiktokData}
                        onClick={() => tiktokData && copyToClipboard(`${tiktokData.caption}\n\n${tiktokData.hashtags.map(t => '#' + t).join(' ')}`)}
                        className="mt-4 w-full flex justify-center items-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                        <Copy className="h-4 w-4" /> Copy Text
                    </button>
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
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">Failed to generate</div>
                        )}
                    </div>
                    <a
                        href={image?.publicUrl}
                        download
                        className={`mt-4 w-full flex justify-center items-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 ${!image ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <CheckCircle2 className="h-4 w-4" /> Save Image
                    </a>
                </div>

            </div>
        </div>
    );
}
