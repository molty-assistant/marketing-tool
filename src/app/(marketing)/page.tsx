'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import GenerationOverlay from '@/components/GenerationOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
      {children}
    </div>
  );
}

function normalizeUrl(input: string): string {
  return input.trim().match(/^https?:\/\//i) ? input.trim() : `https://${input.trim()}`;
}

function isValidUrl(input: string): boolean {
  try {
    new URL(normalizeUrl(input));
    return true;
  } catch {
    return false;
  }
}

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingUrl, setGeneratingUrl] = useState('');
  const router = useRouter();

  const features = useMemo(
    () => [
      {
        title: 'AI Briefs',
        desc: 'Generate a complete, structured marketing brief from any URL.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M8 6h10M8 10h10M8 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 4h12a2 2 0 012 2v14l-4-3H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Competitor Analysis',
        desc: 'Quick scan of positioning, angles, and messaging in your space.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 19V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 19V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Export Pack',
        desc: 'Download your brief as clean Markdown and PDF-ready content.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v3h16v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Multi-Platform',
        desc: 'Works for App Store, Google Play, and any website landing page.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7z" stroke="currentColor" strokeWidth="2" />
            <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Brand Assets',
        desc: 'Generate copy-friendly assets and visual direction you can reuse.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M4 19V5h16v14H4z" stroke="currentColor" strokeWidth="2" />
            <path d="M8 9h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 13h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 13l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'A/B Variants',
        desc: 'Create multiple copy angles and iterate faster with your team.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M7 6h10M7 12h10M7 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 4h14v16H5V4z" stroke="currentColor" strokeWidth="2" />
          </svg>
        ),
      },
      {
        title: 'Shareable Links',
        desc: 'Send a single link to teammates or clients for review and edits.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M10 13a5 5 0 010-7l1-1a5 5 0 017 7l-1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 11a5 5 0 010 7l-1 1a5 5 0 01-7-7l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'SEO + Keywords',
        desc: 'Discover messaging and keyword opportunities for growth channels.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M10 10a4 4 0 118 0 4 4 0 01-8 0z" stroke="currentColor" strokeWidth="2" />
            <path d="M2 20l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 14l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
    []
  );

  const handleStart = () => {
    setError('');
    if (!url.trim()) {
      setError('Paste a URL to generate your plan.');
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    if (!isValidUrl(normalizedUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    setGeneratingUrl(normalizedUrl);
    setGenerating(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStart();
  };

  return (
    <div className="w-full">
      {generating && (
        <GenerationOverlay
          url={generatingUrl}
          onComplete={(planId) => router.push(`/plan/${planId}/quickwin`)}
          onError={(err) => {
            setGenerating(false);
            setError(err);
          }}
        />
      )}
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-700 dark:text-indigo-200">
            <span className="text-slate-700 dark:text-slate-300">Generate a brief in minutes, not days</span>
          </div>

          <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
            Turn Any URL Into a Complete Marketing Plan
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            Paste a link. Get a brief, content strategy, social posts, email sequences, SEO keywords, and distribution plan — in under 60 seconds.
          </p>

          {/* CTA */}
          <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-700/60 dark:bg-slate-900/60">
            <Label htmlFor="landing-url" className="block mb-3 text-left">
              Product URL (required)
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                id="landing-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="https://linear.app (or an App Store / Play link)"
                className="h-auto rounded-xl border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus-visible:border-transparent dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 sm:flex-1"
              />
              <Button
                onClick={handleStart}
                className="w-full sm:w-auto h-auto font-semibold px-6 py-3 whitespace-nowrap"
              >
                Generate plan →
              </Button>
            </div>
            {error && <p className="mt-2 text-left text-sm text-red-600 dark:text-red-400">{error}</p>}

            <p className="mt-3 text-left text-xs text-slate-500 dark:text-slate-500">
              No signup required · Works with any website, App Store, or Play Store link
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900/40">Export to Markdown/PDF</span>
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900/40">Built for founders & marketers</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mt-12 scroll-mt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">How it works</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            From link → brief → asset pack, in three simple steps.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              title: 'Paste URL',
              desc: 'Drop in an App Store, Google Play, or website URL.',
            },
            {
              step: '02',
              title: 'AI Generates',
              desc: 'We draft positioning, messaging, copy angles, and structure.',
            },
            {
              step: '03',
              title: 'Download Pack',
              desc: 'Export a clean brief and reuse the outputs anywhere.',
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-300">STEP {s.step}</div>
                <div className="h-2 w-2 rounded-full bg-indigo-400/70" />
              </div>
              <div className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{s.title}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mt-12 scroll-mt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Everything you need to ship marketing faster</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Practical outputs — not generic advice — designed to drop straight into your workflow.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="flex items-start gap-3">
                <Icon>{f.icon}</Icon>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{f.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-14 border-t border-slate-200 pt-8 pb-10 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Marketing Tool</div>
            <div className="mt-1 text-sm text-slate-500">Turn any URL into a complete marketing brief.</div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6 text-sm">
            <Link href="/dashboard" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Plans
            </Link>
            <a href="#features" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Features
            </a>
            {/* Pricing removed */}
          </div>
        </div>

        <div className="mt-8 text-xs text-slate-600">
          © {new Date().getFullYear()} Marketing Tool. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
