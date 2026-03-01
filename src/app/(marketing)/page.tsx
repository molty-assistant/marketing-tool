import Link from 'next/link';

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
              Basic — <strong className="text-slate-900 dark:text-white">£39.99</strong>
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
              desc: 'Basic (£39.99) or Pro (£99) — secure Stripe checkout, no subscription.',
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
                <span className="text-2xl font-bold text-indigo-600">£39.99</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">9–11 pages. Sharp positioning and landing page copy.</p>
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
                Get Basic — £39.99
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-indigo-500 bg-white p-6 dark:bg-[#0d1117] relative overflow-hidden">
              <div className="absolute top-4 right-4 rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-bold text-white">Popular</div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-slate-900 dark:text-white">Pro</span>
                <span className="text-2xl font-bold text-indigo-600">£99</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">19–25 pages. Everything in Basic plus the full launch toolkit.</p>
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

      {/* FOOTER */}
      <footer className="mt-14 border-t border-slate-200 pt-8 pb-10 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Marketing Toolkit</div>
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
          </div>
        </div>

        <div className="mt-8 text-xs text-slate-600">
          © {new Date().getFullYear()} Marketing Toolkit. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
