import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MoltyPostiz Privacy Policy',
};

export default function TikTokPrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto pt-10 pb-20 px-4 sm:px-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="mb-12 relative z-10 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          MoltyPostiz Privacy Policy
        </h1>
        <p className="text-base sm:text-lg text-white/50">Last updated: 19 March 2026</p>
      </div>

      <section className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm shadow-xl relative z-10 space-y-8">
        <div>
          <h3 className="text-base font-semibold text-white/90 mb-2">1. Data Collection</h3>
          <p className="text-sm sm:text-base leading-relaxed text-white/60">
            We collect your TikTok account name and access tokens (provided securely via official OAuth) for the sole, explicit purpose of publishing your scheduled content via MoltyPostiz.
          </p>
        </div>
        
        <div>
          <h3 className="text-base font-semibold text-white/90 mb-2">2. Data Usage</h3>
          <p className="text-sm sm:text-base leading-relaxed text-white/60">
            Your secure access tokens are used exclusively to execute actions that you explicitly initiate within the MoltyPostiz dashboard (e.g., uploading and publishing a drafted video). We do not use your TikTok connection data for tracking, advertising, or compiling data profiles.
          </p>
        </div>
        
        <div>
          <h3 className="text-base font-semibold text-white/90 mb-2">3. Data Protection</h3>
          <p className="text-sm sm:text-base leading-relaxed text-white/60">
            All authentication tokens are strictly encrypted at rest and stored securely. We never sell, rent, or share any of your personal TikTok account information or analytics with any third parties or data brokers.
          </p>
        </div>
        
        <div>
          <h3 className="text-base font-semibold text-white/90 mb-2">4. Data Removal & Revocation</h3>
          <p className="text-sm sm:text-base leading-relaxed text-white/60">
            You retain full and total control over your integration. You can instantly revoke our application access at any time directly through your TikTok account&apos;s &quot;Authorized Apps&quot; settings, or by contacting our team to have your MoltyPostiz integration data permanently deleted by emailing support@molty.marketing.
          </p>
        </div>
      </section>
    </div>
  );
}
