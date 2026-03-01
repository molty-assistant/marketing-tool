/**
 * Composes the full PDF HTML document from positioning + copy data.
 * Basic tier: 9-11 pages. Pro tier: 19-25 pages.
 */

import { baseStyles, coverPage, tocPage, nextStepsPage } from './base-layout';
import {
  renderPositioning,
  renderCompetitors,
  renderLandingPageCopy,
  renderSocialPosts,
  renderEmails,
  renderContentPlan,
  renderAdCopy,
  renderAppStoreCopy,
  renderToneOfVoice,
} from './section-renderers';
import type { PdfPositioning, PdfBasicCopy, PdfProCopy } from '@/lib/pdf-prompts';
import type { PdfOrderRow } from '@/lib/db';

export interface RenderPdfHtmlInput {
  order: PdfOrderRow;
  scraped: { name?: string; url?: string } & Record<string, unknown>;
  positioning: unknown;
  copy: unknown;
}

export function renderPdfHtml(input: RenderPdfHtmlInput): string {
  const { order, scraped } = input;
  const positioning = input.positioning as PdfPositioning;
  const basicCopy = input.copy as PdfBasicCopy;
  const proCopy = order.tier === 'pro' ? (input.copy as PdfProCopy) : null;

  const productName = (scraped.name as string | undefined) ?? 'Your Product';
  const productUrl = order.product_url;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Build TOC entries
  const basicToc = [
    { number: '1', title: 'Positioning Snapshot', pages: '2' },
    { number: '2', title: 'Competitor Angles', pages: '1' },
    { number: '3', title: 'Landing Page Copy', pages: '3' },
    { number: '4', title: 'Social Launch Posts', pages: '2' },
  ];

  const proToc = [
    ...basicToc,
    { number: '5', title: 'Email Sequence', pages: '2–3' },
    { number: '6', title: '30-Day Content Plan', pages: '2–3' },
    { number: '7', title: 'Ad Copy Angles', pages: '1–2' },
    { number: '8', title: 'App Store / Listing Copy', pages: '1' },
    { number: '9', title: 'Tone-of-Voice Cheat Sheet', pages: '1' },
  ];

  const toc = order.tier === 'pro' ? proToc : basicToc;

  // Compose sections
  const sections: string[] = [
    coverPage({ productName, productUrl, tier: order.tier, date }),
    tocPage(toc),
    renderPositioning(positioning, productName),
    renderCompetitors(
      basicCopy,
      productName,
      proCopy?.opportunityGaps
    ),
    renderLandingPageCopy(
      basicCopy,
      productName,
      proCopy?.socialProofSuggestions
    ),
    renderSocialPosts(basicCopy, productName),
  ];

  if (proCopy) {
    sections.push(
      renderEmails(proCopy, productName),
      renderContentPlan(proCopy, productName),
      renderAdCopy(proCopy, productName),
      renderAppStoreCopy(proCopy, productName),
      renderToneOfVoice(proCopy, productName)
    );
  }

  sections.push(nextStepsPage(order.tier, productName));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${productName} — Marketing Plan</title>
  <style>${baseStyles()}</style>
</head>
<body>
  ${sections.join('\n')}
</body>
</html>`;
}
