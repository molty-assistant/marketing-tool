import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TikTok Integration Terms & Privacy',
};

export default function TikTokIntegrationPage() {
  return (
    <div className="max-w-3xl mx-auto pt-6 px-6 sm:px-0">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">TikTok Integration: Terms & Privacy</h1>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <p className="text-slate-500 dark:text-slate-400">Last updated: 18 March 2026</p>

        {/* Hidden verification code for TikTok crawler */}
        <section className="hidden" aria-hidden="true">
          <h2 className="text-xl font-semibold mb-4">Verification Code</h2>
          <p className="font-mono text-lg bg-white p-3 border border-slate-300 rounded shadow-sm inline-block">
            tiktokK6k2GcLQ168JtZpLVwwQ8VAPr4KFYLra
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-3">Integration Overview</h2>
          <p>
            Molty&apos;s TikTok integration allows creators and businesses to schedule and publish videos directly to their TikTok accounts from our dashboard. We utilize the official TikTok Content Posting API to streamline your content distribution process safely and securely.
          </p>
        </section>

        <section id="terms">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-12 mb-6 border-t border-slate-200 dark:border-slate-800 pt-8">Terms of Service</h2>
          
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2">1. Acceptance of Terms</h3>
          <p>By connecting your TikTok account to Molty, you agree to these specific integration terms in addition to our general Terms of Service.</p>
          
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2">2. Service Description</h3>
          <p>Molty provides automation tools specifically for content scheduling and video publishing to connected TikTok accounts.</p>
          
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2">3. User Conduct</h3>
          <p>You remain fully responsible for all content posted via your Molty account. All content must comply strictly with TikTok&apos;s Community Guidelines and Terms of Service.</p>
          
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2">4. Limitations</h3>
          <p>We do not guarantee 100% uptime for posting and are not liable for any missed scheduled posts, delayed publishing, or platform restrictions/bans imposed directly by TikTok on your account.</p>
        </section>

        <section id="privacy">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-12 mb-6 border-t border-slate-200 dark:border-slate-800 pt-8">Privacy Policy</h2>
          
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2">1. Data Collection</h3>
          <p>We collect your TikTok account name and access tokens (provided securely via OAuth) for the sole, explicit purpose of publishing your scheduled content.</p>
          
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2">2. Data Usage</h3>
          <p>Your access tokens are used exclusively to execute actions that you explicitly initiate within the Molty dashboard (e.g., uploading and publishing a video). We do not use your TikTok connection data for any other purpose.</p>
          
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2">3. Data Protection</h3>
          <p>All authentication tokens are encrypted at rest and stored securely. We never sell, rent, or share your personal TikTok account information with any third parties.</p>
          
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2">4. Data Removal & Revocation</h3>
          <p>You retain full control and can revoke our access at any time directly through your TikTok account settings, or by contacting our team to have your integration data permanently deleted at support@molty.marketing.</p>
        </section>
      </div>
    </div>
  );
}
