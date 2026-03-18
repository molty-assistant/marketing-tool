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
      --danger: #DC2626;
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
    h2 {
      font-size: 16pt; font-weight: 700; line-height: 1.3; color: var(--text-primary);
      margin-bottom: 10pt;
      padding-bottom: 6pt;
      border-bottom: 2px solid var(--brand-primary);
    }
    h3 { font-size: 12pt; font-weight: 600; line-height: 1.4; color: var(--text-primary); margin-bottom: 6pt; }
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
      margin-bottom: 16pt;
    }
    .page-header::after {
      content: '';
      position: absolute;
      top: calc(var(--margin) + 18pt);
      left: var(--margin);
      right: var(--margin);
      height: 1px;
      background: linear-gradient(90deg, var(--brand-primary) 0%, transparent 100%);
      opacity: 0.3;
    }
    .page-header-product { font-size: 9pt; font-weight: 700; color: var(--brand-primary); }
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
    th { background: var(--brand-primary-light); text-align: left; padding: 6pt 8pt; font-weight: 600; border: 1px solid #C7D2FE; color: #3730A3; }
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
    .card-label {
      font-size: 8pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--text-muted); margin-bottom: 6pt;
    }

    /* Copy pill — used for headlines/CTAs */
    .copy-item {
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-left: 3pt solid var(--brand-primary);
      border-radius: 4pt;
      padding: 8pt 10pt;
      margin-bottom: 6pt;
      font-size: 11pt;
    }
    .copy-item-number { font-size: 8pt; font-weight: 700; color: var(--brand-primary); margin-bottom: 3pt; }

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
      padding: 10pt 12pt;
      margin-bottom: 8pt;
      font-size: 10pt;
      line-height: 1.5;
    }
    .post-platform { font-size: 8pt; font-weight: 700; color: var(--brand-primary); margin-bottom: 5pt; }
    .post-char-count { color: #9CA3AF; font-size: 8pt; margin-top: 5pt; }

    /* Email section */
    .email-card {
      border: 1px solid var(--border);
      border-radius: 6pt;
      overflow: hidden;
      margin-bottom: 14pt;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .email-header {
      background: linear-gradient(135deg, #4F46E5, #7C3AED);
      color: white;
      padding: 9pt 12pt;
      font-weight: 700;
      font-size: 10pt;
    }
    .email-meta   { background: var(--bg-subtle); padding: 8pt 12pt; font-size: 9pt; border-bottom: 1px solid var(--border); }
    .email-body   { padding: 12pt; font-size: 10pt; line-height: 1.7; white-space: pre-wrap; }
    .email-body strong { font-weight: 600; color: var(--text-primary); }
    .email-meta-row { display: flex; gap: 8pt; margin-bottom: 4pt; }
    .email-meta-label { font-weight: 600; color: var(--text-secondary); min-width: 60pt; }
    .email-cta { padding: 8pt 12pt; border-top: 1px solid var(--border); background: var(--bg-subtle); }

    /* Char count indicators */
    .char-ok   { color: #059669; font-weight: 700; }
    .char-over { color: #DC2626; font-weight: 700; }
  `;
}

export function coverPage(params: {
  productName: string;
  productUrl: string;
  tier: 'basic' | 'pro';
  date: string;
}): string {
  const tierLabel = params.tier === 'basic' ? 'Entry Marketing Plan' : 'Pro Marketing Plan';
  const initial = (params.productName || 'P').charAt(0).toUpperCase();

  return `
    <div class="page" style="
      background: linear-gradient(145deg, #0f0c29 0%, #302b63 45%, #24243e 100%);
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      text-align:center;
      min-height:297mm;
      position:relative;
      overflow:hidden;
    ">
      <!-- Decorative glow blobs -->
      <div style="position:absolute;top:-30mm;right:-20mm;width:110mm;height:110mm;border-radius:50%;background:rgba(99,102,241,0.18);filter:blur(18mm);pointer-events:none;"></div>
      <div style="position:absolute;bottom:-30mm;left:-20mm;width:90mm;height:90mm;border-radius:50%;background:rgba(124,58,237,0.12);filter:blur(14mm);pointer-events:none;"></div>
      <div style="position:absolute;top:40%;left:-10mm;width:60mm;height:60mm;border-radius:50%;background:rgba(165,180,252,0.06);filter:blur(10mm);pointer-events:none;"></div>

      <!-- Top-left LaunchKit branding -->
      <div style="position:absolute;top:var(--margin);left:var(--margin);display:flex;align-items:center;gap:7pt;">
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lk-lg" x1="0" y1="0" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stop-color="#818cf8"/>
              <stop offset="1" stop-color="#a78bfa"/>
            </linearGradient>
          </defs>
          <rect width="22" height="22" rx="6" fill="url(#lk-lg)"/>
          <path d="M7 11.5L10.5 15L15.5 8" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="color:rgba(255,255,255,0.45);font-size:8.5pt;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">LaunchKit</span>
      </div>

      <!-- Centre content -->
      <div style="display:flex;flex-direction:column;align-items:center;">
        <!-- Product avatar -->
        <div style="
          width:70pt;height:70pt;
          background:linear-gradient(135deg,rgba(99,102,241,0.35),rgba(124,58,237,0.35));
          border:1.5px solid rgba(165,180,252,0.35);
          border-radius:18pt;
          margin-bottom:22pt;
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="color:white;font-size:32pt;font-weight:700;line-height:1;">${initial}</span>
        </div>

        <!-- Product name -->
        <h1 style="
          color:white;
          font-size:30pt;
          font-weight:700;
          line-height:1.2;
          margin-bottom:14pt;
          max-width:400pt;
          text-shadow:0 2px 20px rgba(0,0,0,0.4);
        ">${escHtml(params.productName)}</h1>

        <!-- Tier badge -->
        <div style="
          display:inline-block;
          background:linear-gradient(135deg,rgba(99,102,241,0.25),rgba(124,58,237,0.25));
          border:1px solid rgba(165,135,250,0.45);
          color:rgba(255,255,255,0.85);
          padding:5pt 18pt;border-radius:20pt;
          font-size:8.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;
          margin-bottom:28pt;
        ">${tierLabel}</div>

        <!-- Meta -->
        <p style="color:rgba(255,255,255,0.4);font-size:9.5pt;margin-bottom:4pt;">${escHtml(params.productUrl)}</p>
        <p style="color:rgba(255,255,255,0.25);font-size:8.5pt;">${params.date}</p>
      </div>

      <!-- Bottom attribution -->
      <div style="position:absolute;bottom:var(--margin);left:0;right:0;text-align:center;font-size:7.5pt;color:rgba(255,255,255,0.18);">
        Generated by LaunchKit &nbsp;·&nbsp; molty.marketing
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
        <td style="color:var(--brand-primary);font-weight:700;width:30pt;font-size:9pt;">${s.number}</td>
        <td style="font-weight:500;">${escHtml(s.title)}</td>
        <td style="text-align:right;color:var(--text-muted);font-size:9pt;">${s.pages}</td>
      </tr>`
    )
    .join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">Table of Contents</span>
      </div>
      <h2 style="border:none;padding-bottom:0;margin-bottom:4pt;">What's inside</h2>
      <p style="color:var(--text-muted);font-size:9pt;margin-bottom:14pt;">Your complete launch marketing pack — ready to use immediately.</p>
      <table style="margin-top:8pt;">
        <thead><tr><th style="width:30pt;">§</th><th>Section</th><th style="text-align:right;">Pages</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="page-break"></div>
  `;
}

export function nextStepsPage(tier: 'basic' | 'pro', productName: string): string {
  const upgradeBlock = tier === 'basic' ? `
    <div class="callout" style="margin-top:16pt;">
      <p style="font-size:11pt;">Want the full launch toolkit? The <strong>Pro plan</strong> adds email sequences, a 30-day content calendar, ad copy, app store copy, and a tone-of-voice guide — all generated instantly for £99.</p>
    </div>
  ` : `
    <div style="margin-top:18pt;background:linear-gradient(135deg,#EEF2FF,#F5F3FF);border:1px solid #C7D2FE;border-radius:6pt;padding:12pt 14pt;">
      <p style="font-size:10pt;color:#3730A3;margin-bottom:0;"><strong>Need a fresh angle?</strong> Each order generates a brand-new set of copy from scratch — great for A/B testing positioning or refreshing your messaging each quarter. Order anytime at <strong>molty.marketing</strong></p>
    </div>
  `;

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">Execution: What to do now</span>
      </div>

      <h2>What to do now</h2>
      <p style="color:var(--text-secondary);font-size:10pt;margin-bottom:16pt;">Your plan is ready. Here's how to get momentum fast.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12pt;margin-top:4pt;">
        <div class="card avoid-break" style="border-top:3pt solid #4F46E5;">
          <div class="card-label" style="color:#4F46E5;">This week</div>
          <ul>
            <li>Update your landing page hero using one of the headline options from the Landing Page Copy section</li>
            <li>Schedule your first 3 social posts using the drafts in the Social Launch Posts section</li>
            <li>Share your positioning statement with your team or an advisor for feedback</li>
          </ul>
        </div>
        <div class="card avoid-break" style="border-top:3pt solid #7C3AED;">
          <div class="card-label" style="color:#7C3AED;">This month</div>
          <ul>
            <li>Run an A/B test on at least 2 headlines using your analytics tool</li>
            <li>Use the competitor angles to tighten your sales pitch</li>
            <li>Collect testimonials that map to the value bullets from your positioning</li>
          </ul>
        </div>
      </div>

      ${upgradeBlock}

      <div style="margin-top:24pt;text-align:center;">
        <p style="color:var(--text-muted);font-size:8pt;">Generated by LaunchKit &nbsp;·&nbsp; molty.marketing</p>
        <p style="color:var(--text-muted);font-size:8pt;">This report is licensed for single-company use only.</p>
      </div>
    </div>
    <div class="page-break"></div>
  `;
}

/** Render simple markdown (**bold**, numbered lists, * bullets) to safe HTML. */
export function renderMarkdown(raw: string): string {
  // 1. Escape HTML to prevent XSS
  let html = escHtml(raw);
  // 2. Bold: **text** → <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 3. Numbered list items: "1. text" at line start
  html = html.replace(
    /^(\d+)\.\s+(.+)$/gm,
    '<div style="display:flex;gap:6pt;margin-bottom:2pt;"><span style="color:#6B7280;min-width:14pt;flex-shrink:0;">$1.</span><span>$2</span></div>'
  );
  // 4. Bullet list items: "* text" at line start
  html = html.replace(
    /^\*\s+(.+)$/gm,
    '<div style="display:flex;gap:6pt;margin-bottom:2pt;"><span style="color:#4F46E5;min-width:12pt;flex-shrink:0;">→</span><span>$1</span></div>'
  );
  return html;
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
