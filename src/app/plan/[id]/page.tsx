'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingPlan } from '@/lib/types';

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

function StageSection({ title, content, defaultOpen = false }: { title: string; content: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

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
          <div
            className="markdown-content mt-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      )}
    </div>
  );
}

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<MarketingPlan | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`plan-${id}`);
    if (stored) {
      try { setPlan(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, [id]);

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <p className="text-sm text-slate-500 mb-4">Plans are stored in your browser session. They may have expired.</p>
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

  const stageLabels = [
    { key: 'research' as const, title: '🔍 Stage 1: Research', emoji: '🔍' },
    { key: 'foundation' as const, title: '🏗️ Stage 2: Foundation', emoji: '🏗️' },
    { key: 'structure' as const, title: '🧱 Stage 3: Structure', emoji: '🧱' },
    { key: 'assets' as const, title: '✍️ Stage 4: Copy Templates', emoji: '✍️' },
    { key: 'distribution' as const, title: '📡 Stage 5: Distribution', emoji: '📡' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
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
        <div className="flex gap-2">
          <button
            onClick={handleExportMarkdown}
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            📥 Export .md
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
          {plan.config.distribution_channels.map(ch => (
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
        />
      ))}

      {/* Method credit */}
      <div className="text-center text-sm text-slate-600 mt-8 mb-4">
        Generated using the Vibe Marketing Playbook 5-Stage Sequence
      </div>
    </div>
  );
}
