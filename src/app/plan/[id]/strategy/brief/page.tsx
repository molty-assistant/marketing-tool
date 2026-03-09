'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { PlanDetailSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import ExportBundleButton from '@/components/ExportBundleButton';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';
import { Button } from '@/components/ui/button';

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
    <Button
      onClick={handleCopy}
      variant="secondary"
      size="sm"
      className="text-sm sm:text-xs px-3 py-2 sm:py-1.5 rounded-lg flex items-center gap-1"
    >
      {copied ? '✓ Copied' : `📋 ${label || 'Copy'}`}
    </Button>
  );
}

export default function StrategyBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { plan, loading, error, reload: loadPlan } = usePlan(id);

  const { error: toastError } = useToast();

  const [pdfExporting, setPdfExporting] = useState(false);


  if (loading) return <PlanDetailSkeleton />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={error} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-muted-foreground mb-4">Plan not found</div>
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

    setPdfExporting(true);
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: id }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || 'Failed to export PDF');
      }

      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const match = /filename=\"?([^\";]+)\"?/i.exec(cd);
      const safeName = plan?.config?.app_name
        ? plan.config.app_name.toLowerCase().replace(/\s+/g, '-')
        : 'plan';
      const filename = match?.[1] || `marketing-brief-${safeName}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
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
        <Link href={`/plan/${id}`} className="text-xs text-muted-foreground hover:text-foreground">
          ← Overview
        </Link>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
          All Plans
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
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
            <p className="text-sm text-muted-foreground mt-1 break-words">
              {plan.config.one_liner || plan.scraped?.description}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <ExportBundleButton planId={id} appName={plan.config.app_name} />
              <Button
                onClick={handleExportMarkdown}
                variant="secondary"
                className="text-sm px-4 py-2 rounded-lg"
              >
                📥 Export .md
              </Button>
              <Button
                onClick={handleExportPdf}
                disabled={pdfExporting}
                variant="secondary"
                className="text-sm px-4 py-2 rounded-lg"
              >
                {pdfExporting ? 'Preparing…' : '📄 Export PDF'}
              </Button>
              <CopyButton text={plan.generated} label="Copy brief" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="markdown-content text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {plan.generated}
          </ReactMarkdown>
        </div>
      </div>

    </div>
  );
}
