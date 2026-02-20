import { NextRequest, NextResponse } from 'next/server';
import { createRun, getPlan, updateRun } from '@/lib/db';
import { requireOrchestratorAuth } from '@/lib/auth-guard';
import {
  buildInitialSteps,
  executeOrchestrationRun,
  internalBaseUrl,
  getForwardedInternalAuthHeaders,
  normalizeOrchestratePackInput,
  type OrchestratePackInput,
} from '@/lib/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const unauthorizedResponse = requireOrchestratorAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let runId: string | null = null;

  try {
    const body = (await request.json()) as Partial<OrchestratePackInput>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const normalizedInput = normalizeOrchestratePackInput({
      planId,
      goal: typeof body.goal === 'string' ? body.goal : undefined,
      tone: typeof body.tone === 'string' ? body.tone : undefined,
      channels: Array.isArray(body.channels)
        ? body.channels.filter((v): v is string => typeof v === 'string')
        : undefined,
      includeVideo: Boolean(body.includeVideo),
    });

    const run = createRun({
      planId,
      status: 'running',
      currentStep: null,
      stepsJson: JSON.stringify(buildInitialSteps(normalizedInput.includeVideo)),
      inputJson: JSON.stringify(normalizedInput),
      outputRefsJson: '{}',
      lastError: null,
    });

    runId = run.id;

    const baseUrl = internalBaseUrl();
    const internalAuthHeaders = getForwardedInternalAuthHeaders(request.headers);

    const result = await executeOrchestrationRun({
      runId,
      input: normalizedInput,
      baseUrl,
      internalAuthHeaders,
    });

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      currentStep: result.currentStep,
      lastError: result.lastError,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';

    if (runId) {
      updateRun(runId, {
        status: 'failed',
        currentStep: null,
        lastError: msg,
      });
    }

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
