export type Status = 'ready' | 'pending' | 'empty' | 'generating';

export function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    empty: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    generating: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
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
