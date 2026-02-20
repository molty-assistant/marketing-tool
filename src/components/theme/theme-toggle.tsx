'use client';

import { Laptop, Moon, Sun } from 'lucide-react';

import { Select } from '@/components/ui/select';
import { useTheme } from '@/components/theme/theme-provider';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const Icon = theme === 'system' ? Laptop : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Theme</span>
      <Select
        aria-label="Theme"
        value={theme}
        onChange={(event) => setTheme(event.target.value as 'light' | 'dark' | 'system')}
        className="h-8 w-[108px] rounded-lg border-slate-300 bg-white/80 px-2 py-1 text-xs text-slate-700 shadow-sm focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </Select>
    </label>
  );
}
