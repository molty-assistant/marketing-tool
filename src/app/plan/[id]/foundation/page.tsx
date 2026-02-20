'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import ErrorRetry from '@/components/ErrorRetry';
import { DraftSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';
import DismissableTip from '@/components/DismissableTip';

type BrandVoice = {
  voiceSummary: string;
  personalityTraits: Array<{ trait: string; description: string; example: string }>;
  vocabularyGuide: {
    wordsToUse: string[];
    wordsToAvoid: string[];
    phrasesToUse: string[];
    phrasesToAvoid: string[];
  };
  toneSpectrum: { formal: number; playful: number; technical: number; emotional: number };
};

type PositioningAngle = {
  name: string;
  hook: string;
  psychology: string;
  headlineDirections: string[];
  bestFor: string;
};

type Positioning = {
  angles: PositioningAngle[];
  antiPositioning: { whatWeAreNot: string[]; whyItMatters: string };
  recommendedPrimary: string;
};

type Competitor = {
  name: string;
  url: string;
  positioning: string;
  pricing: string;
  strengths: string[];
  weaknesses: string[];
  keyMessaging: string[];
};

type Competitive = {
  competitors: Competitor[];
  gaps: string[];
  opportunities: string[];
  keywordGaps: string[];
};

function Chips({ items }: { items: string[] }) {
  if (!items?.length) return <span className="text-slate-500 text-sm">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="text-xs bg-slate-900/50 border border-slate-700/50 text-slate-200 px-2.5 py-1 rounded-full">
          {item}
        </span>
      ))}
    </div>
  );
}

function ToneBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(10, value || 0));
  return (
    <div className="border border-slate-700/40 rounded-xl p-3">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>{label}</span>
        <span className="text-white font-semibold">{v}/10</span>
      </div>
      <div className="h-2 bg-slate-950/40 border border-slate-700/40 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500/70 transition-all" style={{ width: `${v * 10}%` }} />
      </div>
    </div>
  );
}

function GenerationError({ message, onRetry }: { message: string; onRetry: () => void }) {
  if (!message) return null;
  return (
    <div className="mt-5 rounded-2xl bg-red-950/30 border border-red-800/50 p-4">
      <div className="text-sm text-red-200">{message}</div>
      <button
        onClick={onRetry}
        className="mt-3 bg-red-800 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

export default function FoundationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { plan, loading: planLoading, error: planError, reload: loadPlan } = usePlan(id);

  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null);
  const [positioning, setPositioning] = useState<Positioning | null>(null);
  const [competitive, setCompetitive] = useState<Competitive | null>(null);
  const [isCached, setIsCached] = useState(false);

  const [loadingBV, setLoadingBV] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);
  const [loadingComp, setLoadingComp] = useState(false);

  const [brandVoiceError, setBrandVoiceError] = useState('');
  const [positioningError, setPositioningError] = useState('');
  const [competitiveError, setCompetitiveError] = useState('');

  const [expandedAngle, setExpandedAngle] = useState<string | null>(null);

  const { success: toastOk, error: toastErr } = useToast();

  // Restore cached results
  useEffect(() => {
    try {
      const c = sessionStorage.getItem(`foundation-${id}`);
      if (c) {
        const o = JSON.parse(c);
        if (o.brandVoice) setBrandVoice(o.brandVoice);
        if (o.positioning) setPositioning(o.positioning);
        if (o.competitive) setCompetitive(o.competitive);
        setIsCached(true);
      }
    } catch { /* ignore */ }
  }, [id]);

  const persist = (patch: Partial<{ brandVoice: BrandVoice | null; positioning: Positioning | null; competitive: Competitive | null }>) => {
    const payload = { brandVoice: patch.brandVoice ?? brandVoice, positioning: patch.positioning ?? positioning, competitive: patch.competitive ?? competitive };
    sessionStorage.setItem(`foundation-${id}`, JSON.stringify(payload));
  };

  const generateBrandVoice = async () => {
    setLoadingBV(true);
    setBrandVoiceError('');
    try {
      const r = await fetch('/api/brand-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');
      persist({ brandVoice: d.brandVoice });
      setBrandVoice(d.brandVoice);
      setIsCached(false);
      toastOk('Brand voice generated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setBrandVoiceError(msg);
      toastErr(msg);
    } finally {
      setLoadingBV(false);
    }
  };

  const generatePositioning = async () => {
    setLoadingPos(true);
    setPositioningError('');
    try {
      const r = await fetch('/api/positioning-angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');
      persist({ positioning: d.positioning });
      setPositioning(d.positioning);
      setIsCached(false);
      toastOk('Positioning angles generated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setPositioningError(msg);
      toastErr(msg);
    } finally {
      setLoadingPos(false);
    }
  };

  const generateCompetitive = async () => {
    setLoadingComp(true);
    setCompetitiveError('');
    try {
      const r = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');
      persist({ competitive: d.competitive });
      setCompetitive(d.competitive);
      setIsCached(false);
      toastOk('Competitive analysis generated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setCompetitiveError(msg);
      toastErr(msg);
    } finally {
      setLoadingComp(false);
    }
  };

  if (planLoading) return <DraftSkeleton />;
  if (planError) return <div className="max-w-3xl mx-auto py-20"><ErrorRetry error={planError} onRetry={loadPlan} /></div>;
  if (!plan) return (
    <div className="max-w-3xl mx-auto text-center py-20">
      <div className="text-slate-400 mb-4">Plan not found</div>
      <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">← Start a new analysis</Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <DismissableTip id="foundation-tip">Build your brand&apos;s strategic foundation — define your voice, personality traits, vocabulary guide, and positioning angles that guide all your marketing content.</DismissableTip>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">🧱 Foundation Layer</h1>
            {(brandVoice || positioning || competitive) && isCached && (
              <span className="text-xs text-slate-500">Cached · Regenerate to refresh</span>
            )}
          </div>
          <p className="text-slate-400">Brand voice, positioning angles &amp; competitive intel for {plan.config.app_name}</p>
        </div>
      </div>

      {/* Jump-links */}
      <nav className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/40 -mx-4 px-4 py-2.5 mb-8 flex items-center gap-3 overflow-x-auto">
        {[
          { id: 'brand-voice', label: '🎙️ Brand Voice' },
          { id: 'positioning', label: '🎯 Positioning' },
          { id: 'competitive', label: '⚔️ Competitive' },
        ].map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="text-sm text-slate-400 hover:text-white whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <section id="brand-voice" className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-8 scroll-mt-16">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">🎙️ Brand Voice</h2>
            <p className="text-sm text-slate-500">A usable voice profile for copy &amp; creative.</p>
          </div>
          <Button onClick={generateBrandVoice} disabled={loadingBV}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm px-5 py-2.5 rounded-xl">
            {loadingBV ? 'Generating…' : brandVoice ? <><RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Generate</>}
          </Button>
        </div>

        <GenerationError message={brandVoiceError} onRetry={generateBrandVoice} />

        {!brandVoice ? (
          <div className="mt-5 text-slate-500 text-sm">Not generated yet.</div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Summary */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
              <div className="text-sm font-semibold text-white mb-2">Voice summary</div>
              <div className="text-slate-200 text-sm leading-relaxed">{brandVoice.voiceSummary}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Traits */}
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                <div className="text-sm font-semibold text-white mb-3">Personality traits</div>
                <div className="space-y-3">
                  {brandVoice.personalityTraits?.map((t, i) => (
                    <div key={`${t.trait}-${i}`} className="border border-slate-700/40 rounded-xl p-3">
                      <div className="text-sm text-white font-semibold">{t.trait}</div>
                      <div className="text-xs text-slate-400 mt-1">{t.description}</div>
                      <div className="text-xs text-slate-300 mt-2 bg-slate-950/30 border border-slate-700/40 rounded-lg p-2 italic">&ldquo;{t.example}&rdquo;</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {/* Vocabulary */}
                <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-white mb-3">Vocabulary guide</div>
                  <div className="space-y-3">
                    <div><div className="text-xs text-slate-400 mb-2">✅ Words to use</div><Chips items={brandVoice.vocabularyGuide?.wordsToUse || []} /></div>
                    <div><div className="text-xs text-slate-400 mb-2">❌ Words to avoid</div><Chips items={brandVoice.vocabularyGuide?.wordsToAvoid || []} /></div>
                    <div><div className="text-xs text-slate-400 mb-2">✅ Phrases to use</div><Chips items={brandVoice.vocabularyGuide?.phrasesToUse || []} /></div>
                    <div><div className="text-xs text-slate-400 mb-2">❌ Phrases to avoid</div><Chips items={brandVoice.vocabularyGuide?.phrasesToAvoid || []} /></div>
                  </div>
                </div>

                {/* Tone */}
                <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-white mb-3">Tone spectrum</div>
                  <div className="grid grid-cols-2 gap-3">
                    <ToneBar label="Formal" value={brandVoice.toneSpectrum?.formal} />
                    <ToneBar label="Playful" value={brandVoice.toneSpectrum?.playful} />
                    <ToneBar label="Technical" value={brandVoice.toneSpectrum?.technical} />
                    <ToneBar label="Emotional" value={brandVoice.toneSpectrum?.emotional} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section id="positioning" className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-8 scroll-mt-16">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">🎯 Positioning Angles</h2>
            <p className="text-sm text-slate-500">3–5 distinct ways to frame the product.</p>
          </div>
          <Button onClick={generatePositioning} disabled={loadingPos}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm px-5 py-2.5 rounded-xl">
            {loadingPos ? 'Generating…' : positioning ? <><RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Generate</>}
          </Button>
        </div>

        <GenerationError message={positioningError} onRetry={generatePositioning} />

        {!positioning ? (
          <div className="mt-5 text-slate-500 text-sm">Not generated yet.</div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="bg-indigo-950/25 border border-indigo-800/40 rounded-2xl p-4 text-sm text-slate-200">
              <span className="text-indigo-300 font-semibold">Recommended primary:</span> {positioning.recommendedPrimary}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {positioning.angles?.map((a) => {
                const open = expandedAngle === a.name;
                return (
                  <div key={a.name} className="bg-slate-900/40 border border-slate-700/40 rounded-2xl overflow-hidden">
                    <button onClick={() => setExpandedAngle(open ? null : a.name)} className="w-full text-left p-4 hover:bg-slate-900/60 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-white font-semibold">{a.name}</div>
                          <div className="text-slate-300 text-sm mt-1">{a.hook}</div>
                        </div>
                        <span className="text-slate-400 text-sm shrink-0">{open ? '−' : '+'}</span>
                      </div>
                    </button>
                    {open && (
                      <div className="p-4 pt-0 space-y-3">
                        <div><div className="text-xs text-slate-400 mb-1">Why it works</div><div className="text-sm text-slate-200">{a.psychology}</div></div>
                        <div><div className="text-xs text-slate-400 mb-1">Headline directions</div>
                          <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1">
                            {a.headlineDirections?.map((h, i) => <li key={i}>{h}</li>)}
                          </ul>
                        </div>
                        <div><div className="text-xs text-slate-400 mb-1">Best for</div><div className="text-sm text-slate-200">{a.bestFor}</div></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
              <div className="text-sm font-semibold text-white mb-2">Anti-positioning</div>
              <div className="text-xs text-slate-400 mb-2">What we are NOT</div>
              <Chips items={positioning.antiPositioning?.whatWeAreNot || []} />
              <div className="text-xs text-slate-400 mt-4 mb-1">Why it matters</div>
              <div className="text-sm text-slate-200">{positioning.antiPositioning?.whyItMatters}</div>
            </div>
          </div>
        )}
      </section>

      <section id="competitive" className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-10 scroll-mt-16">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">⚔️ Competitive Analysis</h2>
            <p className="text-sm text-slate-500">Competitors, gaps, opportunities &amp; messaging.</p>
          </div>
          <Button onClick={generateCompetitive} disabled={loadingComp}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm px-5 py-2.5 rounded-xl">
            {loadingComp ? 'Generating…' : competitive ? <><RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Generate</>}
          </Button>
        </div>

        <GenerationError message={competitiveError} onRetry={generateCompetitive} />

        {!competitive ? (
          <div className="mt-5 text-slate-500 text-sm">Not generated yet.</div>
        ) : (
          <div className="mt-5 space-y-6">
            {/* Comparison table */}
            <div className="overflow-x-auto border border-slate-700/40 rounded-2xl">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-slate-900/50 text-slate-300">
                  <tr>
                    <th className="text-left p-3 border-b border-slate-700/40">Competitor</th>
                    <th className="text-left p-3 border-b border-slate-700/40">Positioning</th>
                    <th className="text-left p-3 border-b border-slate-700/40">Pricing</th>
                    <th className="text-left p-3 border-b border-slate-700/40">Strengths</th>
                    <th className="text-left p-3 border-b border-slate-700/40">Weaknesses</th>
                  </tr>
                </thead>
                <tbody>
                  {competitive.competitors?.map((c) => (
                    <tr key={c.url || c.name} className="align-top">
                      <td className="p-3 border-b border-slate-700/30">
                        <div className="text-white font-semibold">{c.name}</div>
                        {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-300 hover:text-indigo-200 break-all">{c.url}</a>}
                        {c.keyMessaging?.length > 0 && (
                          <div className="mt-2"><div className="text-xs text-slate-500 mb-1">Key messaging</div>
                            <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">{c.keyMessaging.slice(0, 4).map((m, i) => <li key={i}>{m}</li>)}</ul>
                          </div>
                        )}
                      </td>
                      <td className="p-3 border-b border-slate-700/30 text-slate-200">{c.positioning}</td>
                      <td className="p-3 border-b border-slate-700/30 text-slate-200">{c.pricing}</td>
                      <td className="p-3 border-b border-slate-700/30"><ul className="list-disc pl-5 text-xs text-slate-200 space-y-1">{c.strengths?.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}</ul></td>
                      <td className="p-3 border-b border-slate-700/30"><ul className="list-disc pl-5 text-xs text-slate-200 space-y-1">{c.weaknesses?.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}</ul></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                <div className="text-sm font-semibold text-white mb-2">Gaps</div>
                <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1">{competitive.gaps?.map((g, i) => <li key={i}>{g}</li>)}</ul>
              </div>
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                <div className="text-sm font-semibold text-white mb-2">Opportunities</div>
                <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1">{competitive.opportunities?.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </div>
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
                <div className="text-sm font-semibold text-white mb-2">Keyword gaps</div>
                <div className="text-xs text-slate-500 mb-2">Topics competitors miss or under-emphasise</div>
                <Chips items={competitive.keywordGaps || []} />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
