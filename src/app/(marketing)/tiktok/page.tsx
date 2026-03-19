import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'MoltyPostiz',
};

export default function MoltyPostizLandingPage() {
  return (
    <div className="max-w-4xl mx-auto pt-16 pb-20 px-4 sm:px-6 relative text-center">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6 relative z-10">
        Welcome to MoltyPostiz
      </h1>
      
      <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed relative z-10 mb-12">
        The official integration for creators and businesses to schedule, manage, and publish videos directly to their TikTok accounts from our centralized dashboard.
      </p>

      {/* Hidden verification code for TikTok crawler */}
      <section className="hidden" aria-hidden="true">
        <h2 className="text-xl font-semibold mb-4 text-white">Verification Code</h2>
        <p className="font-mono text-lg bg-white/5 p-3 border border-white/10 rounded shadow-sm inline-block text-white/70">
          tiktokK6k2GcLQ168JtZpLVwwQ8VAPr4KFYLra
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center">
           <h3 className="text-xl font-bold text-white mb-3">Terms of Service</h3>
           <p className="text-sm text-white/50 mb-6">Read our official integration terms for MoltyPostiz.</p>
           <Link href="/tiktok/terms" className="px-6 py-2 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 hover:text-white transition-colors">
              Read Terms
           </Link>
        </div>

        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center">
           <h3 className="text-xl font-bold text-white mb-3">Privacy Policy</h3>
           <p className="text-sm text-white/50 mb-6">Learn how MoltyPostiz handles and protects your data.</p>
           <Link href="/tiktok/privacy" className="px-6 py-2 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 hover:text-white transition-colors">
              Read Policy
           </Link>
        </div>
      </div>
    </div>
  );
}
