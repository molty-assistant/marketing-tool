'use client';

import type { ComponentType } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ThemePreference } from '@/components/theme/theme';
import { useTheme } from '@/components/theme/ThemeProvider';

const OPTIONS: Array<{
  label: string;
  value: ThemePreference;
  icon: ComponentType<{ className?: string }>;
}> = [
  { label: 'System', value: 'system', icon: Monitor },
  { label: 'Light', value: 'light', icon: Sun },
  { label: 'Dark', value: 'dark', icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-xl border border-slate-300/80 bg-white/80 p-1 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70',
        className
      )}
      role="group"
      aria-label="Theme switcher"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = preference === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
            aria-pressed={isActive}
            aria-label={`Use ${option.label.toLowerCase()} theme`}
            title={`Use ${option.label.toLowerCase()} theme`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
