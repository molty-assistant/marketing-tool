'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type StepStatus = 'pending' | 'running' | 'done' | 'failed';

interface PipelineStep {
  id: string;
  label: string;
  status: StepStatus;
  error?: string;
}

interface OrderStatus {
  id: string;
  status: 'draft' | 'checkout_created' | 'paid' | 'generating' | 'ready' | 'failed';
  tier: 'basic' | 'pro';
  productUrl: string;
  generation: {
    runId: string;
    status: string;
    currentStep: string | null;
    steps: PipelineStep[];
    lastError: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Awaiting payment',
  checkout_created: 'Awaiting payment',
  paid: 'Payment confirmed — starting…',
  generating: 'Generating your plan…',
  ready: 'Your plan is ready!',
  failed: 'Generation failed',
};

function StepIndicator({ step }: { step: PipelineStep }) {
  const statusStyles: Record<StepStatus, string> = {
    pending: 'bg-slate-200 text-slate-400 dark:bg-slate-700',
    running: 'bg-indigo-500 text-white animate-pulse',
    done: 'bg-emerald-500 text-white',
    failed: 'bg-red-500 text-white',
  };

  const iconMap: Record<StepStatus, string> = {
    pending: '○',
    running: '◐',
    done: '✓',
    failed: '✗',
  };

  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${statusStyles[step.status]}`}>
        {iconMap[step.status]}
      </span>
      <span className={`text-sm ${step.status === 'pending' ? 'text-slate-400' : step.status === 'failed' ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
        {step.label}
      </span>
    </div>
  );
}

export default function StatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function poll() {
    try {
      const res = await fetch(`/api/pdf/orders/${orderId}`);
      if (!res.ok) { setError('Could not load order status.'); return; }
      const data = await res.json() as OrderStatus;
      setOrderStatus(data);

      if (data.status === 'ready') {
        // Stop polling and redirect to delivery
        if (intervalRef.current) clearInterval(intervalRef.current);
        router.push(`/delivery/${orderId}`);
      } else if (data.status === 'failed') {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch {
      setError('Network error while checking status.');
    }
  }

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const steps = orderStatus?.generation?.steps ?? [];
  const isFailed = orderStatus?.status === 'failed';

  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-lg text-center">
          <div className="text-4xl mb-4">
            {isFailed ? '⚠️' : orderStatus?.status === 'ready' ? '🎉' : '⚙️'}
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {orderStatus ? STATUS_LABELS[orderStatus.status] : 'Checking your order…'}
          </h1>

          {orderStatus && !isFailed && (
            <p className="text-sm text-slate-500 mb-8">
              {orderStatus.tier === 'basic' ? 'Basic' : 'Pro'} plan for{' '}
              <span className="font-medium">{orderStatus.productUrl}</span>
            </p>
          )}

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {steps.length > 0 && (
            <div className="text-left space-y-3 bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 mb-6">
              {steps.map((step) => (
                <StepIndicator key={step.id} step={step} />
              ))}
            </div>
          )}

          {!isFailed && steps.length === 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 mb-6">
              <div className="flex gap-2 justify-center">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-xs text-slate-400 mt-3">Starting up…</p>
            </div>
          )}

          {isFailed && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6">
              <p className="text-sm text-red-700 dark:text-red-300 mb-2 font-semibold">Generation failed</p>
              <p className="text-xs text-red-500 mb-4">
                {orderStatus?.generation?.lastError ?? 'An unexpected error occurred.'}
              </p>
              <p className="text-xs text-slate-500">
                Please contact us and we&apos;ll issue a full refund.
              </p>
            </div>
          )}

          {!isFailed && (
            <p className="text-xs text-slate-400">
              This page refreshes automatically. Don&apos;t close it — your PDF will be ready in 1-3 minutes.
            </p>
          )}

          <p className="mt-6 text-xs text-slate-400">
            <Link href="/my-pdfs" className="underline">Find past orders</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
