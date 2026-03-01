/**
 * One render function per PDF section.
 * Each returns an HTML string for a complete page (or sequence of pages).
 * All use the CSS classes defined in base-layout.ts.
 */

import { escHtml } from './base-layout';
import type { PdfPositioning, PdfBasicCopy, PdfProCopy } from '@/lib/pdf-prompts';

// ─── Section 1: Positioning Snapshot ─────────────────────────────────────────

export function renderPositioning(pos: PdfPositioning, productName: string): string {
  const bullets = pos.supportingBullets
    .map((b) => `<li>${escHtml(b)}</li>`)
    .join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§1 · Positioning Snapshot</span>
      </div>

      <h2>Positioning Snapshot</h2>

      <div class="callout avoid-break">
        <p>${escHtml(pos.statement)}</p>
      </div>

      <h3>Ideal Customer Profile</h3>
      <table class="avoid-break">
        <tbody>
          <tr><th style="width:100pt;">Who they are</th><td>${escHtml(pos.icp.who)}</td></tr>
          <tr><th>Their pain</th><td>${escHtml(pos.icp.pain)}</td></tr>
          <tr><th>Their goal</th><td>${escHtml(pos.icp.goal)}</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:12pt;">Core Value Proposition</h3>
      <div class="card avoid-break">
        <p style="font-size:12pt; font-weight:500;">${escHtml(pos.valueProposition)}</p>
      </div>

      <h3>Supporting Value Points</h3>
      <ul>${bullets}</ul>
    </div>
    <div class="page-break"></div>
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§1 · Positioning Snapshot (cont.)</span>
      </div>

      <h3>Why Now</h3>
      <div class="card">
        <p>${escHtml(pos.whyNow)}</p>
      </div>
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 2: Competitor Angles ────────────────────────────────────────────

export function renderCompetitors(
  copy: PdfBasicCopy,
  productName: string,
  opportunityGaps?: string[]
): string {
  const competitorCards = copy.competitors
    .map(
      (c) => `
      <div class="card avoid-break">
        <div class="card-label">Competitor</div>
        <h3>${escHtml(c.name)}</h3>
        <table style="margin-top:6pt;">
          <tbody>
            <tr><th style="width:90pt;">What they lead with</th><td>${escHtml(c.emphasis)}</td></tr>
            <tr><th>Their gap</th><td>${escHtml(c.gap)}</td></tr>
            <tr><th>Your angle</th><td><strong>${escHtml(c.angle)}</strong></td></tr>
          </tbody>
        </table>
      </div>`
    )
    .join('');

  const swapRows = copy.sayThisNotThat
    .map(
      (s) => `
      <div class="swap-row avoid-break">
        <div class="swap-this">${escHtml(s.sayThis)}</div>
        <div class="swap-arrow">←</div>
        <div class="swap-not">${escHtml(s.notThat)}</div>
      </div>`
    )
    .join('');

  const gapBlock = opportunityGaps && opportunityGaps.length > 0
    ? `
      <h3 style="margin-top:14pt;">Opportunity Gaps</h3>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:8pt;">Things competitors are ignoring that you can own.</p>
      <ul>${opportunityGaps.map((g) => `<li>${escHtml(g)}</li>`).join('')}</ul>
    `
    : '';

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§2 · Competitor Angles</span>
      </div>

      <h2>Competitor Angles</h2>
      ${competitorCards}

      <h3 style="margin-top:14pt;">Say This, Not That</h3>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:10pt;">
        <span style="background:#DCFCE7; padding:2pt 6pt; border-radius:3pt;">SAY THIS</span>
        &nbsp; replaces &nbsp;
        <span style="background:#FEE2E2; padding:2pt 6pt; border-radius:3pt;">NOT THAT</span>
      </p>
      ${swapRows}

      ${gapBlock}
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 3: Landing Page Copy ────────────────────────────────────────────

export function renderLandingPageCopy(copy: PdfBasicCopy, productName: string, socialProofSuggestions?: string[]): string {
  const lp = copy.landingPage;

  const headlines = lp.headlines
    .map((h, i) => `
      <div class="copy-item avoid-break">
        <div class="copy-item-number">Option ${i + 1}</div>
        <div style="font-size:13pt; font-weight:600;">${escHtml(h)}</div>
      </div>`)
    .join('');

  const subheads = lp.subheadlines
    .map((h, i) => `
      <div class="copy-item avoid-break">
        <div class="copy-item-number">Option ${i + 1}</div>
        <div>${escHtml(h)}</div>
      </div>`)
    .join('');

  const bullets = lp.featureBullets
    .map((b) => `<li>${escHtml(b)}</li>`)
    .join('');

  const shortCTAs = lp.shortCTAs
    .map((c) => `<span class="tag">${escHtml(c)}</span>`)
    .join(' ');

  const longCTAs = lp.longCTAs
    .map((c, i) => `
      <div class="card avoid-break">
        <div class="card-label">Option ${i + 1}</div>
        <div style="font-size:12pt; font-weight:600; margin-bottom:4pt;">${escHtml(c.button)}</div>
        <div style="color:#6B7280; font-size:10pt;">${escHtml(c.supporting)}</div>
      </div>`)
    .join('');

  const sectionOrder = lp.sectionOrder
    .map((s, i) => `<li>${i + 1}. ${escHtml(s)}</li>`)
    .join('');

  const socialProofBlock = socialProofSuggestions && socialProofSuggestions.length > 0
    ? `
      <h3 style="margin-top:14pt;">Social Proof to Collect</h3>
      <ul>${socialProofSuggestions.map((s) => `<li>${escHtml(s)}</li>`).join('')}</ul>
    `
    : '';

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§3 · Landing Page Copy</span>
      </div>

      <h2>Landing Page Copy</h2>

      <h3>Hero Headlines</h3>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:8pt;">Ranked most-direct first. Test option 1 first.</p>
      ${headlines}
    </div>
    <div class="page-break"></div>
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§3 · Landing Page Copy (cont.)</span>
      </div>

      <h3>Subheadlines</h3>
      ${subheads}

      <h3 style="margin-top:12pt;">Feature / Benefit Bullets</h3>
      <ul>${bullets}</ul>
    </div>
    <div class="page-break"></div>
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§3 · Landing Page Copy (cont.)</span>
      </div>

      <h3>Short CTAs (Button Labels)</h3>
      <div style="margin-bottom:12pt;">${shortCTAs}</div>

      <h3>Long CTAs (Button + Supporting Text)</h3>
      ${longCTAs}

      <h3 style="margin-top:12pt;">Recommended Section Order</h3>
      <ol style="color:#374151;">${sectionOrder}</ol>

      ${socialProofBlock}
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 4: Social Launch Posts ──────────────────────────────────────────

export function renderSocialPosts(copy: PdfBasicCopy, productName: string): string {
  const xPosts = copy.socialPosts.twitter
    .map((p, i) => `
      <div class="post-bubble avoid-break">
        <div class="post-platform">X / Twitter · Post ${i + 1}</div>
        <div style="white-space:pre-wrap;">${escHtml(p)}</div>
        <div style="color:#9CA3AF; font-size:8pt; margin-top:4pt;">${p.length} chars</div>
      </div>`)
    .join('');

  const liPosts = copy.socialPosts.linkedin
    .map((p, i) => `
      <div class="post-bubble avoid-break">
        <div class="post-platform">LinkedIn · Post ${i + 1}</div>
        <div style="white-space:pre-wrap;">${escHtml(p)}</div>
      </div>`)
    .join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§4 · Social Launch Posts</span>
      </div>

      <h2>Social Launch Posts</h2>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:12pt;">Copy-paste ready. No [link] placeholders.</p>

      <h3>X / Twitter</h3>
      ${xPosts}
    </div>
    <div class="page-break"></div>
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§4 · Social Launch Posts (cont.)</span>
      </div>

      <h3>LinkedIn</h3>
      ${liPosts}
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 5 (Pro): Email Sequence ─────────────────────────────────────────

export function renderEmails(copy: PdfProCopy, productName: string): string {
  const emailTypeLabel: Record<string, string> = {
    launch: 'Email 1 — Launch Announcement',
    value: 'Email 2 — Value & Follow-Up',
    urgency: 'Email 3 — Last Call',
  };

  const emailCards = copy.emails
    .map((e) => `
      <div class="email-card avoid-break">
        <div class="email-header">${escHtml(emailTypeLabel[e.type] ?? e.type)}</div>
        <div class="email-meta">
          <div class="email-meta-row"><span class="email-meta-label">Subject A:</span><span>${escHtml(e.subjectA)}</span></div>
          <div class="email-meta-row"><span class="email-meta-label">Subject B:</span><span style="color:#6B7280;">${escHtml(e.subjectB)}</span></div>
          <div class="email-meta-row"><span class="email-meta-label">Preview:</span><span style="color:#6B7280; font-size:9pt;">${escHtml(e.previewText)}</span></div>
        </div>
        <div class="email-body">${escHtml(e.body)}</div>
        <div style="padding:8pt 12pt; border-top:1px solid var(--border); background:var(--bg-subtle);">
          <span class="tag">${escHtml(e.ctaLabel)}</span>
        </div>
      </div>`)
    .join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§5 · Email Sequence</span>
      </div>
      <h2>Email Sequence</h2>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:12pt;">Three send-ready emails. Paste into any email tool. Send in order: launch → +3 days value → +7 days last-call.</p>
      ${emailCards}
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 6 (Pro): 30-Day Content Plan ────────────────────────────────────

export function renderContentPlan(copy: PdfProCopy, productName: string): string {
  const themes = copy.contentPlan.weeklyThemes
    .map((t, i) => `<span class="tag">Week ${i + 1}: ${escHtml(t)}</span>`)
    .join(' ');

  const calendarRows = copy.contentPlan.calendar
    .map((row) => `
      <tr class="avoid-break">
        <td style="text-align:center; font-weight:600; width:24pt;">${row.day}</td>
        <td>${escHtml(row.title)}</td>
        <td><span class="tag">${escHtml(row.postType)}</span></td>
        <td>${escHtml(row.channel)}</td>
        <td style="color:#6B7280;">${escHtml(row.intent)}</td>
      </tr>`)
    .join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§6 · 30-Day Content Plan</span>
      </div>
      <h2>30-Day Content Plan</h2>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:8pt;">Weekly themes:</p>
      <div style="margin-bottom:14pt;">${themes}</div>

      <table class="calendar-grid">
        <thead>
          <tr>
            <th style="width:24pt;">Day</th>
            <th>Hook / Title</th>
            <th style="width:70pt;">Type</th>
            <th style="width:50pt;">Channel</th>
            <th>Intent</th>
          </tr>
        </thead>
        <tbody>${calendarRows}</tbody>
      </table>
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 7 (Pro): Ad Copy Angles ─────────────────────────────────────────

export function renderAdCopy(copy: PdfProCopy, productName: string): string {
  const adCards = copy.adCopy
    .map((ad, i) => `
      <div class="card avoid-break">
        <div class="card-label">Angle ${i + 1} · ${escHtml(ad.angle)} · <em>${escHtml(ad.emotion)}</em></div>
        <div style="margin-bottom:6pt;">
          <div style="font-size:9pt; color:#6B7280; margin-bottom:2pt;">Headline (≤40 chars)</div>
          <div style="font-weight:600; font-size:12pt;">${escHtml(ad.headline)}</div>
        </div>
        <div style="margin-bottom:6pt;">
          <div style="font-size:9pt; color:#6B7280; margin-bottom:2pt;">Body (≤125 chars)</div>
          <div>${escHtml(ad.body)}</div>
        </div>
        <div>
          <div style="font-size:9pt; color:#6B7280; margin-bottom:2pt;">CTA (≤20 chars)</div>
          <span class="tag">${escHtml(ad.cta)}</span>
        </div>
      </div>`)
    .join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§7 · Ad Copy Angles</span>
      </div>
      <h2>Ad Copy Angles</h2>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:12pt;">5 distinct angles for Meta / X ad formats. Character counts are hard limits.</p>
      ${adCards}
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 8 (Pro): App Store Copy ─────────────────────────────────────────

export function renderAppStoreCopy(copy: PdfProCopy, productName: string): string {
  const as = copy.appStoreCopy;

  const subtitles = as.subtitles
    .map((s, i) => `
      <div class="copy-item avoid-break">
        <div class="copy-item-number">Option ${i + 1} · ${s.length} chars</div>
        <div>${escHtml(s)}</div>
      </div>`)
    .join('');

  const shorts = as.shortDescriptions
    .map((s, i) => `
      <div class="copy-item avoid-break">
        <div class="copy-item-number">Option ${i + 1} · ${s.length} chars</div>
        <div>${escHtml(s)}</div>
      </div>`)
    .join('');

  const keywords = as.keywords.map((k) => `<span class="tag">${escHtml(k)}</span>`).join(' ');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§8 · App Store Copy</span>
      </div>
      <h2>App Store / Listing Copy</h2>

      <h3>Subtitle Options (≤30 chars)</h3>
      ${subtitles}

      <h3 style="margin-top:12pt;">Short Descriptions (≤80 chars)</h3>
      ${shorts}

      <h3 style="margin-top:12pt;">Long Description</h3>
      <div class="card" style="white-space:pre-wrap; font-size:9pt; line-height:1.5;">${escHtml(as.longDescription)}</div>

      <h3 style="margin-top:12pt;">Keyword Suggestions</h3>
      <div>${keywords}</div>
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 9 (Pro): Tone of Voice ──────────────────────────────────────────

export function renderToneOfVoice(copy: PdfProCopy, productName: string): string {
  const dos = copy.toneOfVoice.dos.map((d) => `<li>${escHtml(d)}</li>`).join('');
  const donts = copy.toneOfVoice.donts.map((d) => `<li>${escHtml(d)}</li>`).join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§9 · Tone-of-Voice Cheat Sheet</span>
      </div>
      <h2>Tone-of-Voice Cheat Sheet</h2>

      <div class="callout avoid-break" style="margin-bottom:14pt;">
        <p>${escHtml(copy.toneOfVoice.summary)}</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12pt;">
        <div class="card">
          <div class="card-label" style="color:#059669;">Do ✓</div>
          <ul style="margin-top:6pt;">${dos}</ul>
        </div>
        <div class="card">
          <div class="card-label" style="color:#DC2626;">Don't ✗</div>
          <ul style="margin-top:6pt;">${donts}</ul>
        </div>
      </div>

      <h3 style="margin-top:14pt;">Sample Paragraph</h3>
      <div class="card">
        <div class="card-label">Example copy in your tone</div>
        <p style="margin-top:6pt; font-size:11pt; line-height:1.7; white-space:pre-wrap;">${escHtml(copy.toneOfVoice.sampleParagraph)}</p>
      </div>
    </div>
    <div class="page-break"></div>
  `;
}
