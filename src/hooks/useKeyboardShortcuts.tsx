'use client';

import { useEffect, useRef } from 'react';

type Shortcut = {
    key: string;
    meta?: boolean;
    ctrl?: boolean;
    handler: () => void;
};

/**
 * Registers keyboard shortcuts. Prevents default browser behavior.
 * Example: useKeyboardShortcuts([{ key: 'Enter', meta: true, handler: onGenerate }])
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    const shortcutsRef = useRef(shortcuts);

    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            for (const s of shortcutsRef.current) {
                const metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : true;
                const ctrlMatch = s.ctrl ? (e.metaKey || e.ctrlKey) : true;
                if (e.key === s.key && metaMatch && ctrlMatch) {
                    e.preventDefault();
                    s.handler();
                    return;
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []); // Empty dependency array = stable listener
}

/**
 * Renders a keyboard shortcut hint badge.
 */
export function KbdHint({ keys }: { keys: string }) {
    return (
        <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-slate-400 border border-white/[0.06]">
            {keys}
        </kbd>
    );
}
