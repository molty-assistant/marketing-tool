/**
 * Base HTML/CSS layout for the PDF.
 * Designed for A4 (210mm × 297mm), 12mm margins, Playwright page.pdf().
 */

export function baseStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --brand-primary: #4F46E5;
      --brand-primary-light: #EEF2FF;
      --brand-accent: #7C3AED;
      --text-primary: #111827;
      --text-secondary: #6B7280;
      --text-muted: #9CA3AF;
      --border: #E5E7EB;
      --bg-subtle: #F9FAFB;
      --success: #059669;
      --page-width: 210mm;
      --page-height: 297mm;
      --margin: 12mm;
      --content-width: calc(210mm - 24mm);
    }

    html, body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: var(--text-primary);
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Page breaks */
    .page-break { page-break-after: always; break-after: page; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    .keep-together { page-break-inside: avoid; break-inside: avoid; }

    /* Typography */
    h1 { font-size: 24pt; font-weight: 700; line-height: 1.2; color: var(--text-primary); }
    h2 { font-size: 16pt; font-weight: 600; line-height: 1.3; color: var(--text-primary); margin-bottom: 8pt; }
    h3 { font-size: 12pt; font-weight: 600; line-height: 1.4; color: var(--text-primary); margin-bottom: 4pt; }
    p  { margin-bottom: 8pt; }

    /* Layout */
    .page {
      width: var(--page-width);
      min-height: var(--page-height);
      padding: var(--margin);
      position: relative;
    }

    /* Header bar shown on every content page */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8pt;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16pt;
    }
    .page-header-product { font-size: 9pt; font-weight: 600; color: var(--text-secondary); }
    .page-header-section  { font-size: 9pt; color: var(--text-muted); }

    /* Callout / highlight box */
    .callout {
      background: var(--brand-primary-light);
      border-left: 4px solid var(--brand-primary);
      padding: 12pt 14pt;
      border-radius: 4pt;
      margin-bottom: 12pt;
    }
    .callout p { margin-bottom: 0; font-size: 12pt; font-weight: 500; color: var(--brand-primary); }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; font-size: 10pt; }
    th { background: var(--bg-subtle); text-align: left; padding: 6pt 8pt; font-weight: 600; border: 1px solid var(--border); }
    td { padding: 6pt 8pt; border: 1px solid var(--border); vertical-align: top; }
    tr:nth-child(even) td { background: var(--bg-subtle); }

    /* Lists */
    ul { list-style: none; padding: 0; margin-bottom: 10pt; }
    ul li { padding: 4pt 0 4pt 16pt; position: relative; }
    ul li::before { content: "→"; position: absolute; left: 0; color: var(--brand-primary); font-weight: 700; }

    ol { padding-left: 20pt; margin-bottom: 10pt; }
    ol li { padding: 2pt 0; }

    /* Cards */
    .card {
      border: 1px solid var(--border);
      border-radius: 6pt;
      padding: 12pt;
      margin-bottom: 10pt;
      background: white;
    }
    .card-label { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 4pt; }

    /* Copy pill — used for headlines/CTAs */
    .copy-item {
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: 4pt;
      padding: 8pt 10pt;
      margin-bottom: 6pt;
      font-size: 11pt;
    }
    .copy-item-number { font-size: 8pt; font-weight: 700; color: var(--brand-primary); margin-bottom: 2pt; }

    /* Badge */
    .badge {
      display: inline-block;
      padding: 3pt 8pt;
      border-radius: 20pt;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-basic { background: #DBEAFE; color: #1D4ED8; }
    .badge-pro   { background: #EDE9FE; color: #6D28D9; }

    /* Tag chip */
    .tag {
      display: inline-block;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: 20pt;
      padding: 2pt 8pt;
      font-size: 9pt;
      margin: 2pt;
    }

    /* Section divider */
    .section-divider {
      border: none;
      border-top: 2px solid var(--brand-primary);
      margin: 12pt 0;
      opacity: 0.15;
    }

    /* Say-this / not-that row */
    .swap-row {
      display: grid;
      grid-template-columns: 1fr 28pt 1fr;
      gap: 6pt;
      align-items: center;
      margin-bottom: 8pt;
    }
    .swap-this { background: #DCFCE7; border: 1px solid #86EFAC; border-radius: 4pt; padding: 6pt 8pt; font-size: 10pt; }
    .swap-not  { background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 4pt; padding: 6pt 8pt; font-size: 10pt; }
    .swap-arrow { text-align: center; font-weight: 700; color: var(--text-muted); }

    /* Calendar grid */
    .calendar-grid { font-size: 9pt; }
    .calendar-grid th { font-size: 8pt; }

    /* Post bubble */
    .post-bubble {
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: 8pt;
      padding: 10pt;
      margin-bottom: 8pt;
      font-size: 10pt;
      line-height: 1.5;
    }
    .post-platform { font-size: 8pt; font-weight: 600; color: var(--brand-primary); margin-bottom: 4pt; }

    /* Email section */
    .email-card {
      border: 1px solid var(--border);
      border-radius: 6pt;
      overflow: hidden;
      margin-bottom: 12pt;
    }
    .email-header { background: var(--brand-primary); color: white; padding: 8pt 12pt; font-weight: 600; font-size: 10pt; }
    .email-meta   { background: var(--bg-subtle); padding: 8pt 12pt; font-size: 9pt; border-bottom: 1px solid var(--border); }
    .email-body   { padding: 12pt; font-size: 10pt; line-height: 1.6; white-space: pre-wrap; }
    .email-meta-row { display: flex; gap: 8pt; margin-bottom: 4pt; }
    .email-meta-label { font-weight: 600; color: var(--text-secondary); min-width: 60pt; }
  `;
}

export function coverPage(params: {
  productName: string;
  productUrl: string;
  tier: 'basic' | 'pro';
  date: string;
}): string {
  const tierLabel = params.tier === 'basic' ? 'Basic Marketing Plan' : 'Pro Marketing Plan';
  const tierClass = params.tier === 'basic' ? 'badge-basic' : 'badge-pro';

  return `
    <div class="page" style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; min-height:297mm;">
      <div style="margin-bottom:24pt;">
        <div style="width:64pt; height:64pt; background:linear-gradient(135deg,#4F46E5,#7C3AED); border-radius:16pt; margin:0 auto 16pt; display:flex; align-items:center; justify-content:center;">
          <span style="color:white; font-size:28pt; font-weight:700;">M</span>
        </div>
        <div style="font-size:9pt; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#6B7280; margin-bottom:8pt;">Marketing Toolkit</div>
      </div>

      <h1 style="font-size:28pt; margin-bottom:12pt; max-width:400pt;">${escHtml(params.productName)}</h1>

      <span class="badge ${tierClass}" style="font-size:10pt; padding:5pt 14pt; margin-bottom:24pt;">${tierLabel}</span>

      <p style="color:#6B7280; font-size:10pt; margin-bottom:4pt;">${escHtml(params.productUrl)}</p>
      <p style="color:#9CA3AF; font-size:9pt;">${params.date}</p>

      <div style="position:absolute; bottom:var(--margin); left:0; right:0; text-align:center; font-size:8pt; color:#9CA3AF;">
        Generated by Marketing Toolkit · Not for redistribution
      </div>
    </div>
    <div class="page-break"></div>
  `;
}

export function tocPage(sections: Array<{ number: string; title: string; pages: string }>): string {
  const rows = sections
    .map(
      (s) => `
      <tr class="avoid-break">
        <td style="color:#6B7280; width:30pt;">${s.number}</td>
        <td style="font-weight:500;">${escHtml(s.title)}</td>
        <td style="text-align:right; color:#9CA3AF;">${s.pages}</td>
      </tr>`
    )
    .join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">Table of Contents</span>
      </div>
      <h2>What's inside</h2>
      <table style="margin-top:12pt;">
        <thead><tr><th>§</th><th>Section</th><th style="text-align:right;">Pages</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="page-break"></div>
  `;
}

export function nextStepsPage(tier: 'basic' | 'pro', productName: string): string {
  const upgradeBlock = tier === 'basic' ? `
    <div class="callout" style="margin-top:16pt;">
      <p style="font-size:11pt;">Want the full launch toolkit? The <strong>Pro plan</strong> adds email sequences, a 30-day content calendar, ad copy, and a tone-of-voice guide — all generated instantly for £99.</p>
    </div>
  ` : `
    <div class="callout" style="margin-top:16pt;">
      <p style="font-size:11pt;">Need a fresh angle? You can order another plan anytime. Each order generates a new set of copy from scratch — great for testing positioning.</p>
    </div>
  `;

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">Execution: What to do now</span>
      </div>
      <h2>What to do now</h2>

      <div style="margin-top:12pt;">
        <div class="card avoid-break">
          <div class="card-label">This week</div>
          <ul>
            <li>Update your landing page hero using one of the headline options from the Landing Page Copy section</li>
            <li>Schedule your first 3 social posts using the drafts in the Social Launch Posts section</li>
            <li>Share your positioning statement with your team or an advisor for feedback</li>
          </ul>
        </div>
        <div class="card avoid-break">
          <div class="card-label">This month</div>
          <ul>
            <li>Run an A/B test on at least 2 headlines using your analytics tool</li>
            <li>Use the competitor angles to tighten your sales pitch</li>
            <li>Collect testimonials that map to the value bullets from your positioning</li>
          </ul>
        </div>
      </div>

      ${upgradeBlock}

      <div style="margin-top:20pt; text-align:center; color:#9CA3AF; font-size:9pt;">
        <p>Generated by Marketing Toolkit &nbsp;·&nbsp; marketingtoolkit.io</p>
        <p>This report is licensed for single-company use only.</p>
      </div>
    </div>
  `;
}

// Simple HTML entity escaping for user-supplied content
export function escHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
