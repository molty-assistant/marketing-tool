'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';

type StreamEvent =
  | { type: 'start'; total: number; planId: string }
  | { type: 'step:start'; step: number; total: number; id: string; label: string }
  | { type: 'step:complete'; step: number; total: number; id: string }
  | { type: 'step:error'; step: number; total: number; id: string; error: string }
  | { type: 'done'; summary: unknown }
  | { type: 'fatal'; error: string };

export default function GenerateAllButton({
  planId,
  onComplete,
}: {
  planId: string;
  onComplete?: (summary: unknown) => void;
}) {
  const [running, setRunning] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string>('');
  const [step, setStep] = useState(0);
  const [total, setTotal] = useState(7);
  const [errors, setErrors] = useState<string[]>([]);

  const { success, error } = useToast();

  const pct = useMemo(() => {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((step / total) * 100)));
  }, [step, total]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setErrors([]);
    setCurrentLabel('Starting…');
    setStep(0);

    try {
      const res = await fetch('/api/generate-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-stream': '1',
        },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buf = '';
      let finalSummary: unknown = null;
      const errorLines: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const ln of lines) {
          if (!ln.trim()) continue;
          let evt: StreamEvent | null = null;
          try {
            evt = JSON.parse(ln) as StreamEvent;
          } catch {
            continue;
          }

          if (evt.type === 'start') {
            setTotal(evt.total || 7);
            setStep(0);
            setCurrentLabel('Starting…');
          }

          if (evt.type === 'step:start') {
            setTotal(evt.total);
            setStep(evt.step - 1);
            setCurrentLabel(`Step ${evt.step}/${evt.total}: ${evt.label}…`);
          }

          if (evt.type === 'step:complete') {
            setStep(evt.step);
          }

          if (evt.type === 'step:error') {
            const line = `• ${evt.id}: ${evt.error}`;
            errorLines.push(line);
            setErrors((prev) => [...prev, line]);
            setStep(evt.step);
          }

          if (evt.type === 'fatal') {
            throw new Error(evt.error);
          }

          if (evt.type === 'done') {
            finalSummary = evt.summary;
          }
        }
      }

      setCurrentLabel('Complete');
      setStep(total);

      if (errorLines.length > 0) {
        success('Generate Everything finished (with some errors)');
      } else {
        success('Marketing pack complete!');
      }

      onComplete?.(finalSummary);
    } catch (e) {
      error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="w-full sm:w-auto">
      <button
        onClick={run}
        disabled={running}
        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-sm px-4 py-2.5 sm:py-2 rounded-lg transition-colors"
      >
        {running ? 'Generating…' : '✨ Generate Everything'}
      </button>

      {(running || step > 0) && (
        <div className="mt-2 w-full sm:w-[320px]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="truncate">{currentLabel || '—'}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-slate-950/40 border border-slate-700/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500/70 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {errors.length > 0 && (
            <div className="mt-2 text-xs text-amber-200 bg-amber-950/30 border border-amber-900/40 rounded-xl p-2 whitespace-pre-wrap">
              <div className="font-semibold mb-1">Errors (best-effort run):</div>
              {errors.join('\n')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
