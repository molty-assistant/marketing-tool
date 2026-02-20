'use client';

import * as React from 'react';

import {
  isThemePreference,
  ResolvedTheme,
  THEME_STORAGE_KEY,
  ThemePreference,
} from '@/components/theme/theme';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

function applyTheme(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>('light');

  React.useEffect(() => {
    const fromStorage = localStorage.getItem(THEME_STORAGE_KEY);
    const nextPreference = isThemePreference(fromStorage) ? fromStorage : 'system';
    const nextResolved = resolveTheme(nextPreference);

    setPreferenceState(nextPreference);
    setResolvedTheme(nextResolved);
    applyTheme(nextResolved);
  }, []);

  React.useEffect(() => {
    if (preference !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const nextResolved = media.matches ? 'dark' : 'light';
      setResolvedTheme(nextResolved);
      applyTheme(nextResolved);
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;

      const nextPreference = isThemePreference(event.newValue) ? event.newValue : 'system';
      const nextResolved = resolveTheme(nextPreference);
      setPreferenceState(nextPreference);
      setResolvedTheme(nextResolved);
      applyTheme(nextResolved);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = React.useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    localStorage.setItem(THEME_STORAGE_KEY, value);

    const nextResolved = resolveTheme(value);
    setResolvedTheme(nextResolved);
    applyTheme(nextResolved);
  }, []);

  const contextValue = React.useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = React.useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return value;
}
