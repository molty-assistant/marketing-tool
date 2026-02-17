'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import PlanNav from '@/components/PlanNav';

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

interface GeneratedPost {
  caption: string;
  hashtags: string[];
  hook?: string;
  media_concept?: string;
  media_specs?: {
    format: string;
    aspect_ratio: string;
    text_overlays?: string[];
  };
  cta?: string;
  engagement_tips?: string[];
}

export default function SocialPage() {
  const params = useParams();
  const planId = params.id as string;

  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [contentType, setContentType] = useState('post');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generated, setGenerated] = useState<GeneratedPost | null>(null);
  const [history, setHistory] = useState<SocialPost[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/post-to-buffer')
      .then(r => r.json())
      .then(d => setHistory(d.posts || []))
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    setGenerated(null);
    try {
      const res = await fetch('/api/generate-social-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, platform, contentType, topic: topic || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGenerated(data.post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish(publishNow: boolean) {
    if (!generated) return;
    setPublishing(true);
    setError('');
    try {
      const res = await fetch('/api/post-to-buffer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          platform,
          caption: generated.caption,
          hashtags: generated.hashtags,
          publishNow,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publishing failed');

      // Refresh history
      const histRes = await fetch('/api/post-to-buffer');
      const histData = await histRes.json();
      setHistory(histData.posts || []);
      setGenerated(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  }

  async function handleAutoPublish() {
    setPublishing(true);
    setError('');
    try {
      const res = await fetch('/api/auto-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, platform, contentType, topic: topic || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-publish failed');

      setGenerated(data.generated);
      // Refresh history
      const histRes = await fetch('/api/post-to-buffer');
      const histData = await histRes.json();
      setHistory(histData.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PlanNav planId={planId} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">📱 Social Publishing</h1>
        <p className="text-gray-400 mb-8">Generate and publish content to Instagram & TikTok via Buffer</p>

        {/* Controls */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Platform</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value as 'instagram' | 'tiktok')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="instagram">📸 Instagram</option>
                <option value="tiktok">🎵 TikTok</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Content Type</label>
              <select
                value={contentType}
                onChange={e => setContentType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="post">Post</option>
                <option value="reel">Reel</option>
                <option value="story">Story</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Topic / Angle (optional)</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. 'golden hour photography tips' or leave blank for AI to choose"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-medium transition"
            >
              {generating ? '✨ Generating...' : '✨ Generate Post'}
            </button>
            <button
              onClick={handleAutoPublish}
              disabled={publishing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg font-medium transition"
            >
              {publishing ? '🚀 Publishing...' : '🚀 Auto-Generate & Queue'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6 text-red-200">
            {error}
          </div>
        )}

        {/* Generated Preview */}
        {generated && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📝 Generated Content</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Caption</h3>
                <div className="bg-gray-800 rounded-lg p-4 whitespace-pre-wrap">{generated.caption}</div>
              </div>
              {generated.hashtags && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Hashtags</h3>
                  <div className="flex flex-wrap gap-2">
                    {generated.hashtags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {generated.media_concept && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Media Concept</h3>
                  <p className="text-gray-300">{generated.media_concept}</p>
                </div>
              )}
              {generated.hook && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Hook</h3>
                  <p className="text-yellow-300 font-medium">{generated.hook}</p>
                </div>
              )}
              {generated.cta && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">CTA</h3>
                  <p className="text-green-300">{generated.cta}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handlePublish(false)}
                  disabled={publishing}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-lg font-medium transition"
                >
                  {publishing ? 'Sending...' : '📤 Queue to Buffer'}
                </button>
                <button
                  onClick={() => handlePublish(true)}
                  disabled={publishing}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 rounded-lg font-medium transition"
                >
                  {publishing ? 'Sending...' : '⚡ Post Now'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg font-medium transition"
                >
                  🔄 Regenerate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Posting History</h2>
          {history.length === 0 ? (
            <p className="text-gray-500">No posts yet. Generate and publish your first post above.</p>
          ) : (
            <div className="space-y-3">
              {history.map(post => (
                <div key={post.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{post.platform === 'instagram' ? '📸' : '🎵'}</span>
                    <span className="font-medium capitalize">{post.platform}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      post.status === 'queued' ? 'bg-green-900/50 text-green-300' :
                      post.status === 'failed' ? 'bg-red-900/50 text-red-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {post.status}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">{post.created_at}</span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-3">{post.caption}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
