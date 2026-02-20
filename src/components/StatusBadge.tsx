export type Status = 'ready' | 'pending' | 'empty' | 'generating';

export function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    ready: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400',
    pending: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400',
    empty: 'bg-slate-500/10 text-slate-600 border-slate-500/25 dark:text-slate-400',
    generating: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:text-indigo-400',
  };

  const labels: Record<Status, string> = {
    ready: '✓ Ready',
    pending: '⏳ Pending',
    empty: '○ Not generated',
    generating: '⟳ Generating',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
