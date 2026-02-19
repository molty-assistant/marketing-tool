import { NextResponse } from 'next/server';
import { getRun } from '@/lib/db';
import {
  normalizeOrchestratePackInput,
  parseRunInputJson,
  parseRunOutputRefsJson,
  parseRunStepsJson,
} from '@/lib/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function toIsoTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stepsIncludeVideo(stepsJson: string): boolean {
  try {
    const parsed = JSON.parse(stepsJson);
    return Array.isArray(parsed) && parsed.some((item) => item?.id === 'generate-video');
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = getRun(runId);

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const parsedInput = parseRunInputJson(run.input_json);
  const normalizedInput = normalizeOrchestratePackInput({
    planId: parsedInput.planId || run.plan_id,
    goal: parsedInput.goal,
    tone: parsedInput.tone,
    channels: parsedInput.channels,
    includeVideo: parsedInput.includeVideo,
  });

  const includeVideo = normalizedInput.includeVideo || stepsIncludeVideo(run.steps_json);
  const steps = parseRunStepsJson(run.steps_json, includeVideo);
  const outputRefs = parseRunOutputRefsJson(run.output_refs_json);

  return NextResponse.json({
    runId: run.id,
    planId: run.plan_id,
    status: run.status,
    currentStep: run.current_step,
    lastError: run.last_error,
    steps,
    outputRefs,
    createdAt: toIsoTimestamp(run.created_at),
    updatedAt: toIsoTimestamp(run.updated_at),
  });
}
