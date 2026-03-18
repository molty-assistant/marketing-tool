import Link from 'next/link';
import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export const metadata: Metadata = {
  title: 'LaunchKit — Launch Marketing Packs for Indie Makers',
  description:
    'Paste your product URL, answer 5 questions, get a complete marketing pack — positioning, copy, social posts, and more. From £39, pay once.',
};

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="22" height="22" rx="6" fill="url(#lg)" />
      <path d="M7 11.5L10.5 15L15.5 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold text-foreground hover:text-indigo-400 transition-colors"
          >
            <LogoMark />
            <span>LaunchKit</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link
              href="/#examples"
              className="hidden sm:inline text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Examples
            </Link>
            <Link
              href="/#pricing"
              className="text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/start"
              className="rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.3)] border border-indigo-400/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all sm:text-sm"
            >
              Get Started
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </>
  );
}
