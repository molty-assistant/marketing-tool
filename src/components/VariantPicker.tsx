'use client';

import { useCallback, useMemo, useState } from 'react';

interface VariantPickerProps {
  text: string;
  appContext: string;
  onPick: (text: string) => void;
}

function Spinner({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
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
  );
}

export default function VariantPicker({ text, appContext, onPick }: VariantPickerProps) {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F'], []);

  const dismiss = useCallback(() => {
    setVariants(null);
    setError(null);
    setLoading(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context: appContext, count: 3 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      if (!Array.isArray(data.variants)) {
        throw new Error('No variants returned');
      }

      setVariants(data.variants.filter((v: unknown) => typeof v === 'string'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setVariants(null);
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  }, [loading, text, appContext]);

  const handlePick = useCallback(
    (variant: string) => {
      onPick(variant);
      dismiss();
    },
    [onPick, dismiss]
  );

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <Spinner />
              Generating…
            </>
          ) : (
            '🔀 Generate Variants'
          )}
        </button>

        {variants && !loading && (
          <button
            onClick={handleGenerate}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Regenerate
          </button>
        )}

        {(variants || error) && !loading && (
          <button
            onClick={dismiss}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4"
          >
            Cancel
          </button>
        )}

        {error && (
          <span className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 px-2 py-1 rounded-lg">
            {error}
          </span>
        )}
      </div>

      {variants && variants.length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {variants.slice(0, 6).map((variant, idx) => (
            <div
              key={idx}
              className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold tracking-wide bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  {labels[idx] || String(idx + 1)}
                </span>
              </div>

              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {variant}
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => handlePick(variant)}
                  className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Use this
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
