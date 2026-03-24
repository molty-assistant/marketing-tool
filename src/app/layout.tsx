import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeScript } from '@/components/theme/ThemeScript';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'LaunchKit — £99 Launch Brief + Copy Pack',
  description:
    'Done-for-you positioning, copy, and launch comms for indie makers — £99 one-time, delivered in 48 hours.',
  metadataBase: new URL('https://marketing-tool-production.up.railway.app'),
  openGraph: {
    title: 'LaunchKit — £99 Launch Brief + Copy Pack',
    description:
      'Done-for-you positioning, copy, and launch comms for indie makers. £99 one-time, delivered in 48 hours.',
    type: 'website',
    siteName: 'LaunchKit',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LaunchKit — £99 Launch Brief + Copy Pack',
    description:
      'Done-for-you positioning, copy, and launch comms for indie makers. £99 one-time, delivered in 48 hours.',
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    'launch brief and copy pack',
    'done-for-you launch copy',
    'indie maker marketing',
    'product positioning service',
    'launch comms',
    '48 hour delivery',
    '99 one-time offer',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <script
          data-goatcounter="https://microapps.goatcounter.com/count"
          async
          src="//gc.zgo.at/count.js"
        />
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
