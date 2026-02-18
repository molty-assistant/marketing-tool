'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import PlanNav from '@/components/PlanNav';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';

type SequenceType = 'welcome' | 'launch' | 'nurture';

interface EmailItem {
  number: number;
  purpose: string;
  subjectLine: string;
  previewText: string;
  body: string;
  cta?: { text: string; action: string };
  sendDelay?: string;
}

interface GenerateEmailsResponse {
  sequence: {
    type: SequenceType;
    description: string;
    emails: EmailItem[];
  };
  metadata?: {
    model?: string;
    tokens?: number | null;
    sequenceType?: string;
  };
}

const SEQUENCE_OPTIONS: { value: SequenceType; label: string; help: string }[] = [
  { value: 'welcome', label: 'Welcome', help: 'Onboarding + trust building + offer.' },
  { value: 'launch', label: 'Launch', help: 'Announcement + reasons to care + urgency.' },
  { value: 'nurture', label: 'Nurture', help: 'Ongoing value + relationship building.' },
];

export default function EmailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');

  const [sequenceType, setSequenceType] = useState<SequenceType>('welcome');
  const [emailCount, setEmailCount] = useState(7);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<GenerateEmailsResponse | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({ 1: true });

  const storageKey = `emails-${id}`;

  const loadPlan = () => {
    setPlanLoading(true);
    setPlanError('');
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        setPlanLoading(false);
        return;
      } catch {
        /* fall through */
      }
    }

    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((p) => {
        setPlan(p);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(p));
      })
      .catch((err) => {
        setPlanError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setPlanLoading(false));
  };

  useEffect(() => {
    loadPlan();
  }, [id]);

  // Restore last generated
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        sequenceType?: SequenceType;
        emailCount?: number;
        data?: GenerateEmailsResponse;
      };
      if (parsed.sequenceType) setSequenceType(parsed.sequenceType);
      if (typeof parsed.emailCount === 'number') setEmailCount(parsed.emailCount);
      if (parsed.data) setData(parsed.data);
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [id]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          sequenceType,
          emailCount,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to generate emails');

      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ sequenceType, emailCount, data: json })
      );
      setData(json);
      setIsCached(false);

      const firstNum = (json?.sequence?.emails?.[0]?.number as number) || 1;
      setOpen({ [firstNum]: true });
      toastSuccess('Email sequence generated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate emails';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }

  if (planError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  const emails = data?.sequence?.emails || [];

  return (
    <div className="max-w-5xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      <div className="mb-6 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Generate a welcome email sequence, launch announcement series, or nurture drip campaign — tailored to your app&apos;s tone and audience.
      </div>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">✉️ Email Sequence</h1>
          <p className="text-slate-400">{plan.config.app_name} — Generate a direct-response sequence</p>
        </div>
        <div className="flex items-center gap-3">
          {data && isCached && (
            <span className="text-xs text-slate-500">Cached · ↻ Generate to refresh</span>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Generating…' : '✨ Generate'}
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold text-white mb-2">Sequence type</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SEQUENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSequenceType(opt.value)}
                  className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                    sequenceType === opt.value
                      ? 'bg-indigo-600/20 border-indigo-500/50'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40'
                  }`}
                >
                  <div className="text-sm text-white">{opt.label}</div>
                  <div className="text-xs text-slate-500">{opt.help}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white mb-2">Email count</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={20}
                value={emailCount}
                onChange={(e) => setEmailCount(Math.max(1, Math.min(20, Number(e.target.value) || 7)))}
                className="w-28 bg-slate-950/40 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <div className="text-xs text-slate-500">Default is 7 (welcome progression).</div>
            </div>
          </div>
        </div>

        {data?.metadata?.tokens != null && (
          <div className="mt-4 text-xs text-slate-500">
            Model: {data.metadata.model || 'gemini'} · Tokens: {String(data.metadata.tokens)}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!data && (
        <div className="text-slate-500 text-sm">Click “Generate” to create your sequence.</div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="bg-slate-900/20 border border-slate-700/30 rounded-2xl p-4">
            <div className="text-sm font-semibold text-white">{data.sequence.type.toUpperCase()} sequence</div>
            <div className="text-xs text-slate-500 mt-1">{data.sequence.description}</div>
          </div>

          {emails.map((email) => {
            const isOpen = !!open[email.number];
            const ctaText = email.cta?.text || '';
            const ctaAction = email.cta?.action || '';

            return (
              <div
                key={email.number}
                className="rounded-2xl overflow-hidden border bg-slate-800/30 border-slate-700/60"
              >
                <button
                  onClick={() => setOpen((prev) => ({ ...prev, [email.number]: !prev[email.number] }))}
                  className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      #{email.number} · {email.subjectLine}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {email.purpose}{email.sendDelay ? ` · ${email.sendDelay}` : ''}
                    </div>
                  </div>
                  <div className="text-slate-400 text-sm">{isOpen ? '▾' : '▸'}</div>
                </button>

                {isOpen && (
                  <div className="p-4 border-t border-slate-700/40 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500">Subject</div>
                        <div className="text-sm text-slate-100 mt-1">{email.subjectLine}</div>
                      </div>
                      <div className="bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500">Preview</div>
                        <div className="text-sm text-slate-100 mt-1">{email.previewText}</div>
                      </div>
                    </div>

                    <div className="bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                      <div className="text-xs text-slate-500 mb-2">Body (Markdown)</div>
                      <textarea
                        value={email.body || ''}
                        readOnly
                        className="w-full min-h-[220px] bg-transparent text-sm text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500">CTA text</div>
                        <div className="text-sm text-slate-100 mt-1">{ctaText || '—'}</div>
                      </div>
                      <div className="md:col-span-2 bg-slate-950/30 border border-slate-700/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500">CTA action</div>
                        <div className="text-sm text-slate-100 mt-1">{ctaAction || '—'}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={async () => {
                          const text = `Subject: ${email.subjectLine}\nPreview: ${email.previewText}\nSend: ${email.sendDelay || ''}\nPurpose: ${email.purpose}\n\n${email.body}\n\nCTA: ${ctaText} (${ctaAction})`;
                          await navigator.clipboard.writeText(text);
                          toastSuccess(`Copied email #${email.number}`);
                        }}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Sequences are drafts — review for accuracy and compliance before sending.
      </div>
    </div>
  );
}
