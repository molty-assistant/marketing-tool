'use client';

import { useState, useEffect, useMemo } from 'react';
import { MarketingPlan } from '@/lib/types';
import { DashboardSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';

export default function DashboardPage() {
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/plans');
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete plan for "${name}"?`)) return;
    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setPlans((prev) => prev.filter((p) => p.id !== id));
      toastSuccess(`Deleted "${name}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete plan';
      setError(msg);
      toastError(msg);
    }
  };

  const sourceLabel: Record<string, string> = {
    appstore: '🍎 App Store',
    googleplay: '🤖 Google Play',
    website: '🌐 Website',
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch = !search.trim() ||
        plan.config.app_name.toLowerCase().includes(search.toLowerCase()) ||
        plan.config.one_liner?.toLowerCase().includes(search.toLowerCase());
      const matchesSource = sourceFilter === 'all' || plan.scraped.source === sourceFilter;
      return matchesSearch && matchesSource;
    });
  }, [plans, search, sourceFilter]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error && plans.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-20">
        <ErrorRetry error={error} onRetry={fetchPlans} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">📊 Dashboard</h1>
          <p className="text-slate-400">
            {plans.length} saved plan{plans.length !== 1 ? 's' : ''}
          </p>
        </div>
        <a
          href="/"
          className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
        >
          + New Analysis
        </a>
      </div>

      {/* Search & Filter */}
      {plans.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All sources</option>
            <option value="appstore">🍎 App Store</option>
            <option value="googleplay">🤖 Google Play</option>
            <option value="website">🌐 Website</option>
          </select>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {plans.length === 0 && !error && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-white mb-2">No plans yet</h2>
          <p className="text-slate-400 mb-6">Generate your first marketing plan to see it here.</p>
          <a
            href="/"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Start a new analysis
          </a>
        </div>
      )}

      {/* No results */}
      {plans.length > 0 && filteredPlans.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">No plans match your search.</p>
        </div>
      )}

      {/* Plans grid */}
      {filteredPlans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:bg-slate-800/70 transition-colors group"
            >
              <div className="flex items-start gap-4 mb-4">
                {plan.config.icon ? (
                  <img
                    src={plan.config.icon}
                    alt={plan.config.app_name}
                    className="w-12 h-12 rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                    🎯
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{plan.config.app_name}</h3>
                  <p className="text-xs text-slate-500 truncate">{plan.config.one_liner}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-slate-700/70 text-slate-300 px-2 py-0.5 rounded-full">
                  {sourceLabel[plan.scraped.source] || plan.scraped.source}
                </span>
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                  {plan.config.app_type}
                </span>
                <span className="text-xs bg-slate-700/70 text-slate-400 px-2 py-0.5 rounded-full">
                  {plan.config.pricing}
                </span>
              </div>

              <div className="text-xs text-slate-500 mb-4">
                Created {new Date(plan.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>

              {/* Quick actions */}
              <div className="flex gap-1 mb-3">
                <a href={`/plan/${plan.id}/draft`} title="Generate Draft" className="flex-1 text-center text-xs bg-slate-700/50 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 py-1.5 rounded-lg transition-colors">📝</a>
                <a href={`/plan/${plan.id}/translate`} title="Translate" className="flex-1 text-center text-xs bg-slate-700/50 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 py-1.5 rounded-lg transition-colors">🌍</a>
                <a href={`/plan/${plan.id}/serp`} title="SERP Preview" className="flex-1 text-center text-xs bg-slate-700/50 hover:bg-emerald-600/30 text-slate-400 hover:text-emerald-300 py-1.5 rounded-lg transition-colors">🔍</a>
                <a href={`/plan/${plan.id}/assets`} title="Assets" className="flex-1 text-center text-xs bg-slate-700/50 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 py-1.5 rounded-lg transition-colors">🎨</a>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/plan/${plan.id}`}
                  className="flex-1 text-center text-sm bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors"
                >
                  View Plan →
                </a>
                <button
                  onClick={() => handleDelete(plan.id, plan.config.app_name)}
                  className="text-sm bg-slate-700 hover:bg-red-500/30 hover:text-red-400 text-slate-400 py-2.5 sm:py-2 px-3 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Delete plan"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
