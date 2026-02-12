import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketing Tool — Vibe Marketing Brief Generator',
  description: 'Generate complete 5-stage marketing briefs from any app URL',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-lg font-bold text-white hover:text-indigo-400 transition-colors">
              <span className="text-2xl">🎯</span>
              <span>Marketing Tool</span>
            </a>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Vibe Marketing Playbook</span>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
