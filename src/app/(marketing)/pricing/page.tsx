import type { Metadata } from 'next';
import Link from 'next/link';

const STRIPE_LAUNCH_PACK_URL = 'https://buy.stripe.com/6oU28t1uwbKY0lx8vt0Ny00';

export const metadata: Metadata = {
  title: 'Pricing — £99 Launch Pack',
  description: 'See what is included in the one-time £99 Launch Pack and start generating launch-ready marketing assets.',
};

export default function PricingPage() {
  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-600/15 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-200">
            Simple pricing for early-stage teams
          </p>
          <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
            Get your launch messaging sorted for one fixed price.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            The Launch Pack gives you strategy plus ready-to-edit copy so you can ship faster with less guesswork.
          </p>

          <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 dark:border-slate-700/60 dark:bg-slate-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Launch Pack</p>
            <p className="mt-2 text-4xl font-bold text-slate-900 dark:text-white">£99 one-time</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No subscription. Pay once and start generating immediately.</p>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-xs text-emerald-700 dark:text-emerald-200">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">30-day money-back guarantee</span>
            </div>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={STRIPE_LAUNCH_PACK_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 sm:w-auto"
              >
                Buy Launch Pack for £99
              </a>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
              >
                Try with your URL first
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-900/40 dark:bg-indigo-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600/10">
            <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">30-day money-back guarantee</h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              Try the Launch Pack risk-free. If it doesn&apos;t help you launch faster or clearer, email us within 30 days for a full refund. No questions asked.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">What&apos;s included</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {[
              'One complete marketing brief from your website or app listing URL',
              'Positioning, target audience, and channel priorities in a single plan',
              'Launch-ready draft copy for app store listing, landing page, and updates',
              'Tone and message variants you can compare before publishing',
              'Actionable checklist so you can move from idea to launch faster',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Who it&apos;s for</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {[
              'Indie founders launching a new product or major update',
              'Small teams that need clear messaging without hiring an agency first',
              'App builders who want strategy and copy in one practical workflow',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">FAQ</h2>
        <div className="mt-5 space-y-5 text-sm text-slate-600 dark:text-slate-300">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Is this a monthly subscription?</h3>
            <p className="mt-1">No. The Launch Pack is a one-time payment of £99.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">How quickly can I use it?</h3>
            <p className="mt-1">You can start right away after checkout and generate outputs in minutes.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">What do I need before buying?</h3>
            <p className="mt-1">Just your product URL. The tool uses that to build your brief and copy drafts.</p>
          </div>
        </div>

        <div className="mt-7">
          <a
            href={STRIPE_LAUNCH_PACK_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Checkout securely for £99
          </a>
        </div>
      </section>
    </div>
  );
}
