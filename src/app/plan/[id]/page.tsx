'use client';

import {
  useState,
  useEffect,
  use,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MarketingPlan } from '@/lib/types';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EnhanceButton from '@/components/EnhanceButton';
import VariantPicker from '@/components/VariantPicker';
import PlanNav from '@/components/PlanNav';
import { PlanDetailSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';
import ExportBundleButton from '@/components/ExportBundleButton';
import GenerateAllButton from '@/components/GenerateAllButton';

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

// Parse Stage 4 content into individual templates for per-template copy
function parseTemplates(assetsContent: string): { heading: string; content: string }[] {
  const templates: { heading: string; content: string }[] = [];
  const lines = assetsContent.split('\n');
  let currentHeading = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const h3Match = line.match(/^### (.+)$/);
    if (h3Match) {
      if (currentHeading && currentLines.length > 0) {
        templates.push({
          heading: currentHeading,
          content: currentLines.join('\n').trim(),
        });
      }
      currentHeading = h3Match[1];
      currentLines = [];
    } else if (currentHeading) {
      currentLines.push(line);
    }
  }
  // Push last template
  if (currentHeading && currentLines.length > 0) {
    templates.push({
      heading: currentHeading,
      content: currentLines.join('\n').trim(),
    });
  }

  return templates;
}

function TemplateCard({
  heading,
  content,
  appContext,
}: {
  heading: string;
  content: string;
  appContext: string;
}) {
  const [open, setOpen] = useState(false);
  const [displayContent, setDisplayContent] = useState(content);
  const [isEnhanced, setIsEnhanced] = useState(false);

  const handleTextChange = useCallback(
    (newText: string) => {
      setDisplayContent(newText);
      setIsEnhanced(newText !== content);
    },
    [content]
  );

  // Strip markdown bold/links for plain-text copy
  const plainText = displayContent
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  return (
    <div
      className={`rounded-xl overflow-hidden transition-colors ${
        isEnhanced
          ? 'bg-indigo-950/30 border border-indigo-500/30'
          : 'bg-slate-900/50 border border-slate-700/30'
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-800/30 transition-colors text-left"
      >
        <h4 className="text-sm font-semibold text-indigo-400 flex-1 min-w-0 break-words">
          {heading}
          {isEnhanced && (
            <span className="ml-2 text-xs font-normal text-indigo-300/70">
              ✨ AI enhanced
            </span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          <CopyButton text={plainText} label="Copy" />
          <span className="text-slate-500 text-sm">{open ? '−' : '+'}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-700/30">
          {/* Enhance controls */}
          <div className="mt-3 mb-3 space-y-3">
            <EnhanceButton
              text={content}
              appContext={appContext}
              onTextChange={handleTextChange}
            />

            <VariantPicker
              text={displayContent}
              appContext={appContext}
              onPick={handleTextChange}
            />
          </div>
          <div className="markdown-content text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function StageSection({
  title,
  content,
  defaultOpen = false,
  isAssetsStage = false,
  appContext = '',
}: {
  title: string;
  content: string;
  defaultOpen?: boolean;
  isAssetsStage?: boolean;
  appContext?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const templates = isAssetsStage ? parseTemplates(content) : [];

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-5 hover:bg-slate-800/50 transition-colors text-left"
      >
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-3">
          <CopyButton text={content} label="Copy section" />
          <span className="text-slate-500 text-xl">{open ? '−' : '+'}</span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-700/50">
          {isAssetsStage && templates.length > 0 ? (
            <div className="mt-4 space-y-3">
              {/* Stage 4 header line */}
              <div className="markdown-content mb-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {content
                    .split('\n')
                    .filter(
                      (l) =>
                        !l.startsWith('### ') &&
                        !templates.some((t) => t.content.includes(l.trim()) && l.trim())
                    )
                    .slice(0, 2)
                    .join('\n')}
                </ReactMarkdown>
              </div>
              {templates.map((t, i) => (
                <TemplateCard
                  key={i}
                  heading={t.heading}
                  content={t.content}
                  appContext={appContext}
                />
              ))}
            </div>
          ) : (
            <div className="markdown-content mt-4">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showUnshareConfirm, setShowUnshareConfirm] = useState(false);
  const [packComplete, setPackComplete] = useState(false);

  useEffect(() => {
    // Try sessionStorage first (just generated)
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try {
        setPlan(JSON.parse(stored));
        return;
      } catch { /* fall through to DB */ }
    }

    // Fall back to DB
    loadFromDb();
  }, [id]);

  const loadFromDb = () => {
    setLoadingDb(true);
    setFetchError('');
    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((data) => {
        setPlan(data);
        if (data.shareToken) {
          setShareToken(data.shareToken);
          setShareUrl(`${window.location.origin}/shared/${data.shareToken}`);
        }
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load plan');
      })
      .finally(() => setLoadingDb(false));
  };

  if (loadingDb) {
    return <PlanDetailSkeleton />;
  }

  if (fetchError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={fetchError} onRetry={loadFromDb} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <p className="text-sm text-slate-500 mb-4">This plan may have been deleted or doesn&apos;t exist.</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
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

  const handleExportPdf = () => {
    // Open all collapsed sections before printing
    const details = document.querySelectorAll('[data-print-expand]');
    details.forEach((el) => el.setAttribute('data-print-open', 'true'));
    window.print();
    // Clean up after print dialog closes
    setTimeout(() => {
      details.forEach((el) => el.removeAttribute('data-print-open'));
    }, 500);
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/plans/${id}/share`, { method: 'POST' });
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareToken(data.token);
      setShareUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = async () => {
    await fetch(`/api/plans/${id}/share`, { method: 'DELETE' });
    setShareToken(null);
    setShareUrl(null);
    setShowUnshareConfirm(false);
  };

  const handleCopyShareUrl = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const stageLabels = [
    { key: 'research' as const, title: '🔍 Stage 1: Research', isAssets: false },
    { key: 'foundation' as const, title: '🏗️ Stage 2: Foundation', isAssets: false },
    { key: 'structure' as const, title: '🧱 Stage 3: Structure', isAssets: false },
    { key: 'assets' as const, title: '✍️ Stage 4: Copy Templates', isAssets: true },
    { key: 'distribution' as const, title: '📡 Stage 5: Distribution', isAssets: false },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <PlanNav planId={id} appName={plan.config.app_name} />

      <div className="mb-6 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
        Your complete AI-generated marketing brief — explore the tabs above to create ad copy, translate listings, distribute content across platforms, and build your full marketing pack.
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-4 min-w-0">
            {plan.config.icon && (
              <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white break-words">{plan.config.app_name}</h1>
              <p className="text-slate-400 break-words">{plan.config.one_liner}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportBundleButton planId={id} appName={plan.config.app_name} />
          <button
            onClick={handleExportMarkdown}
            className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg transition-colors"
          >
            📥 Export .md
          </button>
          <button
            onClick={handleExportPdf}
            className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg transition-colors"
          >
            📄 Export PDF
          </button>
          {!shareToken ? (
            <button
              onClick={handleShare}
              disabled={shareLoading}
              className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {shareLoading ? '...' : shareCopied ? '✓ Link copied!' : '🔗 Share'}
            </button>
          ) : showUnshareConfirm ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto bg-red-950/30 border border-red-700/50 rounded-xl px-4 py-2.5">
              <span className="text-sm text-red-200">Are you sure? The shared link will stop working.</span>
              <div className="flex gap-2">
                <button
                  onClick={handleUnshare}
                  className="bg-red-700 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Unshare
                </button>
                <button
                  onClick={() => setShowUnshareConfirm(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-1 w-full sm:w-auto">
              <button
                onClick={handleCopyShareUrl}
                className="w-full sm:w-auto bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg sm:rounded-l-lg transition-colors"
              >
                {shareCopied ? '✓ Copied!' : '🔗 Copy link'}
              </button>
              <button
                onClick={() => setShowUnshareConfirm(true)}
                className="w-full sm:w-auto bg-red-800 hover:bg-red-700 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg sm:rounded-r-lg transition-colors"
                title="Unshare"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Everything */}
      <div className="mb-6 flex flex-col sm:flex-row items-start gap-4">
        <GenerateAllButton
          planId={id}
          onComplete={() => setPackComplete(true)}
        />
      </div>

      {packComplete && (
        <div className="mb-6 bg-emerald-950/30 border border-emerald-700/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-emerald-300 font-semibold text-sm">🎉 Marketing pack complete!</div>
            <div className="text-slate-400 text-xs mt-1">All content has been generated. Download the full pack below.</div>
          </div>
          <ExportBundleButton planId={id} appName={plan.config.app_name} />
        </div>
      )}

      {/* Config summary */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap gap-3">
          <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
            {plan.config.app_type}
          </span>
          <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
            {plan.config.category}
          </span>
          <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
            {plan.config.pricing}
          </span>
          {plan.config.distribution_channels.map((ch) => (
            <span key={ch} className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* Copy full plan */}
      <div className="mb-6 flex flex-wrap gap-2">
        <CopyButton text={plan.generated} label="Copy full plan" />
      </div>

      {/* Stages */}
      {stageLabels.map((stage) => (
        <StageSection
          key={stage.key}
          title={stage.title}
          content={plan.stages[stage.key]}
          defaultOpen={true}
          isAssetsStage={stage.isAssets}
          appContext={`${plan.config.app_name} — ${plan.config.one_liner}. Category: ${plan.config.category}. Audience: ${plan.config.target_audience}. Pricing: ${plan.config.pricing}.`}
        />
      ))}

      {/* What's next — recommended workflow */}
      <div className="mt-10 mb-4 bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">🗺️ What&apos;s next? Recommended workflow</h2>
        <ol className="space-y-3">
          {[
            { step: 1, href: 'foundation', emoji: '🧱', label: 'Foundation', desc: 'Set your brand voice and positioning angles — the strategic base for everything else.' },
            { step: 2, href: 'draft', emoji: '📝', label: 'Draft', desc: 'Generate polished App Store copy and landing page hero text in multiple tones.' },
            { step: 3, href: 'variants', emoji: '🏆', label: 'Variants', desc: 'Create and score multiple headlines side-by-side to find your strongest hook.' },
            { step: 4, href: 'translate', emoji: '🌍', label: 'Translate', desc: 'Translate your copy into 10 languages for global store listings.' },
            { step: 5, href: 'distribute', emoji: '📣', label: 'Distribute', desc: 'Turn one core piece into platform-native posts for every channel at once.' },
            { step: 6, href: 'emails', emoji: '✉️', label: 'Emails', desc: 'Generate a welcome or launch email sequence for new users.' },
            { step: 7, href: 'calendar', emoji: '📅', label: 'Calendar', desc: 'Plan your posting schedule for the next 4 weeks across all platforms.' },
            { step: 8, href: 'keywords', emoji: '🔑', label: 'Keywords', desc: 'Find high-value ASO keywords to boost your store ranking.' },
          ].map(({ step, href, emoji, label, desc }) => (
            <li key={href}>
              <a
                href={`/plan/${id}/${href}`}
                className="flex items-start gap-3 group hover:bg-slate-700/30 rounded-xl px-3 py-2 -mx-3 transition-colors"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center mt-0.5">
                  {step}
                </span>
                <div>
                  <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                    {emoji} {label}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <span className="ml-auto text-slate-600 group-hover:text-slate-400 text-sm transition-colors flex-shrink-0 mt-0.5">→</span>
              </a>
            </li>
          ))}
        </ol>
      </div>

      {/* Method credit */}
      <div className="text-center text-sm text-slate-600 mt-8 mb-4">
        Generated using the Vibe Marketing Playbook 5-Stage Sequence
      </div>
    </div>
  );
}
