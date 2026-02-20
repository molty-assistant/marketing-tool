import Link from 'next/link';
import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export const metadata: Metadata = {
  title: 'Marketing Tool — Vibe Marketing Brief Generator',
  description:
    'Paste any App Store, Google Play, or website URL and get a complete 5-stage marketing brief powered by the Vibe Marketing methodology. AI-enhanced copy, competitive analysis, and social media assets included.',
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-slate-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
          >
            <span className="text-2xl">🎯</span>
            <span>Marketing Tool</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <ThemeToggle />
            <Link
              href="/"
              className="font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              ✨ Start
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              📊 Dashboard
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </>
  );
}
