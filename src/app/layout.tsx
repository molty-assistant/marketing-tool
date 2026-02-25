import type { Metadata } from 'next';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeScript } from '@/components/theme/ThemeScript';

export const metadata: Metadata = {
  title: 'Marketing Tool — Vibe Marketing Brief Generator',
  description:
    'Paste any App Store, Google Play, or website URL and get a complete marketing brief with launch-ready copy drafts.',
  metadataBase: new URL('https://marketing-tool-production.up.railway.app'),
  openGraph: {
    title: 'Marketing Tool — Vibe Marketing Brief Generator',
    description:
      'Paste any app or website URL → get a full marketing brief with AI copy and competitor research.',
    type: 'website',
    siteName: 'Marketing Tool',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketing Tool — Vibe Marketing Brief Generator',
    description:
      'Paste any app or website URL → get a full marketing brief with AI copy and competitor research.',
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
    'launch copy',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
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
