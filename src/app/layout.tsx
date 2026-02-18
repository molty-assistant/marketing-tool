import type { Metadata } from 'next';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';

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
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f]">
        <ToastProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  );
}
