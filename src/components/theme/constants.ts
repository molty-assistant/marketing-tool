export const THEME_STORAGE_KEY = 'marketing-tool-theme';

export type ThemePreference = 'light' | 'dark' | 'system';

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}
