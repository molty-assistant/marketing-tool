'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Check, ArrowRight, FileText, Shield } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ExampleShowcase } from '@/components/ExampleShowcase';
import { TIERS, SAMPLE_PACK_URL } from '@/lib/pricing';

const FAQ_ITEMS = [
  {
    question: 'How does it work?',
    answer: 'Answer 5 quick questions about your product, pay once, and your AI-generated marketing pack is ready to download as a PDF within minutes. No account needed.',
  },
  {
    question: 'Is this a subscription?',
    answer: 'No. You pay once and the pack is yours forever. No recurring charges, no hidden fees.',
  },
  {
    question: 'What do I need before buying?',
    answer: 'Just your product URL (website, App Store, or Google Play listing). We analyse it to personalise your brief, copy, and social posts.',
  },
  {
    question: 'What\'s the difference between Entry and Pro?',
    answer: 'Entry (£39) gives you positioning, landing page copy, and 5 social posts — everything to start shipping. Pro (£99) adds email sequences, a 30-day content calendar, ad copy angles, app store copy, and more social posts.',
  },
  {
    question: 'Can I see a sample first?',
    answer: 'Yes — browse the example output above or view the full sample pack to see the depth and quality before you buy.',
  },
  {
    question: 'What if I\'m not happy?',
    answer: '30-day money-back guarantee. If the pack doesn\'t help you launch clearer or faster, email us for a full refund.',
  },
];

export default function LandingPage() {
  return (
    <div className="w-full">

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32 noise-overlay">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 h-[700px] w-[700px] rounded-full bg-indigo-600/12 blur-[140px]" />
          <div className="absolute bottom-0 right-[-10%] h-[500px] w-[500px] rounded-full bg-violet-600/8 blur-[120px]" />
          <div className="absolute bottom-0 left-[-10%] h-[400px] w-[400px] rounded-full bg-blue-700/8 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center px-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/8 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Pay once · Instant PDF delivery · No account needed
          </div>

          {/* Headline */}
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance text-foreground">
            Your entire launch marketing —{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              sorted in minutes
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Paste your product URL, answer 5 questions, and get a complete marketing pack — positioning, landing page copy, social posts, and more. From {TIERS.entry.price}.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/start?tier=pro"
              className="group inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-400 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(99,102,241,0.35)] border border-indigo-400/20 hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:scale-[1.02] transition-all duration-200"
            >
              Get your pack — from {TIERS.entry.price}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
            <a
              href="#examples"
              className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-4 text-base font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              See example output
            </a>
          </div>

          {/* Trust signals */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              30-day money-back guarantee
            </span>
            <span className="hidden sm:inline text-border">·</span>
            <span>One-time payment</span>
            <span className="hidden sm:inline text-border">·</span>
            <span>PDF ready in minutes</span>
          </div>

          {/* PDF Mockup */}
          <div className="mt-14 mx-auto max-w-2xl">
            <div className="relative">
              <div className="absolute inset-x-12 bottom-0 h-24 bg-indigo-600/20 blur-3xl rounded-full" />
              <div className="relative">
                <div
                  className="absolute inset-x-4 top-3 bottom-0 rounded-xl border border-border overflow-hidden"
                  style={{ transform: 'perspective(1200px) rotateX(3deg) rotateY(3deg) translateY(8px)', zIndex: 0 }}
                >
                  <Image
                    src="/sample/pdf-page4.png"
                    alt=""
                    width={800}
                    height={600}
                    className="w-full object-cover object-top opacity-40"
                    aria-hidden="true"
                  />
                </div>
                <div
                  className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-1.5 shadow-2xl overflow-hidden"
                  style={{ transform: 'perspective(1200px) rotateX(3deg) rotateY(-1deg)', zIndex: 1 }}
                >
                  <Image
                    src="/sample/pdf-page10.png"
                    alt="Sample Launch Pack showing landing and listing copy direction"
                    width={900}
                    height={700}
                    className="w-full rounded-xl"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent rounded-2xl pointer-events-none" />
                </div>
              </div>
              <div className="mt-5 text-center">
                <Link
                  href={SAMPLE_PACK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View full sample pack →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EXAMPLE OUTPUT ─── */}
      <section id="examples" className="mt-16 sm:mt-24 scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">See what you get</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Real example output from a completed pack. Browse each section below.
            </p>
          </div>
          <ExampleShowcase />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="mt-16 sm:mt-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Three steps. That&apos;s it.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'Answer 5 questions',
                desc: 'Your product URL, tone, audience, channel, and goal. Takes 2 minutes.',
              },
              {
                step: '02',
                title: 'Pay once',
                desc: `Entry (${TIERS.entry.price}) or Pro (${TIERS.pro.price}) — secure Stripe checkout. No subscription.`,
              },
              {
                step: '03',
                title: 'Download your PDF',
                desc: 'AI-generated positioning, copy, and content plan — ready to paste and ship.',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span className="text-xs font-bold tracking-widest text-indigo-500">STEP {s.step}</span>
                <div className="mt-3 text-base font-semibold text-foreground">{s.title}</div>
                <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="mt-16 sm:mt-24 scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Choose your pack</h2>
            <p className="mt-2 text-sm text-muted-foreground">One-time payment. Instant PDF delivery. No account required.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Entry */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-base font-bold text-foreground">{TIERS.entry.name}</span>
                  <p className="mt-1 text-xs text-muted-foreground">Typically {TIERS.entry.pageCount} pages</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-foreground">{TIERS.entry.price}</span>
                  <p className="text-xs text-muted-foreground">one-time</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-5">{TIERS.entry.description}</p>
              <ul className="space-y-2.5 text-sm text-foreground/80 mb-6">
                {TIERS.entry.shortFeatures.map((f) => (
                  <li key={f} className="flex gap-2.5 items-start">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/start?tier=entry"
                className="flex items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-all"
              >
                Get {TIERS.entry.name} — {TIERS.entry.price}
              </Link>
            </div>

            {/* Pro — gradient border */}
            <div className="rounded-[17px] bg-gradient-to-b from-indigo-500/35 to-violet-500/15 p-[1px]">
              <div className="rounded-2xl bg-card p-6 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/8 blur-3xl rounded-full pointer-events-none" />

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-base font-bold text-foreground">{TIERS.pro.name}</span>
                    <p className="mt-1 text-xs text-muted-foreground">Typically {TIERS.pro.pageCount} pages</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{TIERS.pro.price}</span>
                    <p className="text-xs text-muted-foreground">one-time</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{TIERS.pro.description}</p>
                <ul className="space-y-2.5 text-sm text-foreground/80 mb-6">
                  {TIERS.pro.shortFeatures.map((f) => (
                    <li key={f} className="flex gap-2.5 items-start">
                      <Check className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/start?tier=pro"
                  className="flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-400 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-400/20 hover:shadow-[0_0_28px_rgba(99,102,241,0.45)] hover:scale-[1.01] transition-all"
                >
                  Get {TIERS.pro.name} — {TIERS.pro.price}
                </Link>
              </div>
            </div>

          </div>

          {/* Guarantee */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-emerald-500" />
            30-day money-back guarantee — no questions asked
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="mt-16 sm:mt-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Questions?</h2>
          </div>

          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            <Accordion type="single" collapsible>
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-0 px-6">
                  <AccordionTrigger className="text-sm font-semibold text-foreground/80 hover:text-foreground hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="mt-16 border-t border-border pt-8 pb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-foreground">LaunchKit</div>
            <div className="mt-1 text-sm text-muted-foreground">Launch marketing packs for indie makers. Pay once, yours forever.</div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6 text-sm">
            {[
              { href: '/#pricing', label: 'Pricing' },
              { href: '/#examples', label: 'Examples' },
              { href: SAMPLE_PACK_URL, label: 'Sample pack' },
              { href: '/terms', label: 'Terms' },
              { href: '/privacy', label: 'Privacy' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground/60">
          <span>© {new Date().getFullYear()} LaunchKit. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
