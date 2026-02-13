'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingPlan } from '@/lib/types';
import EnhanceButton from '@/components/EnhanceButton';

// Simple markdown to HTML converter for our structured content
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300 underline">$1</a>')
    // Blockquotes
    .replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Checkboxes
    .replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled /> $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled /> $1</li>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Table rows
    .replace(/^\|(.+)\|$/gm, (_, content) => {
      const cells = content.split('|').map((c: string) => c.trim());
      if (cells.every((c: string) => /^[-:]+$/.test(c))) return '';
      const cellHtml = cells.map((c: string) => `<td>${c}</td>`).join('');
      return `<tr>${cellHtml}</tr>`;
    })
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    // Paragraphs (lines that aren't tags)
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // Wrap consecutive li elements
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    // Wrap consecutive tr elements
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')
    // Clean empty lines
    .replace(/\n{3,}/g, '\n\n');
}

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
      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
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
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors text-left"
      >
        <h4 className="text-sm font-semibold text-indigo-400">
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
          <div className="mt-3 mb-3">
            <EnhanceButton
              text={content}
              appContext={appContext}
              onTextChange={handleTextChange}
            />
          </div>
          <div
            className="markdown-content text-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
          />
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
        className="w-full flex items-center justify-between p-5 hover:bg-slate-800/50 transition-colors text-left"
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
              <div
                className="markdown-content mb-2"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(
                    content.split('\n').filter((l) => !l.startsWith('### ') && !templates.some((t) => t.content.includes(l.trim()) && l.trim())).slice(0, 2).join('\n')
                  ),
                }}
              />
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
            <div
              className="markdown-content mt-4"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
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
    setLoadingDb(true);
    fetch(`/api/plans/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setPlan(data);
        // Cache in sessionStorage for subsequent navigations
        sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
      })
      .catch(() => {
        // Plan not found anywhere
      })
      .finally(() => setLoadingDb(false));
  }, [id]);

  if (loadingDb) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="inline-flex items-center gap-3 text-lg text-slate-300">
          <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading plan...
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <p className="text-sm text-slate-500 mb-4">This plan may have been deleted or doesn&apos;t exist.</p>
        <a href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </a>
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

  const stageLabels = [
    { key: 'research' as const, title: '🔍 Stage 1: Research', isAssets: false },
    { key: 'foundation' as const, title: '🏗️ Stage 2: Foundation', isAssets: false },
    { key: 'structure' as const, title: '🧱 Stage 3: Structure', isAssets: false },
    { key: 'assets' as const, title: '✍️ Stage 4: Copy Templates', isAssets: true },
    { key: 'distribution' as const, title: '📡 Stage 5: Distribution', isAssets: false },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <a href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors mb-3 inline-block">
            ← Back to home
          </a>
          <div className="flex items-center gap-4">
            {plan.config.icon && (
              <img src={plan.config.icon} alt="" className="w-14 h-14 rounded-xl" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{plan.config.app_name}</h1>
              <p className="text-slate-400">{plan.config.one_liner}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportMarkdown}
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            📥 Export .md
          </button>
          <button
            onClick={handleExportPdf}
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            📄 Export PDF
          </button>
          <a
            href={`/plan/${id}/assets`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            🎨 Assets
          </a>
        </div>
      </div>

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
      <div className="mb-6 flex gap-2">
        <CopyButton text={plan.generated} label="Copy full plan" />
      </div>

      {/* Stages */}
      {stageLabels.map((stage, i) => (
        <StageSection
          key={stage.key}
          title={stage.title}
          content={plan.stages[stage.key]}
          defaultOpen={i === 0}
          isAssetsStage={stage.isAssets}
          appContext={`${plan.config.app_name} — ${plan.config.one_liner}. Category: ${plan.config.category}. Audience: ${plan.config.target_audience}. Pricing: ${plan.config.pricing}.`}
        />
      ))}

      {/* Method credit */}
      <div className="text-center text-sm text-slate-600 mt-8 mb-4">
        Generated using the Vibe Marketing Playbook 5-Stage Sequence
      </div>
    </div>
  );
}
