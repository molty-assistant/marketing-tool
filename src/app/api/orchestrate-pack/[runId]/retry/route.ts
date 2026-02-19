import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPlan, getRun, updateRun } from '@/lib/db';
import {
  executeOrchestrationRun,
  getBaseUrlFromHeaders,
  getForwardedInternalAuthHeaders,
  parseRunInputJson,
  type OrchestratePackInput,
} from '@/lib/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = getRun(runId);

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const updatedAtMs = run.updated_at ? new Date(run.updated_at + 'Z').getTime() : 0;
  const isStaleRunning =
    run.status === 'running' && updatedAtMs && Date.now() - updatedAtMs > 10 * 60 * 1000;

  if (run.status !== 'failed' && !isStaleRunning) {
    return NextResponse.json(
      {
        error: 'Only failed runs can be retried (or stale running runs)',
        runId,
        status: run.status,
      },
      { status: 400 }
    );
  }

  // Atomic swap: prevent concurrent retries
  const db = getDb();
  const swap = db
    .prepare(
      "UPDATE orchestration_runs SET status = 'running', updated_at = datetime('now') WHERE id = ? AND status IN ('failed','running')"
    )
    .run(runId);

  if (swap.changes === 0) {
    return NextResponse.json({ error: 'Run is already being executed', runId }, { status: 409 });
  }

  let body: Partial<OrchestratePackInput> = {};
  try {
    body = (await request.json()) as Partial<OrchestratePackInput>;
  } catch {
    // Optional body
  }

  const previousInput = parseRunInputJson(run.input_json);
  const mergedInput: OrchestratePackInput = {
    planId: previousInput.planId || run.plan_id,
    goal: typeof body.goal === 'string' ? body.goal : previousInput.goal,
    tone: typeof body.tone === 'string' ? body.tone : previousInput.tone,
    channels: Array.isArray(body.channels)
      ? body.channels.filter((v): v is string => typeof v === 'string')
      : previousInput.channels,
    includeVideo:
      typeof body.includeVideo === 'boolean' ? body.includeVideo : previousInput.includeVideo,
  };

  if (!mergedInput.planId) {
    return NextResponse.json({ error: 'Run input missing planId', runId }, { status: 400 });
  }

  const row = getPlan(mergedInput.planId);
  if (!row) {
    return NextResponse.json({ error: 'Plan not found for run retry', runId }, { status: 404 });
  }

  try {
    const internalBaseUrl = getBaseUrlFromHeaders(request.headers);
    const internalAuthHeaders = getForwardedInternalAuthHeaders(request.headers);

    const result = await executeOrchestrationRun({
      runId,
      input: mergedInput,
      internalBaseUrl,
      internalAuthHeaders,
      resumeFromFailed: true,
    });

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      currentStep: result.currentStep,
      lastError: result.lastError,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';

    updateRun(runId, {
      status: 'failed',
      currentStep: null,
      lastError: msg,
    });

    return NextResponse.json(
      {
        error: msg,
        runId,
        status: 'failed',
      },
      { status: 500 }
    );
  }
}
