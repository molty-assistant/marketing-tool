'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

function renderMarkdown(md: string): string {
  return md
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300 underline">$1</a>')
    .replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled /> $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled /> $1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\|(.+)\|$/gm, (_, content) => {
      const cells = content.split('|').map((c: string) => c.trim());
      if (cells.every((c: string) => /^[-:]+$/.test(c))) return '';
      const cellHtml = cells.map((c: string) => `<td>${c}</td>`).join('');
      return `<tr>${cellHtml}</tr>`;
    })
    .replace(/^---$/gm, '<hr />')
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')
    .replace(/\n{3,}/g, '\n\n');
}

function StageSection({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-800/50 transition-colors text-left"
      >
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-slate-500 text-xl">{open ? '−' : '+'}</span>
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

interface SharedPlan {
  config: {
    app_name: string;
    one_liner: string;
    icon: string;
    app_type: string;
    category: string;
    pricing: string;
    distribution_channels: string[];
  };
  generated: string;
  stages: {
    research: string;
    foundation: string;
    structure: string;
    assets: string;
    distribution: string;
  };
}

export default function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [plan, setPlan] = useState<SharedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/shared/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setPlan)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="inline-flex items-center gap-3 text-lg text-slate-300">
          <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading shared plan...
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Shared plan not found</div>
        <p className="text-sm text-slate-500 mb-4">This link may have expired or been removed.</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Create your own marketing brief
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

  const [pdfExporting, setPdfExporting] = useState(false);

  const handleExportPdf = async () => {
    if (pdfExporting) return;
    setPdfExporting(true);

    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const match = /filename="?([^";]+)"?/i.exec(cd);
      const filename = match?.[1] || `marketing-brief-${plan.config.app_name.toLowerCase().replace(/\s+/g, '-')}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Sorry — something went wrong exporting your PDF. Please try again.');
    } finally {
      setPdfExporting(false);
    }
  };

  const stageLabels = [
    { key: 'research' as const, title: '🔍 Stage 1: Research' },
    { key: 'foundation' as const, title: '🏗️ Stage 2: Foundation' },
    { key: 'structure' as const, title: '🧱 Stage 3: Structure' },
    { key: 'assets' as const, title: '✍️ Stage 4: Copy Templates' },
    { key: 'distribution' as const, title: '📡 Stage 5: Distribution' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Shared banner */}
      <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-4 mb-6 text-center">
        <p className="text-sm text-indigo-300">
          📋 This is a shared marketing brief.{' '}
          <Link href="/" className="underline hover:text-indigo-200 font-medium">
            Create your own →
          </Link>
        </p>
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
          <button
            onClick={handleExportMarkdown}
            className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg transition-colors"
          >
            📥 Export .md
          </button>
          <button
            onClick={handleExportPdf}
            disabled={pdfExporting}
            className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {pdfExporting ? 'Preparing…' : '📄 Export PDF'}
          </button>
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

      {/* Stages - all expanded by default */}
      {stageLabels.map((stage) => (
        <StageSection
          key={stage.key}
          title={stage.title}
          content={plan.stages[stage.key]}
        />
      ))}

      {/* Footer */}
      <div className="text-center text-sm text-slate-600 mt-8 mb-4">
        Generated using the Vibe Marketing Playbook 5-Stage Sequence
      </div>
    </div>
  );
}
