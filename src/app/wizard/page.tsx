'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { DISTRIBUTION_CHANNELS } from '@/lib/constants';

type WizardStep = 0 | 1 | 2 | 3 | 4;

type Goal =
  | 'Launch campaign'
  | 'Ongoing content'
  | 'ASO optimization'
  | 'Competitive analysis'
  | 'Full marketing pack';
const GOALS: Goal[] = [
  'Launch campaign',
  'Ongoing content',
  'ASO optimization',
  'Competitive analysis',
  'Full marketing pack',
];


type Tone = 'professional' | 'casual' | 'bold' | 'minimal';

const TONE_SAMPLES: Record<Tone, string> = {
  professional: 'Elevate your workflow with precision-engineered solutions.',
  casual: "Hey there! We made something you're going to love.",
  bold: 'Stop settling. Start dominating.',
  minimal: 'Clean. Fast. Built for focus.',
};
const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: 'professional', label: 'Professional', desc: 'Clear, credible, confident.' },
  { id: 'casual', label: 'Casual', desc: 'Friendly, conversational, approachable.' },
  { id: 'bold', label: 'Bold', desc: 'Direct, high-energy, punchy.' },
  { id: 'minimal', label: 'Minimal', desc: 'Short, crisp, low-fluff.' },
];

type WizardState = {
  url: string;
  platforms: string[];
  goals: Goal[];
  tone: Tone;
};

const STORAGE_KEY = 'onboarding-wizard-v2';

const DEFAULT_STATE: WizardState = {
  url: '',
  platforms: ['twitter', 'instagram'],
  goals: ['Full marketing pack'],
  tone: 'professional',
};

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeUrl(input: string): string {
  return input.trim().match(/^https?:\/\//i) ? input.trim() : `https://${input.trim()}`;
}

function isValidUrl(input: string) {
  try {
    // eslint-disable-next-line no-new
    new URL(normalizeUrl(input));
    return true;
  } catch {
    return false;
  }
}

export default function WizardPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [step, setStep] = useState<WizardStep>(0);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);

  const [hoveredTone, setHoveredTone] = useState<Tone | null>(null);

  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Restore from sessionStorage
  useEffect(() => {
    const stored = safeParse<Partial<WizardState>>(sessionStorage.getItem(STORAGE_KEY));
    if (!stored) return;

    setState((prev) => ({
      ...prev,
      ...stored,
      platforms: Array.isArray(stored.platforms) ? (stored.platforms as string[]) : prev.platforms,
      goals: Array.isArray(stored.goals) ? (stored.goals as Goal[]) : prev.goals,
    }));
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const stepMeta = useMemo(
    () => [
      { title: 'URL', subtitle: 'App Store, Play Store, or website' },
      { title: 'Platforms', subtitle: 'Where should we market?' },
      { title: 'Goals', subtitle: 'What are we trying to achieve?' },
      { title: 'Tone', subtitle: 'How should it sound?' },
      { title: 'Confirm', subtitle: 'Generate everything' },
    ],
    []
  );

  const canContinue = useMemo(() => {
    if (step === 0) return state.url.trim().length > 0 && isValidUrl(state.url.trim());
    if (step === 1) return state.platforms.length > 0;
    if (step === 2) return state.goals.length > 0;
    if (step === 3) return !!state.tone;
    return true;
  }, [step, state]);

  const goNext = () => {
    setError('');

    if (step === 0) {
      const url = normalizeUrl(state.url.trim());
      if (!url) return setError('Please enter a URL.');
      if (!isValidUrl(url)) return setError("That doesn't look like a valid URL.");
      setState((s) => ({ ...s, url }));
    }

    if (step === 1 && state.platforms.length === 0) {
      return setError('Select at least one platform.');
    }

    if (step === 2 && state.goals.length === 0) {
      return setError('Select at least one goal.');
    }

    if (step < 4) setStep((s) => (s + 1) as WizardStep);
  };

  const goBack = () => {
    setError('');
    if (step > 0) setStep((s) => (s - 1) as WizardStep);
  };

  const togglePlatform = (id: string) => {
    setError('');
    setState((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id) ? prev.platforms.filter((x) => x !== id) : [...prev.platforms, id],
    }));
  };

  const toggleGoal = (g: Goal) => {
    setError('');
    setState((prev) => ({
      ...prev,
      goals: prev.goals.includes(g) ? prev.goals.filter((x) => x !== g) : [...prev.goals, g],
    }));
  };

  const handleGenerateEverything = async () => {
    setGenerating(true);
    setError('');

    try {
      // 1) Scrape
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: state.url.trim() }),
      });
      const scraped = await scrapeRes.json();
      if (!scrapeRes.ok) throw new Error(scraped.error || 'Failed to scrape URL');

      // 2) Generate plan
      const planRes = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scraped,
          config: {
            distribution_channels: state.platforms,
          },
        }),
      });
      const plan = await planRes.json();
      if (!planRes.ok) throw new Error(plan.error || 'Generation failed');

      // Keep plan + wizard context available for the plan page
      sessionStorage.setItem(`plan-${plan.id}`, JSON.stringify(plan));
      sessionStorage.setItem(`${STORAGE_KEY}:last-run`, JSON.stringify({ ...state, planId: plan.id }));

      toastSuccess('Plan saved');
      router.push(`/plan/${plan.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate plan';
      setError(msg);
      toastError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const percent = ((step + 1) / stepMeta.length) * 100;

  return (
    <div className="max-w-2xl mx-auto mt-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
          Let&apos;s set up your marketing
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          A quick guided flow — we&apos;ll generate a full plan tailored to your URL, platforms, goals and tone.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-3">
          {stepMeta.map((s, i) => {
            const active = i <= step;
            return (
              <div key={s.title} className="flex-1 min-w-0">
                <div
                  className={
                    'w-full px-2.5 py-1 rounded-full font-medium border text-center truncate ' +
                    (active
                      ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                      : 'bg-slate-800/50 text-slate-600 border-slate-700/50')
                  }
                  title={s.title}
                >
                  {i + 1}. {s.title}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-2 bg-slate-800/60 border border-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-3 text-sm">
          <div className="text-white font-semibold">Step {step + 1} of {stepMeta.length}: {stepMeta[step].title}</div>
          <div className="text-slate-400 text-xs">{stepMeta[step].subtitle}</div>
        </div>
      </div>

      {/* Panel */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8">
        {/* STEP 1 — URL */}
        {step === 0 && (
          <div>
            <label htmlFor="wizard-url" className="block text-sm font-medium text-slate-300 mb-2">
              Paste your App Store / Play Store / website URL
            </label>
            <input
              id="wizard-url"
              type="url"
              value={state.url}
              onChange={(e) => {
                setState((s) => ({ ...s, url: e.target.value }));
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && goNext()}
              placeholder="https://apps.apple.com/app/... or https://play.google.com/store/apps/details?id=... or https://yourdomain.com"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all mb-3"
              autoFocus
            />

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-slate-500">Try:</span>
              {[
                { label: 'LightScout AI', url: 'https://apps.apple.com/gb/app/lightscout-ai/id6748341779' },
                { label: 'Spotify', url: 'https://play.google.com/store/apps/details?id=com.spotify.music' },
                { label: 'Linear', url: 'https://linear.app' },
              ].map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => {
                    setState((s) => ({ ...s, url: ex.url }));
                    setError('');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1 rounded-full transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500">
              We&apos;ll scrape metadata + features from this URL, then generate the full plan.
            </div>


          </div>
        )}

        {/* STEP 2 — Platforms */}
        {step === 1 && (
          <div>
            <div className="text-sm text-slate-300 mb-4">
              Choose the social platforms you want to target. This becomes your default distribution channel set.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DISTRIBUTION_CHANNELS.map((ch) => {
                const checked = state.platforms.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => togglePlatform(ch.id)}
                    className={
                      'text-left rounded-xl border p-4 transition-all ' +
                      (checked
                        ? 'bg-indigo-600/15 border-indigo-500/40'
                        : 'bg-slate-900/30 border-slate-700/60 hover:border-indigo-500/30 hover:bg-slate-900/50')
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          'w-5 h-5 rounded border flex items-center justify-center ' +
                          (checked ? 'bg-indigo-600 border-indigo-400' : 'bg-transparent border-slate-600')
                        }
                        aria-hidden
                      >
                        {checked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="font-semibold text-white">{ch.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tip: you can change this later on the plan page.
            </div>
          </div>
        )}

        {/* STEP 3 — Goals */}
        {step === 2 && (
          <div>
            <div className="text-sm text-slate-300 mb-4">
              What do you want from this run? (Pick one or more.)
            </div>

            <div className="space-y-2">
              {GOALS.map((g) => {
                const checked = state.goals.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGoal(g)}
                    className={
                      'w-full text-left rounded-xl border p-4 transition-all ' +
                      (checked
                        ? 'bg-indigo-600/15 border-indigo-500/40'
                        : 'bg-slate-900/30 border-slate-700/60 hover:border-indigo-500/30 hover:bg-slate-900/50')
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          'w-5 h-5 rounded border flex items-center justify-center ' +
                          (checked ? 'bg-indigo-600 border-indigo-400' : 'bg-transparent border-slate-600')
                        }
                        aria-hidden
                      >
                        {checked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="font-semibold text-white">{g}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              We store your goals for context. The initial plan generation always runs the core pipeline.
            </div>
          </div>
        )}

        {/* STEP 4 — Tone */}
        {step === 3 && (
          <div>
            <div className="text-sm text-slate-300 mb-4">
              Pick the voice you want across generated copy.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TONES.map((t) => {
                const selected = state.tone === t.id;
                return (
                  <button
                    key={t.id}
                    onMouseEnter={() => setHoveredTone(t.id)}
                    onMouseLeave={() => setHoveredTone(null)}
                    onClick={() => {
                      setState((s) => ({ ...s, tone: t.id }));
                      setError('');
                    }}
                    className={
                      'text-left rounded-xl border p-4 transition-all ' +
                      (selected
                        ? 'bg-indigo-600/15 border-indigo-500/40'
                        : 'bg-slate-900/30 border-slate-700/60 hover:border-indigo-500/30 hover:bg-slate-900/50')
                    }
                  >
                    <div className="font-semibold text-white">{t.label}</div>
                    <div className="text-xs text-slate-400 mt-1">{t.desc}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Tone preview</div>
              <div className="text-sm text-slate-200 mt-2 italic">
                "{TONE_SAMPLES[(hoveredTone ?? state.tone) as Tone]}"
              </div>
            </div>

          </div>
        )}

        {/* STEP 5 — Confirm */}
        {step === 4 && (
          <div>
            <div className="text-sm text-slate-300 mb-5">
              Confirm your selections. When you click <span className="text-white font-semibold">Generate Everything</span>, we&apos;ll scrape the URL and generate a full marketing plan.
            </div>

            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 mb-6">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Summary</div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-slate-400 text-xs mb-1">URL</div>
                  <div className="text-indigo-400 font-mono break-all">{state.url}</div>
                </div>

                <div>
                  <div className="text-slate-400 text-xs mb-1">Platforms</div>
                  <div className="text-white">
                    {state.platforms
                      .map((id) => DISTRIBUTION_CHANNELS.find((ch) => ch.id === id)?.label ?? id)
                      .join(', ')}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-xs mb-1">Goals</div>
                  <div className="text-white">{state.goals.join(', ')}</div>
                </div>

                <div>
                  <div className="text-slate-400 text-xs mb-1">Tone</div>
                  <div className="text-white">{state.tone}</div>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 mb-5">
              Note: goals + tone are saved for downstream generators. The plan generation uses your selected distribution channels immediately.
            </div>

            <button
              onClick={handleGenerateEverything}
              disabled={generating}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold px-6 py-3 rounded-xl transition-all text-lg"
            >
              {generating ? 'Generating…' : 'Generate Everything'}
            </button>

            {error && step === 4 && !generating && (
              <button
                onClick={handleGenerateEverything}
                className="w-full mt-3 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-700/60 text-slate-200 font-semibold px-6 py-3 rounded-xl transition-all"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

        {/* Nav */}
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={goBack}
            disabled={step === 0 || generating}
            className="text-sm text-slate-400 hover:text-white disabled:text-slate-600 transition-colors"
          >
            ← Back
          </button>

          {step < 4 ? (
            <button
              onClick={goNext}
              disabled={!canContinue || generating}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-xl transition-all"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={() => setStep(0)}
              disabled={generating}
              className="flex-1 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-700/60 text-slate-200 font-semibold px-6 py-3 rounded-xl transition-all"
            >
              Start over
            </button>
          )}
        </div>
      </div>

      {/* Skip link */}
      <div className="text-center mt-8">
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          or paste a URL directly on the home page →
        </Link>
      </div>
    </div>
  );
}
