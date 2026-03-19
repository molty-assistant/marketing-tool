import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MoltyPostiz Terms of Service',
};

export default function TikTokTermsPage() {
  return (
    <div className="max-w-3xl mx-auto pt-10 pb-20 px-4 sm:px-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="mb-12 relative z-10 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          MoltyPostiz Terms of Service
        </h1>
        <p className="text-base sm:text-lg text-white/50">Last updated: 19 March 2026</p>
      </div>

      <section className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm shadow-xl relative z-10 space-y-8">
        <div>
          <h3 className="text-base font-semibold text-white/90 mb-2">1. Acceptance of Terms</h3>
          <p className="text-sm sm:text-base leading-relaxed text-white/60">
            By connecting your TikTok account to MoltyPostiz, you agree to these specific integration terms in addition to our overarching Terms of Service.
          </p>
        </div>
        
        <div>
          <h3 className="text-base font-semibold text-white/90 mb-2">2. Service Description</h3>
          <p className="text-sm sm:text-base leading-relaxed text-white/60">
            MoltyPostiz provides automation tools specifically designed for content scheduling and official video publishing to connected TikTok accounts.
          </p>
        </div>
        
        <div>
          <h3 className="text-base font-semibold text-white/90 mb-2">3. User Conduct</h3>
          <p className="text-sm sm:text-base leading-relaxed text-white/60">
            You remain fully responsible for all content posted via your MoltyPostiz account. All content must comply strictly and unequivocally with TikTok&apos;s Community Guidelines and Terms of Service.
          </p>
        </div>
        
        <div>
          <h3 className="text-base font-semibold text-white/90 mb-2">4. Limitations</h3>
          <p className="text-sm sm:text-base leading-relaxed text-white/60">
            We do not guarantee 100% uptime for automated posting and are not liable for any missed scheduled posts, delayed publishing, or platform restrictions, shadow-bans, or suspensions imposed directly by TikTok on your account.
          </p>
        </div>
      </section>
    </div>
  );
}
