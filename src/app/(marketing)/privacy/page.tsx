import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto pt-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Privacy Policy</h1>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <p className="text-slate-500 dark:text-slate-400">Last updated: 8 March 2026</p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-3">1. What we collect</h2>
          <p>When you use LaunchKit, we collect:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Product URL</strong> — the app or website URL you provide for analysis</li>
            <li><strong>Email address</strong> — used to link your order and enable downloads</li>
            <li><strong>Questionnaire answers</strong> — your product stage, tone, audience, channel, and goal selections</li>
            <li><strong>Payment information</strong> — processed securely by Stripe; we never see or store card details</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-3">2. How we use your data</h2>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>To generate your marketing plan using AI</li>
            <li>To deliver your PDF and enable downloads</li>
            <li>To process payments via Stripe</li>
            <li>To respond to support requests</li>
          </ul>
          <p className="mt-3">
            We do not use your data for marketing emails, newsletter subscriptions, or any purpose
            beyond delivering the service you paid for.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-3">3. Third-party services</h2>
          <p>We use the following third-party services to operate:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Stripe</strong> — payment processing (<a href="https://stripe.com/privacy" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>)</li>
            <li><strong>Google Gemini</strong> — AI text generation (your URL and questionnaire data is sent to Google&apos;s API)</li>
            <li><strong>Kie.ai</strong> — AI image and video generation</li>
            <li><strong>Railway</strong> — hosting infrastructure</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-3">4. Data storage and retention</h2>
          <p>
            Your order data and generated plans are stored in our database. Download links expire after
            30 days. We do not currently offer automated account or data deletion, but you can request
            deletion of your data at any time by emailing us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-3">5. Cookies</h2>
          <p>
            We use only essential cookies and localStorage for theme preferences and session state.
            We do not use analytics cookies, tracking pixels, or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-3">6. Your rights</h2>
          <p>Under UK/EU data protection law (GDPR), you have the right to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to or restrict processing of your data</li>
            <li>Receive your data in a portable format</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email us at{' '}
            <a href="mailto:moltychief@agentmail.to" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline">
              moltychief@agentmail.to
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-3">7. Changes</h2>
          <p>
            We may update this policy from time to time. Material changes will be noted by updating the
            date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-8 mb-3">8. Contact</h2>
          <p>
            For privacy questions or data requests, email{' '}
            <a href="mailto:moltychief@agentmail.to" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline">
              moltychief@agentmail.to
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
