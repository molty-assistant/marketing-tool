'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Trash2 } from 'lucide-react';

import type { MarketingPlan } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function PlanCard({
  plan,
  onDelete,
}: {
  plan: MarketingPlan;
  onDelete: (id: string) => void;
}) {
  const appName = plan.config?.app_name || plan.scraped?.name || 'Untitled';
  const url = plan.config?.app_url || plan.scraped?.url;
  const created = plan.createdAt ? new Date(plan.createdAt) : null;

  // Plan completeness from available data
  const stages = plan.stages as unknown as Record<string, unknown> | undefined;
  const sections = [
    !!plan.generated?.trim(),
    !!(stages?.foundation && typeof stages.foundation === 'string' && stages.foundation.trim()),
    !!(stages?.draft && typeof stages.draft === 'string' && stages.draft.trim()),
    !!(stages?.distribution && typeof stages.distribution === 'string' && stages.distribution.trim()),
    !!(stages?.assets && typeof stages.assets === 'string' && stages.assets.trim()),
  ];
  const readyCount = sections.filter(Boolean).length;
  const totalSections = sections.length;

  return (
    <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3 group">
      <div className="flex items-start gap-4">
        {(plan.scraped?.icon || plan.config?.icon) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plan.scraped?.icon || plan.config?.icon}
            alt=""
            className="w-12 h-12 rounded-2xl"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">{appName}</div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 truncate block mt-0.5"
            >
              {url}
            </a>
          )}
          {created && (
            <div className="text-xs text-slate-500 mt-1">
              Created {created.toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="text-xs text-slate-500 line-clamp-1">
            {plan.config?.one_liner || plan.scraped?.shortDescription || plan.scraped?.description || 'No description'}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(readyCount / totalSections) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {readyCount}/{totalSections}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete plan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete &ldquo;{appName}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  This will permanently delete this plan and all generated content. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(plan.id)}
                  className="bg-red-600 text-white hover:bg-red-500"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Link
            href={`/plan/${plan.id}`}
            className="shrink-0 text-xs font-medium bg-indigo-500/15 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 hover:border-indigo-400/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            Open →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const { error: toastError } = useToast();

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('/api/plans')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plans');
        return res.json() as Promise<MarketingPlan[]>;
      })
      .then((data) => setPlans(data || []))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load plans')
      )
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete plan');
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to delete plan');
    }
  };

  const filtered = plans.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (p.config?.app_name || p.scraped?.name || '').toLowerCase();
    const url = (p.config?.app_url || p.scraped?.url || '').toLowerCase();
    return name.includes(q) || url.includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            All your generated marketing plans in one place.
          </p>
        </div>
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
          ← Home
        </Link>
      </div>

      {/* Search */}
      {!loading && plans.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans…"
            className="pl-9 bg-slate-900/40 border-white/[0.06] text-white placeholder:text-slate-500"
          />
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-slate-900/40 border border-white/[0.06] rounded-2xl"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-950/30 border border-red-700/40 rounded-2xl p-5 text-red-200 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && plans.length === 0 && (
        <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-8 text-center">
          <div className="text-slate-200 font-semibold">No plans yet</div>
          <p className="text-sm text-slate-400 mt-2">
            Generate your first marketing plan to see it here.
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex items-center bg-indigo-500/15 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 hover:border-indigo-400/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Generate a plan →
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && plans.length > 0 && (
        <>
          {search.trim() && filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              No plans matching &ldquo;{search}&rdquo;
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <PlanCard key={p.id} plan={p} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
