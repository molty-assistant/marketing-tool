import Link from 'next/link';
import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export const metadata: Metadata = {
  title: 'Marketing Tool — Vibe Marketing Brief Generator',
  description:
    'Paste any App Store, Google Play, or website URL and get a complete marketing brief with launch-ready copy drafts.',
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors dark:text-white dark:hover:text-indigo-400"
          >
            <span>Marketing Tool</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link
              href="/#pricing"
              className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Pricing
            </Link>
            <Link
              href="/start"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 sm:text-sm"
            >
              Get a plan
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </>
  );
}
