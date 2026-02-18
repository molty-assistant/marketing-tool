import type { Metadata } from 'next';
import Link from 'next/link';
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
      <body className="min-h-screen">
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white hover:text-indigo-400 transition-colors">
              <span className="text-2xl">🎯</span>
              <span>Marketing Tool</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                ✨ Start
              </Link>
              <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                📊 Dashboard
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <ToastProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </ToastProvider>
        </main>
      </body>
    </html>
  );
}
