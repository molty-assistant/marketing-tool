'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Tone = 'professional' | 'casual' | 'bold' | 'minimal';
type RunStatus = 'running' | 'done' | 'failed';
type StepStatus = 'pending' | 'running' | 'done' | 'failed';

type RunStep = {
  id: string;
  label: string;
  status: StepStatus;
  error?: string;
};

type RunSnapshot = {
  runId: string;
  status: RunStatus;
  currentStep: string | null;
  lastError: string | null;
  steps: RunStep[];
  updatedAt: string | null;
};

type StartOrRetryPayload = {
  runId?: string;
  status?: string;
  currentStep?: string | null;
  lastError?: string | null;
  error?: string;
};

const CHANNEL_OPTIONS = [
  'instagram',
  'tiktok',
  'linkedin',
  'twitter',
  'youtube',
  'reddit',
  'producthunt',
] as const;

const TONE_OPTIONS: Array<{ value: Tone; label: string }> = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'bold', label: 'Bold' },
  { value: 'minimal', label: 'Minimal' },
];

function normalizeRunStatus(status: string | undefined): RunStatus {
  if (status === 'running' || status === 'done' || status === 'failed') {
    return status;
  }
  return 'failed';
}

function normalizeStepStatus(status: string | undefined): StepStatus {
  if (status === 'pending' || status === 'running' || status === 'done' || status === 'failed') {
    return status;
  }
  return 'pending';
}

function humanizeStepId(stepId: string): string {
  return stepId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function StepStatusIcon({ status }: { status: StepStatus }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />;
  if (status === 'failed') return <AlertCircle className="h-4 w-4 text-red-400" />;
  return <Circle className="h-4 w-4 text-slate-600" />;
}

export default function PackOrchestratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const runStorageKey = useMemo(() => `pack-run-${id}`, [id]);

  const [goal, setGoal] = useState('');
  const [tone, setTone] = useState<Tone>('bold');
  const [channels, setChannels] = useState<string[]>([]);
  const [includeVideo, setIncludeVideo] = useState(false);

  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<RunSnapshot | null>(null);

  const [startPending, setStartPending] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [actionError, setActionError] = useState('');
  const [pollError, setPollError] = useState('');

  const pollInFlightRef = useRef(false);

  const saveRunId = useCallback(
    (nextRunId: string | null) => {
      if (typeof window === 'undefined') return;
      if (nextRunId) {
        sessionStorage.setItem(runStorageKey, nextRunId);
      } else {
        sessionStorage.removeItem(runStorageKey);
      }
    },
    [runStorageKey]
  );

  const fetchRunSnapshot = useCallback(
    async (targetRunId: string, force = false) => {
      if (!force && pollInFlightRef.current) return;
      pollInFlightRef.current = true;

      try {
        const response = await fetch(`/api/orchestrate-pack/${encodeURIComponent(targetRunId)}`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as {
          runId?: string;
          status?: string;
          currentStep?: string | null;
          lastError?: string | null;
          steps?: Array<{ id?: string; label?: string; status?: string; error?: string }>;
          updatedAt?: string | null;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || `Failed to load run (${response.status})`);
        }

        if (!payload.runId) {
          throw new Error('Run payload missing runId');
        }

        const normalizedSteps: RunStep[] = Array.isArray(payload.steps)
          ? payload.steps
              .filter((step): step is NonNullable<(typeof payload.steps)[number]> => Boolean(step))
              .map((step) => ({
                id: typeof step.id === 'string' ? step.id : 'unknown-step',
                label:
                  typeof step.label === 'string'
                    ? step.label
                    : humanizeStepId(typeof step.id === 'string' ? step.id : 'unknown-step'),
                status: normalizeStepStatus(step.status),
                error: typeof step.error === 'string' ? step.error : undefined,
              }))
          : [];

        setRunId(payload.runId);
        saveRunId(payload.runId);
        setRun({
          runId: payload.runId,
          status: normalizeRunStatus(payload.status),
          currentStep: typeof payload.currentStep === 'string' ? payload.currentStep : null,
          lastError: typeof payload.lastError === 'string' ? payload.lastError : null,
          steps: normalizedSteps,
          updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
        });
        setPollError('');
      } catch (error) {
        setPollError(error instanceof Error ? error.message : 'Failed to poll run status');
      } finally {
        pollInFlightRef.current = false;
      }
    },
    [saveRunId]
  );

  useEffect(() => {
    setRunId(null);
    setRun(null);
    setActionError('');
    setPollError('');

    if (typeof window === 'undefined') return;
    const storedRunId = sessionStorage.getItem(runStorageKey);
    if (!storedRunId) return;

    setRunId(storedRunId);
    void fetchRunSnapshot(storedRunId, true);
  }, [fetchRunSnapshot, runStorageKey]);

  useEffect(() => {
    if (!runId || run?.status !== 'running') return;
    const intervalId = window.setInterval(() => {
      void fetchRunSnapshot(runId);
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchRunSnapshot, run?.status, runId]);

  const currentStepLabel = useMemo(() => {
    if (!run?.currentStep) return 'None';
    const match = run.steps.find((step) => step.id === run.currentStep);
    return match?.label || humanizeStepId(run.currentStep);
  }, [run]);

  const runBadgeClass = useMemo(() => {
    if (!run) return '';
    if (run.status === 'running') return 'bg-indigo-500/15 text-indigo-200 border-indigo-500/30';
    if (run.status === 'done') return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
    return 'bg-red-500/15 text-red-200 border-red-500/30';
  }, [run]);

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel]
    );
  };

  const startRun = async () => {
    if (startPending || retryPending || run?.status === 'running') return;

    setStartPending(true);
    setActionError('');
    setPollError('');

    try {
      const response = await fetch('/api/orchestrate-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          goal: goal.trim(),
          tone,
          channels,
          includeVideo,
        }),
      });

      const payload = (await response.json()) as StartOrRetryPayload;
      const nextRunId = typeof payload.runId === 'string' ? payload.runId : null;

      if (nextRunId) {
        setRunId(nextRunId);
        saveRunId(nextRunId);
      }

      if (!response.ok) {
        const message = payload.error || `Failed to start orchestration (${response.status})`;
        setActionError(message);
        if (nextRunId) {
          await fetchRunSnapshot(nextRunId, true);
        }
        return;
      }

      if (!nextRunId) {
        setActionError('Orchestrator did not return a run id.');
        return;
      }

      await fetchRunSnapshot(nextRunId, true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to start orchestration');
    } finally {
      setStartPending(false);
    }
  };

  const retryRun = async () => {
    if (!runId || retryPending || startPending || run?.status === 'running') return;

    setRetryPending(true);
    setActionError('');
    setPollError('');

    try {
      const response = await fetch(`/api/orchestrate-pack/${encodeURIComponent(runId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          tone,
          channels,
          includeVideo,
        }),
      });

      const payload = (await response.json()) as StartOrRetryPayload;
      if (!response.ok) {
        setActionError(payload.error || `Retry failed (${response.status})`);
        await fetchRunSnapshot(runId, true);
        return;
      }

      await fetchRunSnapshot(runId, true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setRetryPending(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pack Orchestrator</h1>
        <p className="mt-1 text-slate-400">
          Configure your pack inputs, start orchestration, and track each step in real time.
        </p>
      </div>

      <Card className="bg-slate-800/50 border-white/[0.08]">
        <CardHeader>
          <CardTitle>Input Stepper</CardTitle>
          <CardDescription>Goal, tone, channels, and optional video kickoff.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-slate-900/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200">
                1
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="pack-goal">Goal</Label>
                <Input
                  id="pack-goal"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="e.g. launch week push for trial signups"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-slate-900/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200">
                2
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="pack-tone">Tone</Label>
                <Select
                  id="pack-tone"
                  value={tone}
                  onChange={(event) => setTone(event.target.value as Tone)}
                >
                  {TONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-slate-900/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200">
                3
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Channels</Label>
                  <span className="text-xs text-slate-500">{channels.length} selected</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CHANNEL_OPTIONS.map((channel) => {
                    const isSelected = channels.includes(channel);
                    return (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => toggleChannel(channel)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left text-sm capitalize transition-colors',
                          isSelected
                            ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-100'
                            : 'border-slate-700/70 bg-slate-900/40 text-slate-300 hover:text-white hover:border-slate-600'
                        )}
                      >
                        {channel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-slate-900/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200">
                4
              </div>
              <div className="flex-1">
                <Label htmlFor="pack-video" className="cursor-pointer">
                  Include video kickoff step
                </Label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="pack-video"
                    type="checkbox"
                    checked={includeVideo}
                    onChange={(event) => setIncludeVideo(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-400">
                    Adds the `generate-video` orchestrator step.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={startRun} disabled={startPending || retryPending || run?.status === 'running'}>
              {startPending ? 'Starting…' : run?.status === 'running' ? 'Running…' : 'Start Pack'}
            </Button>
            {run?.status === 'running' ? (
              <span className="text-xs text-slate-500">Polling every 2s</span>
            ) : null}
          </div>

          {actionError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {actionError}
            </div>
          ) : null}
          {pollError ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {pollError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {run ? (
        <Card className="bg-slate-800/50 border-white/[0.08]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Run Status</CardTitle>
                <CardDescription className="mt-1">
                  <span className="font-mono text-xs text-slate-500">runId: {run.runId}</span>
                </CardDescription>
              </div>
              <Badge className={cn('capitalize border', runBadgeClass)}>{run.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-slate-900/30 p-3 text-sm text-slate-300">
              <span className="text-slate-400">Current step:</span> {currentStepLabel}
            </div>

            <div className="space-y-2">
              {run.steps.map((step) => (
                <div key={step.id} className="rounded-xl border border-white/[0.08] bg-slate-900/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <StepStatusIcon status={step.status} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {step.label || humanizeStepId(step.id)}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">{step.id}</div>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'capitalize border',
                        step.status === 'done' && 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
                        step.status === 'running' && 'bg-indigo-500/15 text-indigo-200 border-indigo-500/30',
                        step.status === 'failed' && 'bg-red-500/15 text-red-200 border-red-500/30',
                        step.status === 'pending' && 'bg-slate-700/50 text-slate-200 border-slate-600/60'
                      )}
                    >
                      {step.status}
                    </Badge>
                  </div>
                  {step.status === 'failed' && step.error ? (
                    <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-200">
                      {step.error}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {run.status === 'failed' ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="text-sm font-medium text-red-200">Run failed</div>
                <div className="mt-1 text-sm text-red-100">
                  {run.lastError || 'The orchestrator reported a failure.'}
                </div>
                <div className="mt-3">
                  <Button onClick={retryRun} disabled={retryPending || startPending}>
                    {retryPending ? 'Retrying…' : 'Retry'}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
