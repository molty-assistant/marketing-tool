import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MoltyPostiz Terms & Privacy',
};

export default function TikTokIntegrationPage() {
  return (
    <div className="max-w-4xl mx-auto pt-10 pb-20 px-4 sm:px-6 relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="text-center mb-12 relative z-10">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          MoltyPostiz Legal
        </h1>
        <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto">
          Terms of Service and Privacy Policy for the MoltyPostiz Application. Last updated: 18 March 2026.
        </p>
      </div>

      {/* Hidden verification code for TikTok crawler */}
      <section className="hidden" aria-hidden="true">
        <h2 className="text-xl font-semibold mb-4 text-white">Verification Code</h2>
        <p className="font-mono text-lg bg-white/5 p-3 border border-white/10 rounded shadow-sm inline-block text-white/70">
          tiktokK6k2GcLQ168JtZpLVwwQ8VAPr4KFYLra
        </p>
      </section>

      <div className="space-y-10 relative z-10">
        
        {/* Overview Card */}
        <section className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <h2 className="text-xl font-bold text-white mb-3">Integration Overview</h2>
          <p className="text-sm sm:text-base leading-relaxed text-white/60">
            The MoltyPostiz application allows creators and businesses to schedule and publish videos directly to their TikTok accounts from our dashboard. We utilize the official TikTok Content Posting API to streamline your content distribution process safely and securely.
          </p>
        </section>

        {/* Terms Card */}
        <section id="terms" className="scroll-mt-24 rounded-2xl border border-white/6 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">1</span>
            Terms of Service
          </h2>
          
          <div className="space-y-6">
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
          </div>
        </section>

        {/* Privacy Card */}
        <section id="privacy" className="scroll-mt-24 rounded-2xl border border-white/6 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">2</span>
            Privacy Policy
          </h2>
          
          <div className="space-y-6">
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
                You retain full and total control over your integration. You can instantly revoke our application access at any time directly through your TikTok account&apos;s "Authorized Apps" settings, or by contacting our team to have your MoltyPostiz integration data permanently deleted by emailing support@molty.marketing.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
