import type { Metadata } from 'next';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { THEME_STORAGE_KEY } from '@/components/theme/constants';

export const metadata: Metadata = {
  title: 'Marketing Tool — Vibe Marketing Brief Generator',
  description:
    'Paste any App Store, Google Play, or website URL and get a complete 5-stage marketing brief powered by the Vibe Marketing methodology. AI-enhanced copy, competitive analysis, and social media assets included.',
  metadataBase: new URL('https://marketing-tool-production.up.railway.app'),
  openGraph: {
    title: 'Marketing Tool — Vibe Marketing Brief Generator',
    description:
      'Paste any app or website URL → get a full marketing brief with AI copy, competitor research, and social assets.',
    type: 'website',
    siteName: 'Marketing Tool',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketing Tool — Vibe Marketing Brief Generator',
    description:
      'Paste any app or website URL → get a full marketing brief with AI copy, competitor research, and social assets.',
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    'marketing brief generator',
    'vibe marketing',
    'app store marketing',
    'AI copywriting',
    'competitive analysis',
    'social media assets',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeInitScript = `
  (() => {
    try {
      const storageKey = '${THEME_STORAGE_KEY}';
      const stored = localStorage.getItem(storageKey);
      const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      const root = document.documentElement;
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
      root.setAttribute('data-theme', theme);
    } catch {}
  })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
