'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Goal {
  id: string;
  icon: string;
  title: string;
  desc: string;
  hint: string;
  urlRequired: boolean;
  route: (url: string) => string;
}

const GOALS: Goal[] = [
  {
    id: 'full-brief',
    icon: '🧭',
    title: 'Full Marketing Brief',
    desc: 'Complete 5-stage plan: research, positioning, structure, copy templates, and distribution.',
    hint: 'Best for new apps or products you haven\'t marketed yet.',
    urlRequired: true,
    route: (url) => `/analyze?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'aso',
    icon: '📱',
    title: 'App Store Optimisation',
    desc: 'Keyword research, competitor analysis, and optimised App Store / Play Store copy.',
    hint: 'Best for live mobile apps that need better discoverability.',
    urlRequired: true,
    route: (url) => `/analyze?url=${encodeURIComponent(url)}&focus=aso`,
  },
  {
    id: 'social-pack',
    icon: '📣',
    title: 'Social Media Pack',
    desc: 'Generate OG images, social cards, and platform-sized graphics ready to post.',
    hint: 'Best when you need launch or promo visuals fast.',
    urlRequired: true,
    route: (url) => `/analyze?url=${encodeURIComponent(url)}&focus=assets`,
  },
  {
    id: 'competitor-intel',
    icon: '🔍',
    title: 'Competitor Intelligence',
    desc: 'Scrape and compare competitors — pricing, positioning, features, and gaps.',
    hint: 'Best when you want to understand the landscape before deciding what to build.',
    urlRequired: true,
    route: (url) => `/analyze?url=${encodeURIComponent(url)}&focus=competitors`,
  },
  {
    id: 'copy-enhance',
    icon: '✍️',
    title: 'Enhance Existing Copy',
    desc: 'Paste your current marketing copy and get AI-improved variants in multiple tones.',
    hint: 'Best when you already have copy but it needs punching up.',
    urlRequired: false,
    route: () => '/dashboard',
  },
  {
    id: 'review-monitor',
    icon: '⭐',
    title: 'Review Monitoring',
    desc: 'Track App Store reviews, sentiment trends, and generate response templates.',
    hint: 'Best for live apps with reviews you want to stay on top of.',
    urlRequired: true,
    route: () => '/marketing/reviews',
  },
];

type Step = 'goal' | 'url' | 'confirm';

export default function WizardPage() {
  const [step, setStep] = useState<Step>('goal');
  const [selected, setSelected] = useState<Goal | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const selectGoal = (goal: Goal) => {
    setSelected(goal);
    setError('');
    if (!goal.urlRequired) {
      router.push(goal.route(''));
      return;
    }
    setStep('url');
  };

  const handleBack = () => {
    setStep('goal');
    setError('');
  };

  const handleGo = () => {
    if (!url.trim()) {
      setError('Please enter a URL.');
      return;
    }
    try {
      new URL(url);
    } catch {
      setError('That doesn\'t look like a valid URL.');
      return;
    }
    if (!selected) return;
    setStep('confirm');
  };

  const handleLaunch = () => {
    if (!selected) return;
    router.push(selected.route(url.trim()));
  };

  return (
    <div className="max-w-2xl mx-auto mt-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
          What do you need?
        </h1>
        <p className="text-slate-400 max-w-md mx-auto">
          Pick a goal and we&apos;ll run the right pipeline — no blank-page syndrome.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8 text-xs text-slate-500">
        {['Goal', 'Details', 'Go'].map((label, i) => {
          const stepIndex = ['goal', 'url', 'confirm'].indexOf(step);
          const active = i <= stepIndex;
          return (
            <span key={label} className="flex items-center gap-2">
              {i > 0 && <span className={active ? 'text-indigo-500' : 'text-slate-700'}>—</span>}
              <span
                className={`px-2.5 py-1 rounded-full font-medium ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-slate-800/50 text-slate-600 border border-slate-700/50'
                }`}
              >
                {label}
              </span>
            </span>
          );
        })}
      </div>

      {/* STEP 1 — Goal picker */}
      {step === 'goal' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GOALS.map((goal) => (
            <button
              key={goal.id}
              onClick={() => selectGoal(goal)}
              className="text-left bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-indigo-500/40 rounded-xl p-5 transition-all group"
            >
              <div className="text-2xl mb-2">{goal.icon}</div>
              <div className="font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                {goal.title}
              </div>
              <div className="text-xs text-slate-400 leading-relaxed mb-2">{goal.desc}</div>
              <div className="text-[11px] text-slate-500 italic">{goal.hint}</div>
            </button>
          ))}
        </div>
      )}

      {/* STEP 2 — URL input */}
      {step === 'url' && selected && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">{selected.icon}</span>
            <div>
              <div className="font-semibold text-white">{selected.title}</div>
              <div className="text-xs text-slate-400">{selected.hint}</div>
            </div>
          </div>

          <label htmlFor="wizard-url" className="block text-sm font-medium text-slate-300 mb-2">
            Enter the URL to analyse
          </label>
          <input
            id="wizard-url"
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            placeholder="https://apps.apple.com/app/... or any URL"
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all mb-3"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          {/* Quick examples */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs text-slate-500">Try:</span>
            {[
              { label: 'LightScout AI', url: 'https://apps.apple.com/gb/app/lightscout-ai/id6748341779' },
              { label: 'Spotify', url: 'https://play.google.com/store/apps/details?id=com.spotify.music' },
              { label: 'Linear', url: 'https://linear.app' },
            ].map((ex) => (
              <button
                key={ex.label}
                onClick={() => { setUrl(ex.url); setError(''); }}
                className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1 rounded-full transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleGo}
              disabled={!url.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-xl transition-all"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Confirm & launch */}
      {step === 'confirm' && selected && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center">
          <div className="text-4xl mb-4">{selected.icon}</div>
          <h2 className="text-xl font-bold text-white mb-2">{selected.title}</h2>
          <p className="text-sm text-slate-400 mb-1">We&apos;ll analyse:</p>
          <p className="text-indigo-400 font-mono text-sm mb-6 break-all">{url}</p>

          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 mb-6 text-left">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Pipeline</div>
            <ul className="text-sm text-slate-300 space-y-1.5">
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Scrape URL for metadata, features, and copy</li>
              {selected.id === 'full-brief' && (
                <>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Generate 5-stage marketing brief</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Competitive landscape scan</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> SEO keyword research</li>
                </>
              )}
              {selected.id === 'aso' && (
                <>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> App Store keyword analysis</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Competitor comparison</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Optimised title, subtitle, description</li>
                </>
              )}
              {selected.id === 'social-pack' && (
                <>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Generate OG images and social cards</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Platform-sized graphics (Twitter, IG, LinkedIn, FB)</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Download as PNG or ZIP</li>
                </>
              )}
              {selected.id === 'competitor-intel' && (
                <>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Scrape top competitors</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Compare pricing, features, positioning</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Identify gaps and opportunities</li>
                </>
              )}
              {selected.id === 'review-monitor' && (
                <>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Fetch recent App Store reviews</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Sentiment analysis</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Response templates</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('url')}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleLaunch}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all text-lg"
            >
              🚀 Launch
            </button>
          </div>
        </div>
      )}

      {/* Skip link */}
      <div className="text-center mt-8">
        <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          or paste a URL directly on the home page →
        </a>
      </div>
    </div>
  );
}
