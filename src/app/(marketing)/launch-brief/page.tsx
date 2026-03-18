import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Clock, FileText, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Launch Brief + Copy Pack — £99 | LaunchKit',
  description:
    'Get a professional launch brief with App Store optimisation, positioning, 5 post ideas, and an action plan — delivered in 48 hours for £99.',
};

const included = [
  {
    title: 'Positioning & Messaging',
    description:
      'Clear who it's for, what makes it different, and the core message to lead with across every channel.',
  },
  {
    title: 'App Store Optimisation',
    description:
      'Keyword-researched title, subtitle, and description crafted to rank and convert.',
  },
  {
    title: '5 Social Post Ideas',
    description:
      'Ready-to-post captions for launch week — mix of hooks, benefits, and social proof formats.',
  },
  {
    title: 'Launch Action Plan',
    description:
      'A prioritised checklist of what to do and when, so you know exactly how to ship.',
  },
];

export default function LaunchBriefPage() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
        {/* Gradient mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 h-[600px] w-[600px] rounded-full bg-indigo-600/12 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center px-4 sm:px-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/8 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            One-time, fixed price
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
            <span className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
              Launch Brief &amp;{' '}
            </span>
            <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              Copy Pack
            </span>
          </h1>

          <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto leading-relaxed mb-10">
            Everything you need to position and launch your app — professionally written, delivered in 48 hours.
          </p>

          {/* Price + CTA */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white">£99</span>
              <span className="text-white/40 text-sm">one-off</span>
            </div>

            <a
              href="https://buy.stripe.com/6oU28t1uwbKY0lx8vt0Ny00"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-400 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(99,102,241,0.35)] border border-indigo-400/20 hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:scale-[1.02] transition-all duration-200"
            >
              Get My Launch Brief
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>

            <div className="flex items-center gap-1.5 text-sm text-white/40">
              <Clock className="h-3.5 w-3.5" />
              Delivered within 48 hours
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">What's included</h2>
          <p className="text-white/40 text-sm">Four deliverables, ready to use the moment you receive them.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {included.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 hover:border-indigo-500/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Check className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white text-sm mb-1">{item.title}</p>
                  <p className="text-white/40 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            How it works
          </h3>
          <ol className="space-y-4">
            {[
              { step: '1', text: 'Pay via Stripe — secure checkout, no account needed.' },
              { step: '2', text: 'Share your app URL or a short description in the confirmation form.' },
              { step: '3', text: 'Receive your full brief + copy pack by email within 48 hours.' },
            ].map(({ step, text }) => (
              <li key={step} className="flex gap-4 items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center">
                  {step}
                </span>
                <p className="text-white/50 text-sm leading-relaxed pt-0.5">{text}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Sample brief link */}
        <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.04] p-6 mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium text-sm mb-0.5">See a real example</p>
              <p className="text-white/40 text-sm">View the sample brief created for Sakinly.</p>
            </div>
          </div>
          <a
            href="/sakinly-brief-sample.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-indigo-500/30 px-5 py-2.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/8 hover:border-indigo-400/50 transition-all duration-200 flex-shrink-0"
          >
            View sample
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <a
            href="https://buy.stripe.com/6oU28t1uwbKY0lx8vt0Ny00"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-400 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(99,102,241,0.35)] border border-indigo-400/20 hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:scale-[1.02] transition-all duration-200 mb-3"
          >
            Get My Launch Brief — £99
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <p className="text-white/30 text-xs">48-hour delivery · Stripe secure checkout</p>
        </div>
      </section>
    </div>
  );
}
