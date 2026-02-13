'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-xl bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center">
        <div className="text-4xl mb-4">🔧</div>
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-slate-400 mb-6">
          The application hit an unexpected error. You can try again.
        </p>

        {error?.message ? (
          <p className="text-sm text-slate-500 bg-slate-900/40 border border-slate-700/60 rounded-xl p-3 mb-6 break-words">
            {error.message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
