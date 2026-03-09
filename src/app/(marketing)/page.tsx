'use client';

import { useState } from 'react';
import Link from 'next/link';

const FAQ_ITEMS = [
  {
    question: 'How long does delivery take?',
    answer: 'Your PDF is generated within 2-5 minutes after payment. No waiting for a human to get back to you.',
  },
  {
    question: 'Is this AI-generated?',
    answer: 'Yes, but you\'re not paying for raw AI output. You\'re paying for a structured framework based on what actually converts. We\'ve tested this with real indie makers.',
  },
  {
    question: 'What if I don\'t like the results?',
    answer: 'This is a one-time delivery product. Think of it as a strong starting foundation you can iterate on. You can always purchase another pack as your product evolves.',
  },
  {
    question: 'Can I see a sample first?',
    answer: 'Absolutely — check out the LightScout sample above. It shows you exactly what you\'ll get before you buy.',
  },
  {
    question: 'Do I need an account?',
    answer: 'No. Paste your URL, answer 5 questions, pay once, and download your PDF. No sign-up, no subscription.',
  },
];

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            aria-expanded={openIndex === index}
          >
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {openIndex === index ? '−' : '+'}
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {item.question}
            </span>
          </button>
          {openIndex === index && (
            <div className="px-12 pb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.answer}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="w-full">
      {/* HERO — Paid PDF product */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-slate-700 dark:text-slate-300">
            Instant PDF · No agency · No waiting
          </div>

          <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            Your complete marketing plan — generated in minutes
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            Answer 5 questions about your product. Pay once. Download a PDF full of ready-to-use copy, positioning, and a 30-day content plan.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/start"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Get my marketing plan →
            </Link>
          </div>

          {/* Pricing pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              Basic — <strong className="text-slate-900 dark:text-white">£39</strong>
            </span>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
              Pro — <strong>£99</strong>
            </span>
            <span className="text-slate-400">·</span>
            <span>No revisions · No account needed</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mt-12 scroll-mt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">How it works</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            From your product URL to a PDF you can act on — in under 3 minutes.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              title: 'Answer 5 questions',
              desc: 'Tell us your product URL, tone, audience, channel focus, and goal.',
            },
            {
              step: '02',
              title: 'Pay once',
              desc: 'Basic (£39) or Pro (£99) — secure Stripe checkout, no subscription.',
            },
            {
              step: '03',
              title: 'Download your PDF',
              desc: 'AI-generated positioning, copy, and a content plan ready to paste and ship.',
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

      {/* SOCIAL PROOF */}
      <section className="mt-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">See it in action</h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Here’s what a real Launch Pack looks like
            </p>
          </div>

          <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">LightScout AI</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">AI-powered photography location finder</p>
                <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">Delivered:</span> Complete positioning strategy, landing page copy, 30-day content calendar, social posts, and Reddit drafts
                  </p>
                </div>
                <Link
                  href="/shared/6e540e90-748f-4be4-a139-e42f36e923cd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  View full sample pack →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIER COMPARISON */}
      <section id="pricing" className="mt-12 scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">What you get</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Basic */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-slate-900 dark:text-white">Basic</span>
                <span className="text-2xl font-bold text-indigo-600">£39</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">Sharp positioning and landing page copy — typically 10+ pages depending on your product.</p>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {[
                  'Positioning Snapshot',
                  'Competitor Angles + Say This Not That',
                  '5 headline options + feature bullets',
                  'Short + long CTA options',
                  '5 X/Twitter + 2 LinkedIn launch posts',
                ].map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">✓</span>{f}</li>
                ))}
              </ul>
              <Link
                href="/start?tier=basic"
                className="mt-6 flex items-center justify-center rounded-xl border-2 border-indigo-500 px-6 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
              >
                Get Basic — £39
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-indigo-500 bg-white p-6 dark:bg-[#0d1117] relative overflow-hidden">
              <div className="absolute top-4 right-4 rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-bold text-white">Popular</div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-slate-900 dark:text-white">Pro</span>
                <span className="text-2xl font-bold text-indigo-600">£99</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">Everything in Basic plus the full launch toolkit — typically 20+ pages depending on your product.</p>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {[
                  'Everything in Basic',
                  'Email Sequence (3 emails + A/B subjects)',
                  '30-Day Content Calendar',
                  'Ad Copy Angles for Meta/X',
                  'App Store / Listing Copy',
                  'Tone-of-Voice Cheat Sheet',
                  '10 X/Twitter + 5 LinkedIn posts',
                ].map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">✓</span>{f}</li>
                ))}
              </ul>
              <Link
                href="/start?tier=pro"
                className="mt-6 flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Get Pro — £99
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Questions?</h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Everything you need to know before you start
            </p>
          </div>

          <FAQAccordion />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-14 border-t border-slate-200 pt-8 pb-10 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">LaunchKit</div>
            <div className="mt-1 text-sm text-slate-500">Instant AI-generated marketing plans.</div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6 text-sm">
            <Link href="/start" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Get a plan
            </Link>
            <a href="#pricing" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Pricing
            </a>
            <Link href="/my-pdfs" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              My plans
            </Link>
            <Link href="/terms" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Privacy
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} LaunchKit. All rights reserved.</span>
          <a href="mailto:moltychief@agentmail.to" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            moltychief@agentmail.to
          </a>
        </div>
      </footer>
    </div>
  );
}
