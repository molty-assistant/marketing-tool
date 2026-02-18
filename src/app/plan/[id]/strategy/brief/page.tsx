'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { MarketingPlan } from '@/lib/types';
import { PlanDetailSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import ExportBundleButton from '@/components/ExportBundleButton';
import { useToast } from '@/components/Toast';

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="text-indigo-400 hover:text-indigo-300 underline"
    >
      {children}
    </a>
  ),
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-sm sm:text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1"
    >
      {copied ? '✓ Copied' : `📋 ${label || 'Copy'}`}
    </button>
  );
}

export default function StrategyBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { error: toastError } = useToast();

  const [pdfExporting, setPdfExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json() as Promise<MarketingPlan>;
      })
      .then((data) => {
        setPlan(data);
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load plan');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        return;
      } catch {
        // fall through
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const appContext = useMemo(() => {
    if (!plan) return '';
    return `${plan.config.app_name} — ${plan.config.one_liner}. Category: ${plan.config.category}. Audience: ${plan.config.target_audience}. Pricing: ${plan.config.pricing}.`;
  }, [plan]);

  if (loading) return <PlanDetailSkeleton />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={error} onRetry={load} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← All Plans
        </Link>
      </div>
    );
  }

  const handleExportMarkdown = () => {
    const blob = new Blob([plan.generated], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-brief-${plan.config.app_name.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (pdfExporting) return;
    const el = pdfRef.current;
    if (!el) return;

    setPdfExporting(true);
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = (mod as unknown as { default: any }).default || (mod as any);

      const safeName = plan?.config?.app_name
        ? plan.config.app_name.toLowerCase().replace(/\s+/g, '-')
        : 'plan';

      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `marketing-brief-${safeName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(el)
        .save();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to export PDF';
      toastError(msg);
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/plan/${id}`} className="text-xs text-slate-500 hover:text-slate-300">
          ← Overview
        </Link>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">
          All Plans
        </Link>
      </div>

      <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {(plan.scraped?.icon || plan.config?.icon) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={plan.scraped?.icon || plan.config?.icon}
              alt=""
              className="w-14 h-14 rounded-2xl"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-white break-words">{plan.config.app_name}</h1>
            <p className="text-sm text-slate-400 mt-1 break-words">
              {plan.config.one_liner || plan.scraped?.description}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <ExportBundleButton planId={id} appName={plan.config.app_name} />
              <button
                onClick={handleExportMarkdown}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                📥 Export .md
              </button>
              <button
                onClick={handleExportPdf}
                disabled={pdfExporting}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {pdfExporting ? 'Preparing…' : '📄 Export PDF'}
              </button>
              <CopyButton text={plan.generated} label="Copy brief" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-white/[0.06] rounded-2xl p-6">
        <div className="markdown-content text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {plan.generated}
          </ReactMarkdown>
        </div>
      </div>

      {/* Hidden PDF export container */}
      <div
        ref={pdfRef}
        className="fixed left-[-9999px] top-0 w-[800px] bg-white text-slate-900 p-10"
      >
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{plan.config.app_name}</h1>
            <p className="text-sm text-slate-600 mt-1">{plan.config.one_liner}</p>
            <p className="text-xs text-slate-500 mt-2">
              Generated {new Date(plan.createdAt).toLocaleDateString()}
            </p>
          </div>
          {(plan.scraped?.icon || plan.config?.icon) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={plan.scraped?.icon || plan.config?.icon}
              alt=""
              className="w-12 h-12 rounded-xl"
            />
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Brief</h2>
          <div className="text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {plan.generated}
            </ReactMarkdown>
          </div>
        </div>

        {/* Include app context as a footer note (useful for exports) */}
        <div className="text-xs text-slate-500 border-t pt-4">{appContext}</div>
      </div>
    </div>
  );
}
