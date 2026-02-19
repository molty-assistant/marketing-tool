'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';

interface CorePiece {
  title: string;
  content: string;
}

interface Atom {
  platform: string;
  format: string;
  content: string;
  hashtags?: string[];
  subreddits?: string[];
  characterCount?: number;
  notes?: string;
}

interface AtomizeResponse {
  corePiece: CorePiece;
  atoms: Atom[];
  metadata?: { model?: string; tokens?: number | null; atomCount?: number };
}

const DEFAULT_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'twitter', 'reddit', 'email'];

const platformMeta: Record<string, { icon: string; description: string }> = {
  instagram: { icon: '📸', description: 'Caption + 5 hashtags, 2,200 char limit' },
  tiktok: { icon: '🎬', description: 'Hook + script outline for 15–60s video' },
  linkedin: { icon: '💼', description: 'Professional post, up to 3,000 chars' },
  twitter: { icon: '🐦', description: 'Tweet thread, 280 chars per tweet' },
  reddit: { icon: '👽', description: 'Title + body post, community-aware' },
  email: { icon: '✉️', description: 'Subject line + email body' },
};

export default function DistributePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');

  const [platforms, setPlatforms] = useState<string[]>([...DEFAULT_PLATFORMS]);
  const [sourceContent, setSourceContent] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AtomizeResponse | null>(null);
  const [isCached, setIsCached] = useState(false);

  const [filter, setFilter] = useState<string>('all');

  const storageKey = `distribute-${id}`;

  const loadPlan = () => {
    setPlanLoading(true);
    setPlanError('');
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch {
        /* fall through */
      }
    }

    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((p) => {
        setPlan(p);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(p));
      })
      .catch((err) => {
        setPlanError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setPlanLoading(false));
  };

  useEffect(() => {
    loadPlan();
  }, [id]);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return;
    try {
      setData(JSON.parse(stored));
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [id]);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      return [...prev, p];
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/atomize-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          sourceContent: sourceContent.trim() ? sourceContent : undefined,
          platforms: platforms.length ? platforms : DEFAULT_PLATFORMS,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to atomize content');

      sessionStorage.setItem(storageKey, JSON.stringify(json));
      setData(json);
      setIsCached(false);
      toastSuccess('Content atomized');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to atomize content';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }

  if (planError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  const atoms = data?.atoms || [];
  const filteredAtoms = filter === 'all' ? atoms : atoms.filter((a) => a.platform === filter);
  const platformsPresent = Array.from(new Set(atoms.map((a) => a.platform))).sort();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Turn one core piece of content into platform-native posts for Instagram, TikTok, LinkedIn, Twitter, Reddit, and email — generated in seconds from your marketing brief.
      </div>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">📣 Distribute</h1>
            {data && isCached && (
              <span className="text-xs text-slate-500">Cached · ↻ Regenerate to refresh</span>
            )}
          </div>
          <p className="text-slate-400">{plan.config.app_name} — One core piece, many posts</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-2.5">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Preview</div>
          <div className="text-sm text-slate-200 mt-1">
            <span className="text-slate-400">Channels:</span> {platforms.length ? platforms.join(', ') : DEFAULT_PLATFORMS.join(', ')}
          </div>
          <div className="text-sm text-slate-200">
            <span className="text-slate-400">Audience:</span> {plan.config.target_audience || '—'}
          </div>
          <div className="text-sm text-slate-200">
            <span className="text-slate-400">Content:</span> {sourceContent.trim() ? 'Platform-native posts (from your source)' : 'Core piece + platform-native posts'}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8 space-y-4">
        <div>
          <div className="text-sm font-semibold text-white mb-2">Platforms</div>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`text-xs border rounded-full px-3 py-1.5 transition-colors ${
                  platforms.includes(p)
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                    : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40 text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500 mt-2">Tip: leave source blank to auto-generate a core blog post/announcement.</div>
        </div>

        {!data && (
          <div>
            <div className="text-sm font-semibold text-white mb-2">What you’ll get</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(platforms.length ? platforms : DEFAULT_PLATFORMS).map((p) => {
                const meta = platformMeta[p] || { icon: '✨', description: 'Platform-native post' };
                return (
                  <div
                    key={p}
                    className="bg-slate-900/40 border border-slate-700/40 rounded-xl px-3 py-2.5"
                  >
                    <div className="text-xs text-white flex items-center gap-2">
                      <span aria-hidden>{meta.icon}</span>
                      <span className="font-medium capitalize">{p}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">{meta.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-sm font-semibold text-white mb-2">Optional source content</div>
          <textarea
            value={sourceContent}
            onChange={(e) => setSourceContent(e.target.value)}
            placeholder="Paste a blog post, launch announcement, or notes… (optional)"
            className="w-full min-h-[140px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Generating…' : data ? '↻ Regenerate' : '✨ Generate'}
          </button>
        </div>

        {data?.metadata?.tokens != null && (
          <div className="text-xs text-slate-500">
            Model: {data.metadata.model || 'gemini'} · Tokens: {String(data.metadata.tokens)} · Atoms: {String(data.metadata.atomCount ?? atoms.length)}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!data && (
        <div className="text-slate-500 text-sm">Click “Generate” to create a core piece and atomized content.</div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Core piece */}
          <div className="rounded-2xl overflow-hidden border bg-slate-800/30 border-slate-700/60">
            <div className="p-4 border-b border-slate-700/40 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Core piece</div>
                <div className="text-xs text-slate-500">{data.corePiece.title}</div>
              </div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(`# ${data.corePiece.title}\n\n${data.corePiece.content}`);
                  toastSuccess('Copied core piece');
                }}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                📋 Copy
              </button>
            </div>
            <div className="p-4">
              <textarea
                readOnly
                value={data.corePiece.content}
                className="w-full min-h-[260px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-slate-300">Filter:</div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-950/40 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
            >
              <option value="all">All</option>
              {platformsPresent.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500">Showing {filteredAtoms.length} of {atoms.length}</div>
          </div>

          {/* Atoms */}
          <div className="space-y-4">
            {filteredAtoms.map((atom, idx) => {
              const count = typeof atom.characterCount === 'number' ? atom.characterCount : (atom.content || '').length;
              return (
                <div
                  key={`${atom.platform}-${atom.format}-${idx}`}
                  className="rounded-2xl overflow-hidden border bg-slate-800/30 border-slate-700/60"
                >
                  <div className="p-4 border-b border-slate-700/40 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {atom.platform} · {atom.format}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {atom.notes || '—'}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[11px] bg-slate-950/40 border border-slate-700/40 text-slate-300 px-2 py-1 rounded-full">
                          {count} chars
                        </span>
                        {Array.isArray(atom.hashtags) && atom.hashtags.length > 0 && (
                          <span className="text-[11px] bg-slate-950/40 border border-slate-700/40 text-slate-300 px-2 py-1 rounded-full">
                            {atom.hashtags.slice(0, 5).join(' ')}{atom.hashtags.length > 5 ? ' …' : ''}
                          </span>
                        )}
                        {Array.isArray(atom.subreddits) && atom.subreddits.length > 0 && (
                          <span className="text-[11px] bg-slate-950/40 border border-slate-700/40 text-slate-300 px-2 py-1 rounded-full">
                            {atom.subreddits.slice(0, 3).join(' ')}{atom.subreddits.length > 3 ? ' …' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(atom.content);
                        toastSuccess('Copied');
                      }}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>

                  <div className="p-4">
                    <textarea
                      readOnly
                      value={atom.content}
                      className="w-full min-h-[160px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Atomized content is a draft — tweak for each platform before posting.
      </div>
    </div>
  );
}
