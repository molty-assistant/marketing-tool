'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
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
        title: 'Marketing Brief',
        desc: 'Generate a structured positioning brief from any app or website URL.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M8 6h10M8 10h10M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 4h12a2 2 0 012 2v14l-4-3H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Copy Drafts',
        desc: 'Generate app-store and landing copy variants ready for review and handoff.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7z" stroke="currentColor" strokeWidth="2" />
            <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Launch Pack',
        desc: 'Ship a concise brief and copy pack to your team or client in one flow.',
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
        title: 'Optional Channels',
        desc: 'Social and distribution routes remain available when you need them.',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v3h16v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
          onComplete={(planId) => router.push(`/plan/${planId}`)}
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
            <span className="text-slate-700 dark:text-slate-300">From URL to Brief + Copy in under a minute</span>
          </div>

          <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
            Paste Any URL. Get a Brief You Can Ship.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            Generate a structured marketing brief plus launch-ready copy drafts from your app, store listing, or website.
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
                Generate brief →
              </Button>
            </div>
            {error && <p className="mt-2 text-left text-sm text-red-600 dark:text-red-400">{error}</p>}

            <p className="mt-3 text-left text-xs text-slate-500 dark:text-slate-500">
              No signup required · Works with any website, App Store, or Play Store link
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900/40">Brief · Copy Draft · Export</span>
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900/40">Built for indie makers</span>
            </div>

            <div className="mt-4">
              <a
                href="https://buy.stripe.com/6oU28t1uwbKY0lx8vt0Ny00"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Buy £99 Launch Brief + Copy Pack
              </a>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                Paid already? Submit your intake details to start:
              </p>
              <Link
                href="/intake"
                className="mt-2 inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                Go to Intake →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* EXAMPLE PACK */}
      <section className="mt-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-5 sm:p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            See an example pack
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
            Preview a delivered £99 Launch Brief + Copy Pack
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Read the LightScout sample plan exactly as clients receive it.
          </p>
          <a
            href="https://marketing-tool-production.up.railway.app/shared/6e540e90-748f-4be4-a139-e42f36e923cd"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Open LightScout example ↗
          </a>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mt-12 scroll-mt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">How it works</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            From link to launch-ready strategy and copy in three steps.
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
              title: 'Generate Brief',
              desc: 'AI builds positioning, audience focus, and launch messaging.',
            },
            {
              step: '03',
              title: 'Refine Copy',
              desc: 'Open draft copy, tone variants, and export your launch pack.',
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
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Everything you need to brief and ship launch copy</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Service-first workflow: strategy and copy first, channels optional.
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
            <div className="mt-1 text-sm text-slate-500">Brief + copy generation from any URL, in 60 seconds.</div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6 text-sm">
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
