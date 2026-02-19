import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getRun, updateRun } from '@/lib/db';
import {
  executeOrchestrationRun,
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

  if (run.status !== 'failed') {
    return NextResponse.json(
      { error: 'Only failed runs can be retried', runId, status: run.status },
      { status: 400 }
    );
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
    const result = await executeOrchestrationRun({
      runId,
      input: mergedInput,
      requestUrl: request.url,
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
