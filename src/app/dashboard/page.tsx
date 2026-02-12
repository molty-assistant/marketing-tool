'use client';

import { useState, useEffect } from 'react';
import { MarketingPlan } from '@/lib/types';

export default function DashboardPage() {
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  const sourceLabel: Record<string, string> = {
    appstore: '🍎 App Store',
    googleplay: '🤖 Google Play',
    website: '🌐 Website',
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <div className="inline-flex items-center gap-3 text-lg text-slate-300">
          <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading plans...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">📊 Dashboard</h1>
          <p className="text-slate-400">
            {plans.length} saved plan{plans.length !== 1 ? 's' : ''}
          </p>
        </div>
        <a
          href="/"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
        >
          + New Analysis
        </a>
      </div>

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

      {/* Plans grid */}
      {plans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
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

              <div className="flex items-center gap-2">
                <a
                  href={`/plan/${plan.id}`}
                  className="flex-1 text-center text-sm bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors"
                >
                  View Plan →
                </a>
                <button
                  onClick={() => handleDelete(plan.id, plan.config.app_name)}
                  className="text-sm bg-slate-700 hover:bg-red-500/30 hover:text-red-400 text-slate-400 py-2 px-3 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
