'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const INTAKE_QUESTIONS = [
  {
    id: 'stage',
    question: 'Where is your product right now?',
    options: [
      'Pre-launch — building in private',
      'Just launched — first few weeks live',
      'Early traction — live 1-6 months',
      'Established — growing past 6 months',
    ],
  },
  {
    id: 'tone',
    question: 'What tone best fits your brand?',
    options: [
      'Bold & direct — confident, no fluff',
      'Warm & approachable — friendly, human',
      'Professional & credible — polished, trustworthy',
      'Playful & irreverent — witty, distinctive',
    ],
  },
  {
    id: 'audience',
    question: 'Who is your primary customer?',
    options: [
      'Solo founders / indie hackers',
      'Small businesses (1-20 people)',
      'Mid-market teams (20-500 people)',
      'Consumers / general public',
    ],
  },
  {
    id: 'channel',
    question: 'Where will you focus your marketing first?',
    options: [
      'Social media (X, LinkedIn, Instagram)',
      'Search / SEO / content marketing',
      'Paid ads (Meta, Google, X)',
      'Community / word-of-mouth / product-led',
    ],
  },
  {
    id: 'goal',
    question: 'What is your primary goal right now?',
    options: [
      'Get my first 100 customers',
      'Drive traffic to my landing page',
      'Build a waitlist before launch',
      'Scale past my current growth plateau',
    ],
  },
] as const;

type IntakeAnswers = Record<string, string>;

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'submitting'>('form');
  const [productUrl, setProductUrl] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<'basic' | 'pro'>('basic');
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [extra, setExtra] = useState('');
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState(''); // spam trap

  const allAnswered = INTAKE_QUESTIONS.every((q) => answers[q.id]);
  const canSubmit = productUrl.trim() && email.trim() && allAnswered;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Please answer all questions before continuing.');
      return;
    }

    setStep('submitting');

    try {
      const res = await fetch('/api/pdf/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          productUrl: productUrl.trim(),
          tier,
          intake: { ...answers, extra: extra.trim() || undefined },
          honeypot,
        }),
      });

      const data = await res.json() as { orderId?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setStep('form');
        return;
      }

      // Cache email so the delivery page can pre-fill the ownership verification
      sessionStorage.setItem(`pdf-email-${data.orderId}`, email.trim().toLowerCase());

      router.push(`/checkout?orderId=${data.orderId}`);
    } catch {
      setError('Network error. Please try again.');
      setStep('form');
    }
  }

  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-slate-700 dark:text-slate-300">
            5 questions · 2 minutes
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Tell us about your product
          </h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
            Answer 5 quick questions and we&apos;ll generate a custom marketing plan PDF — ready to download in minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {/* Hidden honeypot — bots fill this */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="absolute -left-[9999px] opacity-0"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              aria-hidden="true"
            />

            {/* Product URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Your product URL <span className="text-indigo-500">*</span>
              </label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-slate-500">We&apos;ll analyse this page to personalise your plan</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Your email <span className="text-indigo-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-slate-500">Your download link will be tied to this email</p>
            </div>

            {/* 5 intake questions */}
            {INTAKE_QUESTIONS.map((q, qi) => (
              <div key={q.id}>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  {qi + 1}. {q.question} <span className="text-indigo-500">*</span>
                </p>
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <label
                        key={opt}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={selected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className="sr-only"
                        />
                        <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-indigo-500' : 'border-slate-300'}`}>
                          {selected && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                        </span>
                        {opt}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Optional extra context */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Anything else we should know? <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value.slice(0, 280))}
                placeholder="e.g. We&apos;re launching on Product Hunt next week, we&apos;re in the fintech space..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-none"
              />
              <p className="mt-1 text-xs text-slate-500">{extra.length}/280 characters</p>
            </div>

            {/* Tier selector */}
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Choose your plan</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['basic', 'pro'] as const).map((t) => (
                  <label
                    key={t}
                    className={`cursor-pointer rounded-2xl border-2 p-4 transition-colors ${
                      tier === t
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'border-slate-200 bg-slate-50 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value={t}
                      checked={tier === t}
                      onChange={() => setTier(t)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">{t}</span>
                      <span className="text-sm font-bold text-indigo-600">{t === 'basic' ? '£39.99' : '£99'}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {t === 'basic'
                        ? '9-11 page plan: positioning, copy & social posts'
                        : '19-25 page plan: everything + emails, ads & 30-day calendar'}
                    </p>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!canSubmit || step === 'submitting'}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
            >
              {step === 'submitting' ? 'Creating your order…' : 'Continue to payment →'}
            </Button>

            <p className="text-center text-xs text-slate-400">
              No account needed · Instant PDF delivery · 100% automated
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
