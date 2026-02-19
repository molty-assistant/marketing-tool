import {
  getPlanContent,
  getRun,
  saveContent,
  updatePlanContent,
  updateRun,
  type OrchestrationRunStatus,
} from '@/lib/db';
import {
  atomizeContent,
  generateBrandVoice,
  generateCompetitiveAnalysis,
  generateDraft,
  generateEmailsSequence,
  generatePositioningAngles,
  generateTranslations,
  type SupportedLanguage,
} from '@/lib/pipeline';

const MAX_ORCHESTRATION_MS = 295_000;

const VALID_TONES = ['professional', 'casual', 'bold', 'minimal'] as const;
type Tone = (typeof VALID_TONES)[number];
type EmailSequenceType = 'welcome' | 'launch' | 'nurture';

export type OrchestrationStepId =
  | 'brand-voice'
  | 'positioning-angles'
  | 'competitive-analysis'
  | 'generate-draft'
  | 'generate-emails'
  | 'atomize-content'
  | 'generate-translations'
  | 'generate-video';

export type OrchestrationStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface OrchestrationStepState {
  id: OrchestrationStepId;
  label: string;
  status: OrchestrationStepStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface OrchestratePackInput {
  planId: string;
  goal?: string | null;
  tone?: string;
  channels?: string[];
  includeVideo?: boolean;
}

export interface NormalizedOrchestratePackInput {
  planId: string;
  goal: string | null;
  tone: Tone;
  channels: string[];
  includeVideo: boolean;
}

export interface ExecuteOrchestrationResult {
  runId: string;
  status: OrchestrationRunStatus;
  currentStep: string | null;
  lastError: string | null;
  steps: OrchestrationStepState[];
  outputRefs: Record<string, unknown>;
}

type HeaderValueReader = Pick<Headers, 'get'>;

const BASE_STEPS: Array<{ id: Exclude<OrchestrationStepId, 'generate-video'>; label: string }> = [
  { id: 'brand-voice', label: 'Brand Voice' },
  { id: 'positioning-angles', label: 'Positioning Angles' },
  { id: 'competitive-analysis', label: 'Competitive Analysis' },
  { id: 'generate-draft', label: 'Draft Copy' },
  { id: 'generate-emails', label: 'Email Sequence' },
  { id: 'atomize-content', label: 'Atomize Content' },
  { id: 'generate-translations', label: 'Translations' },
];

const STEP_ESTIMATE_MS: Record<OrchestrationStepId, number> = {
  'brand-voice': 25_000,
  'positioning-angles': 20_000,
  'competitive-analysis': 35_000,
  'generate-draft': 30_000,
  'generate-emails': 25_000,
  'atomize-content': 40_000,
  'generate-translations': 35_000,
  'generate-video': 15_000,
};

export function normalizeOrchestratePackInput(input: OrchestratePackInput): NormalizedOrchestratePackInput {
  const tone =
    typeof input.tone === 'string' && (VALID_TONES as readonly string[]).includes(input.tone)
      ? (input.tone as Tone)
      : 'bold';

  const channels = Array.isArray(input.channels)
    ? Array.from(
        new Set(
          input.channels
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim().toLowerCase())
            .filter((v) => v.length > 0)
        )
      )
    : [];

  const goal = typeof input.goal === 'string' && input.goal.trim().length > 0 ? input.goal.trim() : null;

  return {
    planId: input.planId,
    goal,
    tone,
    channels,
    includeVideo: Boolean(input.includeVideo),
  };
}

export function buildInitialSteps(includeVideo: boolean): OrchestrationStepState[] {
  const steps: OrchestrationStepState[] = BASE_STEPS.map((s) => ({
    ...s,
    status: 'pending',
  }));
  if (includeVideo) {
    steps.push({ id: 'generate-video', label: 'Video Kickoff', status: 'pending' });
  }
  return steps;
}

function parseSteps(
  stepsJson: string,
  includeVideo: boolean
): OrchestrationStepState[] {
  const defaults = buildInitialSteps(includeVideo);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stepsJson);
  } catch {
    return defaults;
  }

  if (!Array.isArray(parsed)) {
    return defaults;
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as Record<string, unknown>).id;
    if (typeof id === 'string') {
      byId.set(id, item as Record<string, unknown>);
    }
  }

  return defaults.map((d) => {
    const prev = byId.get(d.id);
    if (!prev) return d;

    const status = prev.status;
    const startedAt = prev.startedAt;
    const finishedAt = prev.finishedAt;
    const error = prev.error;

    return {
      id: d.id,
      label: d.label,
      status:
        status === 'pending' || status === 'running' || status === 'done' || status === 'failed'
          ? status
          : 'pending',
      startedAt: typeof startedAt === 'string' ? startedAt : undefined,
      finishedAt: typeof finishedAt === 'string' ? finishedAt : undefined,
      error: typeof error === 'string' ? error : undefined,
    };
  });
}

function parseOutputRefs(outputRefsJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(outputRefsJson);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
}

export function internalBaseUrl(): string {
  // Safe for server-to-server fetches within this Next.js process.
  // Do NOT derive from request headers (SSRF risk).
  const port = process.env.PORT ?? '3000';
  return `http://localhost:${port}`;
}

export function getForwardedInternalAuthHeaders(headers: HeaderValueReader): Record<string, string> {
  const forwarded: Record<string, string> = {};

  const authorization = headers.get('authorization');
  if (authorization) {
    forwarded.authorization = authorization;
  }

  const apiKey = headers.get('x-api-key');
  if (apiKey) {
    forwarded['x-api-key'] = apiKey;
  }

  const cookie = headers.get('cookie');
  if (cookie) {
    forwarded.cookie = cookie;
  }

  return forwarded;
}

export function parseRunStepsJson(stepsJson: string, includeVideo: boolean): OrchestrationStepState[] {
  return parseSteps(stepsJson, includeVideo);
}

export function parseRunOutputRefsJson(outputRefsJson: string): Record<string, unknown> {
  return parseOutputRefs(outputRefsJson);
}

export function parseRunInputJson(inputJson: string): OrchestratePackInput {
  try {
    const parsed = JSON.parse(inputJson);
    if (!parsed || typeof parsed !== 'object') return {} as OrchestratePackInput;

    const obj = parsed as Record<string, unknown>;
    const channels = Array.isArray(obj.channels)
      ? obj.channels.filter((v): v is string => typeof v === 'string')
      : undefined;

    return {
      planId: typeof obj.planId === 'string' ? obj.planId : '',
      goal: typeof obj.goal === 'string' ? obj.goal : undefined,
      tone: typeof obj.tone === 'string' ? obj.tone : undefined,
      channels,
      includeVideo: Boolean(obj.includeVideo),
    };
  } catch {
    return {} as OrchestratePackInput;
  }
}

function inferSequenceType(goal: string | null): EmailSequenceType {
  if (!goal) return 'welcome';
  const g = goal.toLowerCase();
  if (g.includes('launch')) return 'launch';
  if (g.includes('nurture') || g.includes('onboard') || g.includes('retention')) return 'nurture';
  return 'welcome';
}

function buildVideoPrompt(input: NormalizedOrchestratePackInput): string {
  const goal = input.goal || 'introduce the app and key benefits';
  return `Create a cinematic 6-second product teaser for an app. Goal: ${goal}. Tone: ${input.tone}. Show modern UI motion, clear benefit framing, and end on a strong call to action.`;
}

function estimateRemainingMs(steps: OrchestrationStepState[], fromIndex: number): number {
  let total = 0;
  for (let i = fromIndex; i < steps.length; i++) {
    if (steps[i].status === 'done') continue;
    total += STEP_ESTIMATE_MS[steps[i].id] ?? 25_000;
  }
  return total;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function executeStep(
  stepId: OrchestrationStepId,
  input: NormalizedOrchestratePackInput,
  internalBaseUrl?: string,
  internalAuthHeaders?: Record<string, string>
): Promise<unknown> {
  const { planId } = input;

  switch (stepId) {
    case 'brand-voice': {
      const result = await generateBrandVoice(planId);
      saveContent(planId, 'brand-voice', null, JSON.stringify(result));
      updatePlanContent(planId, 'brandVoice', result);
      return { contentType: 'brand-voice' };
    }

    case 'positioning-angles': {
      const result = await generatePositioningAngles(planId);
      saveContent(planId, 'positioning', null, JSON.stringify(result));
      updatePlanContent(planId, 'positioning', result);
      return { contentType: 'positioning' };
    }

    case 'competitive-analysis': {
      const result = await generateCompetitiveAnalysis(planId);
      saveContent(planId, 'competitive-analysis', null, JSON.stringify(result.competitive));
      updatePlanContent(planId, 'competitiveAnalysis', result.competitive);
      return { contentType: 'competitive-analysis', perplexityUsed: result.perplexityUsed };
    }

    case 'generate-draft': {
      const { draft, tone } = await generateDraft({
        planId,
        sections: [
          'app_store_description',
          'short_description',
          'keywords',
          'whats_new',
          'feature_bullets',
          'landing_page_hero',
        ],
        tone: input.tone,
      });

      saveContent(planId, 'draft', tone, JSON.stringify(draft));

      const existingDrafts = (getPlanContent(planId).drafts || {}) as Record<string, unknown>;
      existingDrafts[tone] = draft;
      updatePlanContent(planId, 'drafts', existingDrafts);

      return { contentType: 'draft', contentKey: tone };
    }

    case 'generate-emails': {
      const sequenceType = inferSequenceType(input.goal);
      const emails = await generateEmailsSequence({
        planId,
        sequenceType,
        emailCount: 7,
      });

      saveContent(planId, 'emails', null, JSON.stringify(emails));

      const existingEmails = (getPlanContent(planId).emails || {}) as Record<string, unknown>;
      existingEmails[sequenceType] = emails;
      updatePlanContent(planId, 'emails', existingEmails);

      return { contentType: 'emails', sequenceType };
    }

    case 'atomize-content': {
      const atoms = await atomizeContent({
        planId,
        sourceContent: input.goal || undefined,
        platforms: input.channels.length > 0 ? input.channels : undefined,
      });

      saveContent(planId, 'atoms', null, JSON.stringify(atoms));
      updatePlanContent(planId, 'atoms', atoms);

      const atomCount =
        atoms && typeof atoms === 'object' && Array.isArray((atoms as Record<string, unknown>).atoms)
          ? ((atoms as Record<string, unknown>).atoms as unknown[]).length
          : null;

      return {
        contentType: 'atoms',
        channels: input.channels,
        atomCount,
      };
    }

    case 'generate-translations': {
      const targetLanguages: SupportedLanguage[] = ['es', 'de', 'fr', 'ja', 'pt-BR'];
      const translations = await generateTranslations({
        planId,
        targetLanguages,
        sections: ['app_store_description', 'short_description', 'keywords'],
      });

      for (const [lang, content] of Object.entries(translations)) {
        saveContent(planId, 'translations', lang, JSON.stringify(content));
      }

      const existingTranslations = (getPlanContent(planId).translations || {}) as Record<
        string,
        Record<string, string>
      >;
      for (const lang of Object.keys(translations)) {
        existingTranslations[lang] = {
          ...existingTranslations[lang],
          ...translations[lang],
        };
      }
      updatePlanContent(planId, 'translations', existingTranslations);

      return {
        contentType: 'translations',
        languages: targetLanguages,
      };
    }

    case 'generate-video': {
      if (!internalBaseUrl) {
        throw new Error('Video step requires internal base URL context');
      }

      const endpoint = new URL('/api/generate-video', internalBaseUrl);
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...internalAuthHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          prompt: buildVideoPrompt(input),
          aspectRatio: '16:9',
        }),
      });

      if (!resp.ok) {
        throw new Error(`Video kickoff failed (${resp.status}). Please retry later.`);
      }

      const payload = (await resp.json()) as { operationName?: string };
      const operationName = payload.operationName;
      if (!operationName) {
        throw new Error('Video kickoff returned no operationName');
      }

      const videoRef = {
        operationName,
        statusPath: `/api/generate-video/status?operation=${encodeURIComponent(operationName)}`,
      };

      saveContent(planId, 'video-operation', null, JSON.stringify(videoRef));
      updatePlanContent(planId, 'videoOperation', videoRef);

      return videoRef;
    }
  }
}

export async function executeOrchestrationRun(params: {
  runId: string;
  input: OrchestratePackInput;
  internalBaseUrl?: string | null;
  internalAuthHeaders?: Record<string, string>;
  resumeFromFailed?: boolean;
}): Promise<ExecuteOrchestrationResult> {
  const run = getRun(params.runId);
  if (!run) {
    throw new Error('Run not found');
  }

  const input = normalizeOrchestratePackInput(params.input);
  const steps = parseSteps(run.steps_json, input.includeVideo);
  const outputRefs = parseOutputRefs(run.output_refs_json);

  let startIndex = 0;
  if (params.resumeFromFailed) {
    const failedIndex = steps.findIndex((s) => s.status === 'failed');
    if (failedIndex >= 0) {
      startIndex = failedIndex;
    } else {
      const nextPending = steps.findIndex((s) => s.status !== 'done');
      startIndex = nextPending >= 0 ? nextPending : steps.length;
    }

    for (let i = startIndex; i < steps.length; i++) {
      if (steps[i].status === 'done') continue;
      steps[i] = {
        ...steps[i],
        status: 'pending',
        startedAt: undefined,
        finishedAt: undefined,
        error: undefined,
      };
    }
  }

  const initialCurrentStep = startIndex < steps.length ? steps[startIndex].id : null;

  updateRun(params.runId, {
    status: 'running',
    currentStep: initialCurrentStep,
    stepsJson: JSON.stringify(steps),
    inputJson: JSON.stringify(input),
    outputRefsJson: JSON.stringify(outputRefs),
    lastError: null,
  });

  if (startIndex >= steps.length) {
    updateRun(params.runId, {
      status: 'done',
      currentStep: null,
      stepsJson: JSON.stringify(steps),
      outputRefsJson: JSON.stringify(outputRefs),
      inputJson: JSON.stringify(input),
      lastError: null,
    });

    return {
      runId: params.runId,
      status: 'done',
      currentStep: null,
      lastError: null,
      steps,
      outputRefs,
    };
  }

  const deadlineAt = Date.now() + MAX_ORCHESTRATION_MS;

  for (let i = startIndex; i < steps.length; i++) {
    if (steps[i].status === 'done') {
      continue;
    }

    const remainingMs = deadlineAt - Date.now();
    const estimatedRemainingMs = estimateRemainingMs(steps, i);

    if (remainingMs <= 0 || remainingMs < estimatedRemainingMs) {
      const msg = `Insufficient time left for step "${steps[i].label}". Approx ${Math.ceil(estimatedRemainingMs / 1000)}s needed, ${Math.max(0, Math.ceil(remainingMs / 1000))}s left. Retry this run from the failed step or run a smaller pack (fewer channels/disable video).`;

      steps[i] = {
        ...steps[i],
        status: 'failed',
        finishedAt: nowIso(),
        error: msg,
      };

      updateRun(params.runId, {
        status: 'failed',
        currentStep: steps[i].id,
        stepsJson: JSON.stringify(steps),
        outputRefsJson: JSON.stringify(outputRefs),
        inputJson: JSON.stringify(input),
        lastError: msg,
      });

      return {
        runId: params.runId,
        status: 'failed',
        currentStep: steps[i].id,
        lastError: msg,
        steps,
        outputRefs,
      };
    }

    steps[i] = {
      ...steps[i],
      status: 'running',
      startedAt: nowIso(),
      error: undefined,
    };

    updateRun(params.runId, {
      status: 'running',
      currentStep: steps[i].id,
      stepsJson: JSON.stringify(steps),
      outputRefsJson: JSON.stringify(outputRefs),
      inputJson: JSON.stringify(input),
      lastError: null,
    });

    try {
      const outputRef = await executeStep(
        steps[i].id,
        input,
        params.internalBaseUrl ?? undefined,
        params.internalAuthHeaders
      );
      outputRefs[steps[i].id] = outputRef;

      steps[i] = {
        ...steps[i],
        status: 'done',
        finishedAt: nowIso(),
        error: undefined,
      };

      const nextStepId = i + 1 < steps.length ? steps[i + 1].id : null;

      updateRun(params.runId, {
        status: 'running',
        currentStep: nextStepId,
        stepsJson: JSON.stringify(steps),
        outputRefsJson: JSON.stringify(outputRefs),
        inputJson: JSON.stringify(input),
        lastError: null,
      });
    } catch (error) {
      const msg = toErrorMessage(error);

      steps[i] = {
        ...steps[i],
        status: 'failed',
        finishedAt: nowIso(),
        error: msg,
      };

      updateRun(params.runId, {
        status: 'failed',
        currentStep: steps[i].id,
        stepsJson: JSON.stringify(steps),
        outputRefsJson: JSON.stringify(outputRefs),
        inputJson: JSON.stringify(input),
        lastError: msg,
      });

      return {
        runId: params.runId,
        status: 'failed',
        currentStep: steps[i].id,
        lastError: msg,
        steps,
        outputRefs,
      };
    }
  }

  updateRun(params.runId, {
    status: 'done',
    currentStep: null,
    stepsJson: JSON.stringify(steps),
    outputRefsJson: JSON.stringify(outputRefs),
    inputJson: JSON.stringify(input),
    lastError: null,
  });

  return {
    runId: params.runId,
    status: 'done',
    currentStep: null,
    lastError: null,
    steps,
    outputRefs,
  };
}
