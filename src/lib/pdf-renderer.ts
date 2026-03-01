/**
 * Playwright-based PDF renderer for the pay-once PDF pipeline.
 * Uses page.setContent() with the pre-generated HTML string (no network fetch).
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';

export interface RenderPdfResult {
  fileSize: number;
  /** Estimated from page-break count in the HTML */
  pageCount: number;
}

/**
 * Render the given HTML string to a PDF file saved at outputPath.
 * Returns file size in bytes and estimated page count.
 */
export async function renderPdf(html: string, outputPath: string): Promise<RenderPdfResult> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // setContent is preferred over goto() when we own the HTML
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 });

    // Brief pause to let any CSS animations or font swaps settle
    await page.waitForTimeout(500);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      preferCSSPageSize: true,
    });

    await fs.writeFile(outputPath, pdfBuffer);

    const fileSize = pdfBuffer.length;

    // Estimate page count by counting explicit page breaks in the source HTML.
    // Each <div class="page-break"> separates pages; final page has no break after it.
    const breakMatches = html.match(/class="page-break"/g);
    const pageCount = breakMatches ? breakMatches.length + 1 : 1;

    return { fileSize, pageCount };
  } finally {
    try {
      await browser?.close();
    } catch {
      // ignore cleanup errors
    }
  }
}
