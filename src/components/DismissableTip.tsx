'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DismissableTipProps {
    id: string;
    children: React.ReactNode;
}

const STORAGE_PREFIX = 'dismissed-tip-';

/**
 * A contextual info banner that users can dismiss.
 * Dismissal is persisted to localStorage by `id`.
 */
export default function DismissableTip({ id, children }: DismissableTipProps) {
    const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

    useEffect(() => {
        try {
            const stored = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
            setDismissed(stored === '1');
        } catch {
            setDismissed(false);
        }
    }, [id]);

    if (dismissed) return null;

    const handleDismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${id}`, '1');
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="flex-1">{children}</div>
            <button
                onClick={handleDismiss}
                className="text-slate-500 hover:text-slate-300 mt-0.5 shrink-0"
                aria-label="Dismiss tip"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
