'use client';

import * as React from 'react';

import {
  THEME_STORAGE_KEY,
  type ThemePreference,
  isThemePreference,
} from '@/components/theme/constants';

type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(theme: ThemePreference, mediaQuery: MediaQueryList) {
  const shouldUseDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
  const root = document.documentElement;

  root.classList.toggle('dark', shouldUseDark);
  root.style.colorScheme = shouldUseDark ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);

  return shouldUseDark ? 'dark' : 'light';
}

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>('light');

  React.useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      setResolvedTheme(applyThemeToDocument(theme, mediaQuery));
    };

    apply();

    const handleSystemThemeChange = () => {
      if (theme === 'system') apply();
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }

    mediaQuery.addListener(handleSystemThemeChange);
    return () => mediaQuery.removeListener(handleSystemThemeChange);
  }, [theme]);

  const setTheme = React.useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
