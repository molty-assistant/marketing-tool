/**
 * PDF generation pipeline — orchestrates 6 sequential steps for a paid order.
 * Follows the same pattern as src/lib/orchestrator.ts.
 *
 * Steps: scrape → generate-positioning → generate-copy → render-html → render-pdf → quality-check
 */

import fs from 'fs';
import path from 'path';
import {
  getPdfOrder,
  updatePdfOrder,
  transitionPdfOrderStatus,
  createPdfGenerationRun,
  updatePdfGenerationRun,
  getLatestPdfGenerationRun,
  savePdfDocument,
  type PdfOrderRow,
  type PdfGenerationRunRow,
} from '@/lib/db';
import { scrapeUrl } from '@/lib/scraper';
import type { ScrapedApp } from '@/lib/types';
import { generatePdfPositioning, generatePdfCopy, type PdfPositioning } from '@/lib/pdf-prompts';
import { renderPdfHtml } from '@/lib/pdf-templates/render';
import { renderPdf } from '@/lib/pdf-renderer';

const MAX_PIPELINE_MS = 295_000;

// Ensure PDF output directory exists
const PDF_DIR = path.join(process.cwd(), 'data', 'pdfs');
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

export type PdfStepId =
  | 'scrape'
  | 'generate-positioning'
  | 'generate-copy'
  | 'render-html'
  | 'render-pdf'
  | 'quality-check';

export type PdfStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface PdfStepState {
  id: PdfStepId;
  label: string;
  status: PdfStepStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface PdfPipelineResult {
  runId: string;
  status: 'done' | 'failed';
  steps: PdfStepState[];
  lastError: string | null;
  filePath?: string;
}

const STEP_LABELS: Record<PdfStepId, string> = {
  'scrape': 'Analysing your product',
  'generate-positioning': 'Building your positioning',
  'generate-copy': 'Writing your content',
  'render-html': 'Laying out your PDF',
  'render-pdf': 'Generating PDF',
  'quality-check': 'Quality check',
};

const STEP_ORDER: PdfStepId[] = [
  'scrape',
  'generate-positioning',
  'generate-copy',
  'render-html',
  'render-pdf',
  'quality-check',
];

function buildInitialSteps(): PdfStepState[] {
  return STEP_ORDER.map((id) => ({ id, label: STEP_LABELS[id], status: 'pending' as const }));
}

function markStep(steps: PdfStepState[], id: PdfStepId, status: PdfStepStatus, error?: string): PdfStepState[] {
  return steps.map((s) => {
    if (s.id !== id) return s;
    return {
      ...s,
      status,
      startedAt: status === 'running' ? new Date().toISOString() : s.startedAt,
      finishedAt: (status === 'done' || status === 'failed') ? new Date().toISOString() : s.finishedAt,
      error: error ?? s.error,
    };
  });
}

/**
 * Run (or resume) the PDF generation pipeline for an order.
 * Safe to call multiple times — idempotent if already 'done'.
 */
export async function runPdfPipeline(orderId: string): Promise<PdfPipelineResult> {
  const order = getPdfOrder(orderId);
  if (!order) throw new Error(`Order not found: ${orderId}`);

  // Already done — return success without re-running
  if (order.status === 'ready') {
    const existingRun = getLatestPdfGenerationRun(orderId);
    const steps = existingRun ? (JSON.parse(existingRun.steps_json) as PdfStepState[]) : buildInitialSteps();
    const filePath = path.join(PDF_DIR, `${orderId}.pdf`);
    return { runId: existingRun?.id ?? '', status: 'done', steps, lastError: null, filePath };
  }

  // Determine attempt number
  const existingRun = getLatestPdfGenerationRun(orderId);
  const attempt = existingRun ? existingRun.attempt + 1 : 1;

  // Atomically claim this order for generation — prevents concurrent pipeline runs
  const claimed = transitionPdfOrderStatus(orderId, ['paid', 'failed'], 'generating');
  if (!claimed) {
    // Another process already started (or order is in wrong state)
    const current = getPdfOrder(orderId);
    if (current?.status === 'ready') {
      const existingRun2 = getLatestPdfGenerationRun(orderId);
      const steps2 = existingRun2 ? (JSON.parse(existingRun2.steps_json) as PdfStepState[]) : buildInitialSteps();
      return { runId: existingRun2?.id ?? '', status: 'done', steps: steps2, lastError: null };
    }
    return { runId: '', status: 'failed', steps: buildInitialSteps(), lastError: 'Generation already in progress' };
  }

  const run = createPdfGenerationRun(orderId, attempt);
  let steps = buildInitialSteps();

  const startMs = Date.now();

  // Shared pipeline context
  let scraped: ScrapedApp;
  let positioning: PdfPositioning;
  let copy: unknown;
  let html: string;

  const intake = JSON.parse(order.intake_json || '{}') as Record<string, unknown>;

  try {
    // ── Step: scrape ──────────────────────────────────────────────────────────
    steps = markStep(steps, 'scrape', 'running');
    updatePdfGenerationRun(run.id, { currentStep: 'scrape', stepsJson: JSON.stringify(steps) });

    if (Date.now() - startMs > MAX_PIPELINE_MS) throw new Error('Pipeline timeout before scrape');
    scraped = await scrapeUrl(order.product_url);

    steps = markStep(steps, 'scrape', 'done');
    updatePdfGenerationRun(run.id, { stepsJson: JSON.stringify(steps) });

    // ── Step: generate-positioning ────────────────────────────────────────────
    steps = markStep(steps, 'generate-positioning', 'running');
    updatePdfGenerationRun(run.id, { currentStep: 'generate-positioning', stepsJson: JSON.stringify(steps) });

    if (Date.now() - startMs > MAX_PIPELINE_MS) throw new Error('Pipeline timeout before positioning');
    positioning = await generatePdfPositioning(scraped as unknown as Record<string, unknown>, intake);

    steps = markStep(steps, 'generate-positioning', 'done');
    updatePdfGenerationRun(run.id, { stepsJson: JSON.stringify(steps) });

    // ── Step: generate-copy ───────────────────────────────────────────────────
    steps = markStep(steps, 'generate-copy', 'running');
    updatePdfGenerationRun(run.id, { currentStep: 'generate-copy', stepsJson: JSON.stringify(steps) });

    if (Date.now() - startMs > MAX_PIPELINE_MS) throw new Error('Pipeline timeout before copy');
    copy = await generatePdfCopy(scraped as unknown as Record<string, unknown>, intake, positioning, order.tier);

    steps = markStep(steps, 'generate-copy', 'done');
    updatePdfGenerationRun(run.id, { stepsJson: JSON.stringify(steps) });

    // ── Step: render-html ─────────────────────────────────────────────────────
    steps = markStep(steps, 'render-html', 'running');
    updatePdfGenerationRun(run.id, { currentStep: 'render-html', stepsJson: JSON.stringify(steps) });

    if (Date.now() - startMs > MAX_PIPELINE_MS) throw new Error('Pipeline timeout before render-html');
    html = renderPdfHtml({ order, scraped: scraped as unknown as Record<string, unknown>, positioning, copy });

    steps = markStep(steps, 'render-html', 'done');
    updatePdfGenerationRun(run.id, { stepsJson: JSON.stringify(steps) });

    // ── Step: render-pdf ──────────────────────────────────────────────────────
    steps = markStep(steps, 'render-pdf', 'running');
    updatePdfGenerationRun(run.id, { currentStep: 'render-pdf', stepsJson: JSON.stringify(steps) });

    if (Date.now() - startMs > MAX_PIPELINE_MS) throw new Error('Pipeline timeout before render-pdf');
    const outputPath = path.join(PDF_DIR, `${orderId}.pdf`);
    const { fileSize, pageCount } = await renderPdf(html, outputPath);

    steps = markStep(steps, 'render-pdf', 'done');
    updatePdfGenerationRun(run.id, { stepsJson: JSON.stringify(steps) });

    // ── Step: quality-check ───────────────────────────────────────────────────
    steps = markStep(steps, 'quality-check', 'running');
    updatePdfGenerationRun(run.id, { currentStep: 'quality-check', stepsJson: JSON.stringify(steps) });

    const qcError = runQualityCheck({ outputPath, fileSize, pageCount, tier: order.tier, html, scraped: scraped as unknown as { name?: string } & Record<string, unknown> });
    if (qcError) throw new Error(`Quality check failed: ${qcError}`);

    steps = markStep(steps, 'quality-check', 'done');
    updatePdfGenerationRun(run.id, {
      status: 'done',
      currentStep: null,
      stepsJson: JSON.stringify(steps),
      completedAt: new Date().toISOString(),
    });

    // Save document record BEFORE marking order ready — if this fails, order stays at 'generating'
    // rather than being marked 'ready' with no document
    savePdfDocument({ orderId, runId: run.id, filePath: outputPath, fileSize, pageCount });
    updatePdfOrder(orderId, { status: 'ready' });

    return { runId: run.id, status: 'done', steps, lastError: null, filePath: outputPath };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failedStep = steps.find((s) => s.status === 'running');

    if (failedStep) {
      steps = markStep(steps, failedStep.id, 'failed', message);
    }

    updatePdfGenerationRun(run.id, {
      status: 'failed',
      stepsJson: JSON.stringify(steps),
      lastError: message,
      completedAt: new Date().toISOString(),
    });
    updatePdfOrder(orderId, { status: 'failed' });

    return { runId: run.id, status: 'failed', steps, lastError: message };
  }
}

interface QualityCheckInput {
  outputPath: string;
  fileSize: number;
  pageCount: number;
  tier: PdfOrderRow['tier'];
  html: string;
  scraped: { name?: string } & Record<string, unknown>;
}

function runQualityCheck(input: QualityCheckInput): string | null {
  const { fileSize, pageCount, tier, html, scraped } = input;

  if (fileSize < 50_000) return `PDF too small: ${fileSize} bytes (min 50KB)`;
  if (fileSize > 10_000_000) return `PDF too large: ${fileSize} bytes (max 10MB)`;

  const [minPages, maxPages] = tier === 'basic' ? [9, 11] : [19, 25];
  if (pageCount < minPages || pageCount > maxPages) {
    return `Page count ${pageCount} outside expected range ${minPages}-${maxPages} for ${tier} tier`;
  }

  const placeholderPatterns = [/\[TODO\]/i, /\{\{[^}]+\}\}/, /PLACEHOLDER/i];
  for (const pattern of placeholderPatterns) {
    if (pattern.test(html)) return `HTML contains placeholder text matching ${pattern}`;
  }

  const productName = scraped.name as string | undefined;
  if (productName && !html.includes(productName)) {
    return `PDF does not contain the product name "${productName}"`;
  }

  return null;
}
