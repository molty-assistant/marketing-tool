'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Check, ArrowRight, FileText, Zap } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const STRIPE_LAUNCH_PACK_URL = 'https://buy.stripe.com/6oU28t1uwbKY0lx8vt0Ny00';
const SAMPLE_PACK_URL = '/shared/6e540e90-748f-4be4-a139-e42f36e923cd';
const INTAKE_PAGE_URL = '/intake';
const INTAKE_EMAIL = 'moltychief@agentmail.to';
const FIT_CHECK_MAILTO = `mailto:${INTAKE_EMAIL}?subject=${encodeURIComponent('Launch Pack fit check')}`;

const FAQ_ITEMS = [
  {
    question: 'How long does delivery take?',
    answer: 'Your Launch Brief + Copy Pack is delivered within 48 hours after you submit your intake details.',
  },
  {
    question: 'Is this for me?',
    answer: 'If you\'re an indie maker, product person, or busy founder who needs clear positioning and copy to win first customers, yes. Not for enterprises, complex compliance projects, or those wanting unlimited revisions.',
  },
  {
    question: 'Is this AI-generated?',
    answer: "It is AI-assisted, but edited for clarity and conversion. You are paying for a finished pack, not raw AI output.",
  },
  {
    question: 'What if I don\'t like the results?',
    answer: 'Reply with what feels off (tone, audience, or promises) and you get one revision included.',
  },
  {
    question: 'What do you need from me?',
    answer: `Your URL, who it is for, your deadline, 3 competitors, and preferred tone. Send details via ${INTAKE_PAGE_URL} or by email.`,
  },
  {
    question: 'Do I get access to the tool?',
    answer: 'Not yet. This is a service-first founding batch.',
  },
  {
    question: 'Can I see a sample first?',
    answer: 'Yes. View the LightScout sample pack above to see the framing and depth before you buy.',
  },
];

const PACK_INCLUDES = [
  'Positioning snapshot: customer, pain, value prop, and support points',
  'Landing / website copy: headline options, hero subheads, feature bullets, CTAs',
  'App Store / listing copy (if relevant): subtitle, short + long descriptions, keyword ideas',
  'Launch comms starter set: 5 X posts / launch messaging angles',
];

const PACK_TERMS = [
  '£99 one-time payment',
  'Done-for-you delivery within 48 hours of intake',
  'One revision included',
  `Intake via ${INTAKE_PAGE_URL} or ${INTAKE_EMAIL}`,
];

const WHO_FOR_ITEMS = [
  {
    title: 'Solo indie makers',
    desc: 'Building your first or second product. Need clear positioning and copy that converts.',
    icon: '🚀',
  },
  {
    title: 'Product people',
    desc: 'You ship great features but struggle with messaging. Want sharper landing pages and launch comms.',
    icon: '🎯',
  },
  {
    title: 'Busy founders',
    desc: 'Time-poor and need done-for-you delivery. Don\'t want to learn marketing frameworks from scratch.',
    icon: '⚡',
  },
  {
    title: 'Pre-launch builders',
    desc: 'Nearing launch and need positioning and copy ready for the big day.',
    icon: '🚦',
  },
];

const WHO_NOT_FOR_ITEMS = [
  'Enterprises or agencies',
  'Projects with complex compliance requirements',
  'Those wanting unlimited revisions',
];

export default function LandingPage() {
  return (
    <div className="w-full">

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36 noise-overlay">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 h-[700px] w-[700px] rounded-full bg-indigo-600/12 blur-[140px]" />
          <div className="absolute bottom-0 right-[-10%] h-[500px] w-[500px] rounded-full bg-violet-600/8 blur-[120px]" />
          <div className="absolute bottom-0 left-[-10%] h-[400px] w-[400px] rounded-full bg-blue-700/8 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center px-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/8 px-4 py-1.5 text-xs font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            £99 one-time · Done-for-you · 48h delivery
          </div>

          {/* Headline */}
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
            <span className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
              Launch Brief + Copy Pack —{' '}
            </span>
            <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              done for you in 48 hours
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            Get clear positioning, sharper landing/listing copy, and launch comms (5 X posts / launch messaging angles) you can ship fast. This is a service-first offer for indie makers who want their first customers.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href={STRIPE_LAUNCH_PACK_URL}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-400 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(99,102,241,0.35)] border border-indigo-400/20 hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:scale-[1.02] transition-all duration-200"
            >
              Pay £99 and start
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
            <a
              href={FIT_CHECK_MAILTO}
              className="inline-flex items-center justify-center rounded-xl border border-indigo-500/30 px-8 py-4 text-base font-semibold text-indigo-300 hover:bg-indigo-500/8 hover:border-indigo-400/50 transition-all duration-200"
            >
              Check fit first
            </a>
          </div>

          <p className="mt-4 text-sm text-white/35">
            Already paid? Send intake via{' '}
            <Link href={INTAKE_PAGE_URL} className="text-indigo-300 hover:text-indigo-200 transition-colors">
              {INTAKE_PAGE_URL}
            </Link>{' '}
            or email{' '}
            <a href={`mailto:${INTAKE_EMAIL}`} className="text-indigo-300 hover:text-indigo-200 transition-colors">
              {INTAKE_EMAIL}
            </a>
            .
          </p>

          {/* Pricing pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/8 px-4 py-1.5 text-indigo-300">
              Launch Pack — <strong>£99</strong>
            </span>
            <span className="rounded-full border border-white/8 bg-white/4 px-4 py-1.5 text-white/40">
              Positioning + landing/listing copy + launch comms (5 X posts / launch messaging angles)
            </span>
            <span className="text-white/20">·</span>
            <span className="text-white/35">One revision included</span>
          </div>

          {/* Quick links */}
          <div className="mt-4 text-sm">
            <Link href="#who-for" className="text-white/30 hover:text-white/60 transition-colors">
              Who is this for? →
            </Link>
          </div>

          {/* PDF Mockup */}
          <div className="mt-16 mx-auto max-w-2xl">
            <div className="relative">
              {/* Glow behind mockup */}
              <div className="absolute inset-x-12 bottom-0 h-24 bg-indigo-600/20 blur-3xl rounded-full" />
              {/* Stacked pages effect */}
              <div className="relative">
                {/* Back page (page 4 - exec summary) */}
                <div
                  className="absolute inset-x-4 top-3 bottom-0 rounded-xl border border-white/6 bg-white/[0.02] overflow-hidden"
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
                {/* Front page (page 10 - landing copy) */}
                <div
                  className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-1.5 shadow-2xl overflow-hidden"
                  style={{ transform: 'perspective(1200px) rotateX(3deg) rotateY(-1deg)', zIndex: 1 }}
                >
                  <Image
                    src="/sample/pdf-page10.png"
                    alt="Sample Launch Brief + Copy Pack showing landing and listing copy direction"
                    width={900}
                    height={700}
                    className="w-full rounded-xl"
                    priority
                  />
                  {/* Overlay shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.10_0.008_270)]/40 via-transparent to-transparent rounded-2xl pointer-events-none" />
                </div>
              </div>
              {/* View sample link */}
              <div className="mt-5 text-center">
                <Link
                  href={SAMPLE_PACK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-indigo-300 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View full sample pack →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHO THIS IS FOR ─── */}
      <section id="who-for" className="mt-20 sm:mt-28 scroll-mt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Who this is for</h2>
          <p className="mt-2 text-sm sm:text-base text-white/40">
            Built for indie makers who want to ship with confidence.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {WHO_FOR_ITEMS.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 hover:border-indigo-500/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-2xl">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Who this is NOT for */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-white/4 bg-white/[0.01] p-6">
            <h4 className="text-sm font-semibold text-white/60 mb-3">Not for you if:</h4>
            <ul className="space-y-2">
              {WHO_NOT_FOR_ITEMS.map((item, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm text-white/40">
                  <span className="text-white/20 mt-0.5">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="mt-20 sm:mt-28 scroll-mt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">How it works</h2>
          <p className="mt-2 text-sm sm:text-base text-white/40">
            Fast, scoped service: pay, send intake, get your pack in 48 hours.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
          {/* Connecting lines (desktop) */}
          <div className="hidden sm:block absolute top-8 left-[33%] right-[33%] h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent pointer-events-none" />

          {[
            {
              step: '01',
              icon: <Zap className="h-4 w-4 text-indigo-400" />,
              title: 'Pay £99',
              desc: 'Secure your Launch Brief + Copy Pack via Stripe with a one-time payment.',
            },
            {
              step: '02',
              icon: <FileText className="h-4 w-4 text-indigo-400" />,
              title: 'Send intake details',
              desc: `Share your URL, deadline, competitors, and tone via ${INTAKE_PAGE_URL} or email.`,
            },
            {
              step: '03',
              icon: <ArrowRight className="h-4 w-4 text-indigo-400" />,
              title: 'Receive your pack in 48h',
              desc: 'Get done-for-you positioning, landing/listing copy, launch comms (5 X posts / launch messaging angles), and one revision.',
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-white/6 bg-white/[0.03] backdrop-blur-sm p-6 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/12 border border-indigo-500/20">
                    {s.icon}
                  </div>
                  <span className="text-xs font-bold tracking-widest text-indigo-400">STEP {s.step}</span>
                </div>
              </div>
              <div className="mt-4 text-base font-semibold text-white">{s.title}</div>
              <div className="mt-1.5 text-sm text-white/40 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── WHY LAUNCHKIT VS ALTERNATIVES ─── */}
      <section className="mt-20 sm:mt-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Why LaunchKit instead of…</h2>
            <p className="mt-2 text-sm sm:text-base text-white/40">
              The £99 Launch Pack gives you agency-grade results without the agency price tag
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                name: 'Hiring an agency',
                cons: [
                  '£2,000–£10,000+ per project',
                  '2–4 week turnaround minimum',
                  'Meetings, revisions, scope creep',
                  'Overkill for indie launch',
                ],
                better: 'LaunchKit delivers in 48h for £99',
              },
              {
                name: 'Doing it yourself',
                cons: [
                  'Weeks of research and writing',
                  'Requires marketing expertise',
                  'Endless iterations and doubt',
                  'Time away from building',
                ],
                better: 'LaunchKit gives you paste-ready copy fast',
              },
              {
                name: 'Raw AI tools',
                cons: [
                  'Generic outputs without strategy',
                  'No positioning framework',
                  'You still have to edit heavily',
                  'No guidance on what matters',
                ],
                better: 'LaunchKit = AI + strategy + human curation',
              },
            ].map((alt) => (
              <div
                key={alt.name}
                className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 flex flex-col"
              >
                <h3 className="text-base font-bold text-white mb-3">{alt.name}</h3>
                <ul className="space-y-2 text-sm text-white/40 mb-4 flex-1">
                  {alt.cons.map((con, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-white/20 mt-0.5">—</span>
                      {con}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-300 font-medium">
                  ✓ {alt.better}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section className="mt-20 sm:mt-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">See it in action</h2>
            <p className="mt-2 text-sm sm:text-base text-white/40">
              Here&apos;s what a real Launch Pack looks like
            </p>
          </div>

          <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/15">
                <FileText className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">LightScout AI</h3>
                <p className="mt-0.5 text-sm text-white/40">AI-powered photography location finder</p>
                <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/5 p-4">
                  <p className="text-sm text-white/60">
                    <span className="font-semibold text-white/80">Delivered:</span> positioning snapshot, landing/listing copy direction, launch comms starter set (5 X posts / launch messaging angles), and conversion guidance.
                  </p>
                </div>
                <p className="mt-3 text-sm text-white/45">
                  This sample shows the exact framing of the £99 done-for-you pack.
                </p>
                <Link
                  href={SAMPLE_PACK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View full sample pack →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="mt-20 sm:mt-28 scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">What you get for £99</h2>
            <p className="mt-2 text-sm text-white/40">Done-for-you scope, delivered within 48 hours of intake.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Inclusions */}
            <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-base font-bold text-white">Launch Brief + Copy Pack</span>
                  <p className="mt-1 text-xs text-white/35">Paste-ready messaging for your launch</p>
                </div>
              </div>
              <p className="text-sm text-white/40 mb-5">Built for indie makers who need sharper positioning and copy to win first customers.</p>
              <ul className="space-y-2.5 text-sm text-white/60 mb-6">
                {PACK_INCLUDES.map((f) => (
                  <li key={f} className="flex gap-2.5 items-start">
                    <Check className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={SAMPLE_PACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-xl border border-indigo-500/30 px-6 py-3 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/8 hover:border-indigo-400/50 transition-all"
              >
                View LightScout sample
              </Link>
            </div>

            {/* Offer terms */}
            <div className="rounded-[17px] bg-gradient-to-b from-indigo-500/35 to-violet-500/15 p-[1px]">
              <div className="rounded-2xl bg-[oklch(0.12_0.01_270)] p-6 relative overflow-hidden h-full">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/8 blur-3xl rounded-full pointer-events-none" />

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">Founding batch offer</span>
                      <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-bold text-white">£99</span>
                    </div>
                    <p className="mt-1 text-xs text-white/35">One-time payment</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">£99</span>
                    <p className="text-xs text-white/35">one-time</p>
                  </div>
                </div>
                <p className="text-sm text-white/40 mb-5">Clear deliverables, clear deadline, no retainer.</p>
                <ul className="space-y-2.5 text-sm text-white/60 mb-6">
                  {PACK_TERMS.map((f) => (
                    <li key={f} className="flex gap-2.5 items-start">
                      <Check className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={STRIPE_LAUNCH_PACK_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-400 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-400/20 hover:shadow-[0_0_28px_rgba(99,102,241,0.45)] hover:scale-[1.01] transition-all"
                >
                  Pay £99 now
                </a>
                <Link
                  href={INTAKE_PAGE_URL}
                  className="mt-3 flex items-center justify-center rounded-xl border border-indigo-500/30 px-6 py-3 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/8 hover:border-indigo-400/50 transition-all"
                >
                  Already paid? Send intake
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="mt-20 sm:mt-28">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Questions?</h2>
            <p className="mt-2 text-sm sm:text-base text-white/40">
              Everything you need to know before you start
            </p>
          </div>

          <div className="rounded-2xl border border-white/6 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
            <Accordion type="single" collapsible>
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-0 px-6">
                  <AccordionTrigger className="text-sm font-semibold text-white/80 hover:text-white hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/45 leading-relaxed pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="mt-20 border-t border-white/5 pt-8 pb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-white">LaunchKit</div>
            <div className="mt-1 text-sm text-white/30">Done-for-you launch messaging packs (5 X posts / launch messaging angles) for indie makers.</div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6 text-sm">
            {[
              { href: STRIPE_LAUNCH_PACK_URL, label: 'Pay £99', external: true },
              { href: '/#pricing', label: 'Pricing' },
              { href: INTAKE_PAGE_URL, label: 'Intake' },
              { href: SAMPLE_PACK_URL, label: 'Sample pack' },
              { href: '/terms', label: 'Terms' },
              { href: '/privacy', label: 'Privacy' },
              { href: '/tiktok', label: 'TikTok Integration Terms' },
              { href: '/tiktok', label: 'TikTok Integration Privacy' },
            ].map(({ href, label, external }) => (
              external ? (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/30 transition-colors hover:text-white/70"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="text-white/30 transition-colors hover:text-white/70"
                >
                  {label}
                </Link>
              )
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-white/20">
          <span>© {new Date().getFullYear()} LaunchKit. All rights reserved.</span>
          <a href={`mailto:${INTAKE_EMAIL}`} className="hover:text-white/40 transition-colors">
            {INTAKE_EMAIL}
          </a>
        </div>
      </footer>
    </div>
  );
}
