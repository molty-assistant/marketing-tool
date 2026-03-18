/**
 * One render function per PDF section.
 * Each returns an HTML string for a complete page (or sequence of pages).
 * All use the CSS classes defined in base-layout.ts.
 */

import { escHtml, renderMarkdown } from './base-layout';
import type { PdfPositioning, PdfBasicCopy, PdfProCopy } from '@/lib/pdf-prompts';

// ─── Section 1: Positioning Snapshot ─────────────────────────────────────────

export function renderPositioning(pos: PdfPositioning, productName: string): string {
  const bullets = (pos.supportingBullets ?? [])
    .map((b) => `<li>${escHtml(String(b))}</li>`)
    .join('');

  // All content in one flowing div — avoids a near-empty second page for "Why Now"
  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§1 · Executive Summary & Positioning</span>
      </div>

      <h2>Executive Summary & Positioning</h2>

      <div class="card avoid-break" style="border-top:3pt solid var(--brand-primary);">
        <div class="card-label">App in 1 Sentence</div>
        <p style="font-size:12pt; font-weight:600; color:var(--brand-primary); margin-bottom:10pt;">${escHtml(pos.executiveSummary?.sentence ?? '')}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12pt;">
          <div>
            <div class="card-label">Ideal User</div>
            <p style="font-weight:500; margin-bottom:0;">${escHtml(pos.executiveSummary?.idealUser ?? '')}</p>
          </div>
          <div>
            <div class="card-label">Core Metric</div>
            <p style="font-weight:500; margin-bottom:0;">${escHtml(pos.executiveSummary?.coreMetric ?? '')}</p>
          </div>
        </div>
      </div>

      <h3 style="margin-top:14pt;">Positioning Statement</h3>
      <div class="callout avoid-break">
        <p>${escHtml(pos.statement ?? '')}</p>
      </div>

      <h3>Ideal Customer Profile</h3>
      <table class="avoid-break">
        <tbody>
          <tr><th style="width:100pt;">Who they are</th><td>${escHtml(pos.icp?.who ?? '')}</td></tr>
          <tr><th>Their pain</th><td>${escHtml(pos.icp?.pain ?? '')}</td></tr>
          <tr><th>Their goal</th><td>${escHtml(pos.icp?.goal ?? '')}</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:10pt;">Core Value Proposition</h3>
      <div class="card avoid-break">
        <p style="font-size:12pt; font-weight:500; margin-bottom:0;">${escHtml(pos.valueProposition ?? '')}</p>
      </div>

      <h3>Supporting Value Points</h3>
      <ul>${bullets}</ul>

      <h3 style="margin-top:10pt;">Why Now</h3>
      <div class="card avoid-break">
        <p style="margin-bottom:0;">${escHtml(pos.whyNow ?? '')}</p>
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
  const competitorCards = (copy.competitors ?? [])
    .map(
      (c) => `
      <div class="card avoid-break">
        <div class="card-label">Competitor</div>
        <h3 style="margin-bottom:6pt;">${escHtml(c.name)}</h3>
        <table style="margin-top:4pt;margin-bottom:0;">
          <tbody>
            <tr><th style="width:90pt;">What they lead with</th><td>${escHtml(c.emphasis)}</td></tr>
            <tr><th>Their gap</th><td>${escHtml(c.gap)}</td></tr>
            <tr><th style="background:#DCFCE7;color:#166534;">Your angle</th><td style="background:#F0FDF4;"><strong>${escHtml(c.angle)}</strong></td></tr>
          </tbody>
        </table>
      </div>`
    )
    .join('');

  const swapRows = (copy.sayThisNotThat ?? [])
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
        <span style="background:#DCFCE7; padding:2pt 6pt; border-radius:3pt; font-weight:600; font-size:8pt;">SAY THIS</span>
        &nbsp; replaces &nbsp;
        <span style="background:#FEE2E2; padding:2pt 6pt; border-radius:3pt; font-weight:600; font-size:8pt;">NOT THAT</span>
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

  const headlines = (lp.headlines ?? [])
    .map((h, i) => `
      <div class="copy-item avoid-break">
        <div class="copy-item-number">Option ${i + 1}</div>
        <div style="font-size:13pt; font-weight:700; margin-bottom:5pt; color:var(--text-primary);">${escHtml(h.text)}</div>
        <div style="font-size:9pt; color:var(--brand-primary); font-style:italic;">[Visual: ${escHtml(h.visualAssignment)}]</div>
      </div>`)
    .join('');

  const subheads = (lp.subheadlines ?? [])
    .map((h, i) => `
      <div class="copy-item avoid-break">
        <div class="copy-item-number">Option ${i + 1}</div>
        <div style="font-size:11pt;">${escHtml(h)}</div>
      </div>`)
    .join('');

  const bullets = (lp.featureBullets ?? [])
    .map((b) => `<li>${escHtml(b)}</li>`)
    .join('');

  const shortCTAs = (lp.shortCTAs ?? [])
    .map((c) => `<span class="tag" style="font-weight:600;">${escHtml(c)}</span>`)
    .join(' ');

  const longCTAs = (lp.longCTAs ?? [])
    .map((c, i) => `
      <div class="card avoid-break" style="border-left:3pt solid var(--brand-primary);">
        <div class="card-label">Option ${i + 1}</div>
        <div style="font-size:12pt; font-weight:700; margin-bottom:4pt; color:var(--text-primary);">${escHtml(c.button)}</div>
        <div style="color:#6B7280; font-size:10pt;">${escHtml(c.supporting)}</div>
      </div>`)
    .join('');

  const sectionOrder = (lp.sectionOrder ?? [])
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

      <h3 style="margin-top:12pt;">Short CTAs (Button Labels)</h3>
      <div style="margin-bottom:14pt;">${shortCTAs}</div>

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
  const xPosts = (copy.socialPosts?.twitter ?? [])
    .map((p, i) => `
      <div class="post-bubble avoid-break">
        <div class="post-platform">X / Twitter · Post ${i + 1}</div>
        <div style="white-space:pre-wrap;">${escHtml(String(p))}</div>
        <div class="post-char-count">${String(p).length} chars</div>
      </div>`)
    .join('');

  const liPosts = (copy.socialPosts?.linkedin ?? [])
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

  const emailCards = (copy.emails ?? [])
    .map((e) => `
      <div class="email-card avoid-break">
        <div class="email-header">${escHtml(emailTypeLabel[e.type] ?? e.type)}</div>
        <div class="email-meta">
          <div class="email-meta-row">
            <span class="email-meta-label">Subject A:</span>
            <span style="font-weight:600;">${escHtml(e.subjectA)}</span>
          </div>
          <div class="email-meta-row">
            <span class="email-meta-label">Subject B:</span>
            <span style="color:#6B7280;">${escHtml(e.subjectB)}</span>
          </div>
          <div class="email-meta-row">
            <span class="email-meta-label">Preview:</span>
            <span style="color:#6B7280; font-size:9pt; font-style:italic;">${escHtml(e.previewText)}</span>
          </div>
        </div>
        <div class="email-body">${renderMarkdown(e.body)}</div>
        <div class="email-cta">
          <span class="tag" style="font-weight:600;">${escHtml(e.ctaLabel)}</span>
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
      <p style="color:#6B7280; font-size:9pt; margin-bottom:14pt;">Three send-ready emails. Paste into any email tool. Send in order: launch → +3 days value → +7 days last-call.</p>
      ${emailCards}
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 6 (Pro): 4-Week Content Sprint ────────────────────────────────────

export function renderContentPlan(copy: PdfProCopy, productName: string): string {
  const sprints = (copy.contentPlan?.weeklySprints ?? [])
    .map((sprint) => {
      const postsHtml = (sprint.posts ?? []).map((post) => `
        <tr class="avoid-break">
          <td>${escHtml(post.title)}</td>
          <td style="width:72pt;"><span class="tag">${escHtml(post.postType)}</span></td>
          <td style="width:62pt;color:#6B7280;">${escHtml(post.channel)}</td>
          <td style="color:#6B7280;">${escHtml(post.intent)}</td>
        </tr>
      `).join('');

      return `
        <h3 style="margin-top:16pt;color:var(--brand-primary);">Week ${sprint.week}: ${escHtml(sprint.theme)}</h3>
        <table style="margin-top:8pt;">
          <thead>
            <tr><th>Hook / Title</th><th>Type</th><th>Channel</th><th>Intent</th></tr>
          </thead>
          <tbody>${postsHtml}</tbody>
        </table>
      `;
    })
    .join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§6 · 4-Week Content Sprint</span>
      </div>
      <h2>4-Week Content Sprint</h2>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:8pt;">A curriculum structured into weekly themes.</p>
      ${sprints}
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 7 (Pro): Ad Copy Angles ─────────────────────────────────────────

export function renderAdCopy(copy: PdfProCopy, productName: string): string {
  const adCards = (copy.adCopy ?? [])
    .map((ad, i) => `
      <div class="card avoid-break">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8pt;">
          <div class="card-label" style="margin-bottom:0;">Angle ${i + 1}</div>
          <div style="display:flex;gap:4pt;">
            <span style="background:#EEF2FF;color:#4F46E5;padding:2pt 7pt;border-radius:20pt;font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${escHtml(ad.angle)}</span>
            <span style="background:#FDF4FF;color:#7C3AED;padding:2pt 7pt;border-radius:20pt;font-size:7.5pt;font-weight:600;font-style:italic;">${escHtml(ad.emotion)}</span>
          </div>
        </div>
        <div style="margin-bottom:6pt;">
          <div style="font-size:8.5pt; color:#6B7280; margin-bottom:2pt;">Headline <span style="color:var(--text-muted);">(≤40 chars)</span></div>
          <div style="font-weight:700; font-size:13pt; color:var(--text-primary);">${escHtml(ad.headline)}</div>
        </div>
        <div style="margin-bottom:6pt;">
          <div style="font-size:8.5pt; color:#6B7280; margin-bottom:2pt;">Body <span style="color:var(--text-muted);">(≤125 chars)</span></div>
          <div style="font-size:10pt;">${escHtml(ad.body)}</div>
        </div>
        <div>
          <div style="font-size:8.5pt; color:#6B7280; margin-bottom:3pt;">CTA <span style="color:var(--text-muted);">(≤20 chars)</span></div>
          <span class="tag" style="font-weight:700;">${escHtml(ad.cta)}</span>
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

/** Trim a string to at most `limit` chars, cutting at the last word boundary. */
function trimToLimit(raw: string, limit: number): string {
  const s = raw.trim();
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit).replace(/\s+\S*$/, '');
  return cut.length > 0 ? cut : s.slice(0, limit);
}

function charBadge(len: number, limit: number): string {
  return `<span class="char-ok">${len}/${limit} chars ✓</span>`;
}

export function renderAppStoreCopy(copy: PdfProCopy, productName: string): string {
  const as = copy.appStoreCopy ?? { subtitles: [], shortDescriptions: [], longDescription: '', keywords: [] };

  const subtitles = (as.subtitles ?? [])
    .map((s) => trimToLimit(String(s), 30))
    .map((s, i) => `
      <div class="copy-item avoid-break">
        <div class="copy-item-number">Option ${i + 1} · ${charBadge(s.length, 30)}</div>
        <div style="font-size:12pt; font-weight:600;">${escHtml(s)}</div>
      </div>`)
    .join('');

  const shorts = (as.shortDescriptions ?? [])
    .map((s) => trimToLimit(String(s), 80))
    .map((s, i) => `
      <div class="copy-item avoid-break">
        <div class="copy-item-number">Option ${i + 1} · ${charBadge(s.length, 80)}</div>
        <div style="font-size:11pt;">${escHtml(s)}</div>
      </div>`)
    .join('');

  const keywords = (as.keywords ?? []).map((k) => `<span class="tag">${escHtml(String(k))}</span>`).join(' ');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§8 · App Store Copy</span>
      </div>
      <h2>App Store / Listing Copy</h2>

      <h3>Subtitle Options <span style="font-weight:400;color:#6B7280;font-size:10pt;">(≤30 chars)</span></h3>
      ${subtitles}

      <h3 style="margin-top:12pt;">Short Descriptions <span style="font-weight:400;color:#6B7280;font-size:10pt;">(≤80 chars)</span></h3>
      ${shorts}

      <h3 style="margin-top:12pt;">Long Description</h3>
      <div class="card" style="white-space:pre-wrap; font-size:9pt; line-height:1.6; color:#374151;">${escHtml(as.longDescription ?? '')}</div>

      <h3 style="margin-top:12pt;">Keyword Suggestions</h3>
      <div style="margin-top:4pt;">${keywords}</div>
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 9 (Pro): Tone of Voice ──────────────────────────────────────────

export function renderToneOfVoice(copy: PdfProCopy, productName: string): string {
  const dos = (copy.toneOfVoice?.dos ?? []).map((d) => `<li>${escHtml(String(d))}</li>`).join('');
  const donts = (copy.toneOfVoice?.donts ?? []).map((d) => `<li>${escHtml(String(d))}</li>`).join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§9 · Tone-of-Voice Cheat Sheet</span>
      </div>
      <h2>Tone-of-Voice Cheat Sheet</h2>

      <div class="callout avoid-break" style="margin-bottom:14pt;">
        <p>${escHtml(copy.toneOfVoice?.summary ?? '')}</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12pt;">
        <div class="card" style="border-top:3pt solid #059669;">
          <div class="card-label" style="color:#059669;">Do ✓</div>
          <ul style="margin-top:6pt;">${dos}</ul>
        </div>
        <div class="card" style="border-top:3pt solid #DC2626;">
          <div class="card-label" style="color:#DC2626;">Don't ✗</div>
          <ul style="margin-top:6pt;">${donts}</ul>
        </div>
      </div>

      <h3 style="margin-top:14pt;">Sample Paragraph</h3>
      <div class="card" style="background:var(--brand-primary-light);border-color:#C7D2FE;">
        <div class="card-label" style="color:#4338CA;">Example copy in your tone</div>
        <p style="margin-top:6pt; font-size:11pt; line-height:1.7; white-space:pre-wrap; color:#1E1B4B;">${escHtml(copy.toneOfVoice?.sampleParagraph ?? '')}</p>
      </div>
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 10: Community Strategy ──────────────────────────────────────────

export function renderCommunityStrategy(copy: PdfProCopy, productName: string): string {
  const c = copy.communityStrategy;
  const subreddits = (c?.subreddits ?? []).map((s) => `<li>${escHtml(s)}</li>`).join('');
  const groups = (c?.discordFacebook ?? []).map((g) => `<li>${escHtml(g)}</li>`).join('');

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§10 · Community & Growth Strategy</span>
      </div>
      <h2>Community & Growth Strategy</h2>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:14pt;">Where to find your first 100 users and how to talk to them.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12pt;margin-bottom:12pt;">
        <div class="card">
          <div class="card-label">Target Subreddits</div>
          <ul style="margin-top:4pt;">${subreddits}</ul>
        </div>
        <div class="card">
          <div class="card-label">Discord / Facebook Groups</div>
          <ul style="margin-top:4pt;">${groups}</ul>
        </div>
      </div>

      <h3>Community Posting Script</h3>
      <div class="card avoid-break" style="border-left:3pt solid var(--brand-primary);">
        <div class="card-label">How to post without sounding spammy</div>
        <p style="font-size:10pt; line-height:1.6; white-space:pre-wrap; margin-top:4pt;">${escHtml(c?.postScript ?? '')}</p>
      </div>

      <h3 style="margin-top:14pt;">Beta-Tester Outreach</h3>
      <div class="card avoid-break" style="border-left:3pt solid #7C3AED;">
        <div class="card-label">Email/DM Template to gather testimonials</div>
        <p style="font-size:10pt; line-height:1.6; white-space:pre-wrap; margin-top:4pt;">${escHtml(copy.betaTesterScript ?? '')}</p>
      </div>
    </div>
    <div class="page-break"></div>
  `;
}

// ─── Section 11: Visual Direction ──────────────────────────────────────────

export function renderVisualDirection(copy: PdfProCopy, productName: string): string {
  const v = copy.visualDirection;

  return `
    <div class="page">
      <div class="page-header">
        <span class="page-header-product">${escHtml(productName)}</span>
        <span class="page-header-section">§11 · Visual Direction</span>
      </div>
      <h2>Visual Direction & Aesthetic Brief</h2>
      <p style="color:#6B7280; font-size:9pt; margin-bottom:14pt;">The artistic foundation for your screenshots, ads, and social media.</p>

      <div class="card avoid-break" style="border-top:3pt solid var(--brand-primary);">
        <div class="card-label">Color Palette & Vibe</div>
        <p style="font-size:11pt; font-weight:500; margin-bottom:0;">${escHtml(v?.colorPalette ?? '')}</p>
      </div>

      <div class="card avoid-break" style="margin-top:10pt;border-top:3pt solid #7C3AED;">
        <div class="card-label">Imagery Style</div>
        <p style="font-size:10pt; line-height:1.6; margin-bottom:0;">${escHtml(v?.imageryStyle ?? '')}</p>
      </div>

      <div class="callout avoid-break" style="margin-top:14pt;">
        <p style="font-size:10pt;"><strong>Pro Tip:</strong> Use these exact descriptions as prompts in Midjourney or any AI image tool to generate on-brand assets with a consistent look and feel across all your channels.</p>
      </div>
    </div>
    <div class="page-break"></div>
  `;
}
