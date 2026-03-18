'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TIERS, normalizeTierId, type TierId } from '@/lib/pricing';

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

const STORAGE_KEY = 'intake-form-draft';

interface FormDraft {
  productUrl: string;
  email: string;
  selectedTier: TierId | null;
  answers: IntakeAnswers;
  extra: string;
}

function loadDraft(): Partial<FormDraft> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function StartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft] = useState(loadDraft);
  const [step, setStep] = useState<'form' | 'submitting'>('form');
  const [productUrl, setProductUrl] = useState(draft.productUrl ?? '');
  const [email, setEmail] = useState(draft.email ?? '');
  const [selectedTier, setSelectedTier] = useState<TierId | null>(draft.selectedTier ?? null);
  const [answers, setAnswers] = useState<IntakeAnswers>(draft.answers ?? {});
  const [extra, setExtra] = useState(draft.extra ?? '');
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState(''); // spam trap

  // Persist to sessionStorage on changes
  const saveDraft = useCallback(() => {
    try {
      const draft: FormDraft = { productUrl, email, selectedTier, answers, extra };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch { /* quota exceeded — non-critical */ }
  }, [productUrl, email, selectedTier, answers, extra]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  const tier: TierId = selectedTier ?? normalizeTierId(searchParams.get('tier'));
  const allAnswered = INTAKE_QUESTIONS.every((q) => answers[q.id]);
  const canSubmit = productUrl.trim() && email.trim() && allAnswered;

  // Count completed fields for progress
  const totalFields = 2 + INTAKE_QUESTIONS.length; // URL + email + 5 questions
  const completedFields = (productUrl.trim() ? 1 : 0) + (email.trim() ? 1 : 0) + INTAKE_QUESTIONS.filter((q) => answers[q.id]).length;
  const progress = Math.round((completedFields / totalFields) * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Please answer all questions before continuing.');
      return;
    }

    setStep('submitting');

    try {
      // Map 'entry' back to 'basic' for API compatibility
      const apiTier = tier === 'entry' ? 'basic' : tier;

      const res = await fetch('/api/pdf/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          productUrl: productUrl.trim(),
          tier: apiTier,
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
      // Clear intake draft — form submitted successfully
      sessionStorage.removeItem(STORAGE_KEY);

      router.push(`/checkout?orderId=${data.orderId}`);
    } catch {
      setError('Network error. Please try again.');
      setStep('form');
    }
  }

  const tierData = TIERS[tier];

  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl">
          {/* Tier selection first */}
          <div className="mb-8">
            <p className="text-sm font-semibold text-foreground mb-3">Your plan</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['entry', 'pro'] as const).map((t) => {
                const td = TIERS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTier(t)}
                    className={`text-left cursor-pointer rounded-2xl border-2 p-4 transition-colors ${
                      tier === t
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'border-border bg-muted hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{td.name}</span>
                      <span className="text-sm font-bold text-indigo-500">{td.price}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{td.shortDescription}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-muted-foreground">
            5 questions · 2 minutes
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tell us about your product
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Answer 5 quick questions and we&apos;ll generate a custom {tierData.name} marketing pack PDF — ready to download in minutes.
          </p>

          {/* Progress indicator */}
          <div className="mt-6 rounded-xl border border-border bg-muted p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {completedFields === totalFields ? 'All done — ready to submit!' : `${completedFields} of ${totalFields} fields completed`}
              </span>
              <span className="text-sm font-semibold text-indigo-500">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

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
              <label className="block text-sm font-semibold text-foreground mb-2">
                Your product URL <span className="text-indigo-500">*</span>
              </label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                required
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="mt-1 text-xs text-muted-foreground">We&apos;ll analyse this page to personalise your plan</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Your email <span className="text-indigo-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="mt-1 text-xs text-muted-foreground">Your download link will be tied to this email</p>
            </div>

            {/* 5 intake questions */}
            {INTAKE_QUESTIONS.map((q, qi) => (
              <div key={q.id}>
                <p className="text-sm font-semibold text-foreground mb-3">
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
                            : 'border-border bg-muted text-muted-foreground hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20'
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
                        <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-indigo-500' : 'border-muted-foreground/30'}`}>
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
              <label className="block text-sm font-semibold text-foreground mb-2">
                Anything else we should know? <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value.slice(0, 280))}
                placeholder="e.g. We're launching on Product Hunt next week, we're in the fintech space..."
                rows={3}
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">{extra.length}/280 characters</p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!canSubmit || step === 'submitting'}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
            >
              {step === 'submitting' ? 'Creating your order…' : `Continue to payment — ${tierData.price} →`}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              No account needed · Instant PDF delivery · 100% automated
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground animate-pulse">Loading…</p>}>
      <StartPageContent />
    </Suspense>
  );
}
