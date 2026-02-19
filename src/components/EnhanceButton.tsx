'use client';

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

type Tone = 'professional' | 'casual' | 'technical' | 'enthusiastic';

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
];

interface EnhanceButtonProps {
  /** The original template copy text */
  text: string;
  /** Brief context about the app (name, one-liner, etc.) */
  appContext: string;
  /** Called when enhanced text is produced or reverted */
  onTextChange: (newText: string) => void;
}

export default function EnhanceButton({ text, appContext, onTextChange }: EnhanceButtonProps) {
  const [tone, setTone] = useState<Tone>('professional');
  const [loading, setLoading] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const originalRef = useRef(text);
  const { success: toastSuccess, error: toastError } = useToast();

  // Keep original in sync if parent text changes while not enhanced
  if (!enhanced && text !== originalRef.current) {
    originalRef.current = text;
  }

  const handleEnhance = useCallback(async () => {
    if (loading || cooldown) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/enhance-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalRef.current, tone, context: appContext }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      if (!data.enhanced) {
        throw new Error('No enhanced text returned');
      }

      onTextChange(data.enhanced);
      setEnhanced(true);
      toastSuccess('Copy enhanced with AI');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toastError(message);
      // Auto-clear error after 4 seconds
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
      // Rate limit: disable for 2 seconds after each call
      setCooldown(true);
      setTimeout(() => setCooldown(false), 2000);
    }
  }, [loading, cooldown, tone, appContext, onTextChange]);

  const handleRevert = useCallback(() => {
    onTextChange(originalRef.current);
    setEnhanced(false);
  }, [onTextChange]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Tone selector */}
      <Select
        value={tone}
        onChange={(e) => setTone(e.target.value as Tone)}
        disabled={loading}
        className="w-auto h-auto text-xs bg-slate-700 text-slate-300 border-slate-600 rounded-lg px-2 py-1.5 focus-visible:ring-1 disabled:opacity-50"
      >
        {TONE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      {/* Enhance / Re-enhance button */}
      <Button
        onClick={handleEnhance}
        disabled={loading || cooldown}
        size="sm"
        className="h-auto text-xs disabled:bg-indigo-800 px-3 py-1.5 rounded-lg"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Enhancing…
          </>
        ) : enhanced ? (
          '✨ Re-enhance'
        ) : (
          '✨ Enhance with AI'
        )}
      </Button>

      {/* Revert button (only shown when enhanced) */}
      {enhanced && !loading && (
        <Button
          onClick={handleRevert}
          variant="secondary"
          size="sm"
          className="h-auto text-xs text-slate-300 px-3 py-1.5 rounded-lg"
        >
          ↩️ Revert
        </Button>
      )}

      {/* Error toast */}
      {error && (
        <span className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 px-2 py-1 rounded-lg">
          {error}
        </span>
      )}
    </div>
  );
}
