'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MarketingPlan } from '@/lib/types';

/**
 * Shared hook for loading a marketing plan by ID.
 * - Hydrates from sessionStorage for instant rendering
 * - Fetches fresh data from /api/plans/:id
 * - Caches the result back to sessionStorage
 */
export function usePlan(id: string) {
    const [plan, setPlan] = useState<MarketingPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        setLoading(true);

        // Try sessionStorage first for instant hydration
        try {
            const cached = sessionStorage.getItem(`plan-${id}`);
            if (cached) {
                const parsed = JSON.parse(cached) as MarketingPlan;
                setPlan(parsed);
                // Do NOT return early — fetch fresh data in background (stale-while-revalidate)
            }
        } catch {
            // ignore corrupt cache
        }

        const controller = new AbortController();
        const signal = controller.signal;

        // Fetch from API
        try {
            const res = await fetch(`/api/plans/${id}`, { signal });
            if (!res.ok) throw new Error('Failed to load plan');
            const data = (await res.json()) as MarketingPlan;

            // Only update if component is still mounted
            if (!signal.aborted) {
                setPlan(data);
                try {
                    sessionStorage.setItem(`plan-${id}`, JSON.stringify(data));
                } catch {
                    // storage full — ignore
                }
            }
        } catch (err) {
            if (!signal.aborted) {
                setError(err instanceof Error ? err.message : 'Failed to load plan');
            }
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }

        return () => controller.abort();
    }, [id]);

    useEffect(() => {
        const cleanup = load();
        return () => { cleanup.then((abort) => abort?.()); };
    }, [load]);

    return { plan, loading, error, reload: load };
}
