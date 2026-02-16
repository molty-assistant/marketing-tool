'use client';

interface ErrorRetryProps {
  error: string;
  onRetry: () => void;
  className?: string;
}

export default function ErrorRetry({ error, onRetry, className = '' }: ErrorRetryProps) {
  return (
    <div
      className={`bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center ${className}`}
    >
      <div className="text-red-400 text-sm mb-3">{error}</div>
      <button
        onClick={onRetry}
        className="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
      >
        🔄 Retry
      </button>
    </div>
  );
}
