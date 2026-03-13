export const metadata = {
  title: 'Molty Marketing – TikTok Integration',
};

export default function TikTokPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 text-foreground">
      <h1 className="text-3xl font-bold mb-2">Molty Marketing</h1>
      <p className="text-muted-foreground mb-10">
        Molty Marketing is a personal social media scheduling tool used by one individual to
        plan, draft, and schedule content to TikTok and other platforms via Postiz. It is not
        a public product and does not collect data from or about any other users.
      </p>

      <hr className="border-border mb-10" />

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Terms of Service</h2>
        <p className="text-sm text-muted-foreground mb-4"><strong>Last updated: March 2026</strong></p>

        <p className="leading-relaxed mb-3">
          This tool is operated solely for personal use by its owner (&ldquo;Operator&rdquo;). By accessing
          this service you acknowledge the following terms.
        </p>

        <h3 className="font-semibold mt-6 mb-2">1. Use of Service</h3>
        <p className="leading-relaxed mb-3">
          This service is provided for the Operator&rsquo;s personal content scheduling needs. It is
          not intended for use by third parties.
        </p>

        <h3 className="font-semibold mt-6 mb-2">2. TikTok Integration</h3>
        <p className="leading-relaxed mb-3">
          This service integrates with the TikTok API solely to allow the Operator to publish
          content to their own TikTok account. No TikTok user data is stored beyond what is
          required to authenticate and post content.
        </p>

        <h3 className="font-semibold mt-6 mb-2">3. Limitation of Liability</h3>
        <p className="leading-relaxed mb-3">
          The service is provided &ldquo;as is&rdquo; without warranties of any kind. The Operator accepts
          no liability for any losses arising from use of this tool.
        </p>

        <h3 className="font-semibold mt-6 mb-2">4. Changes</h3>
        <p className="leading-relaxed">
          These terms may be updated at any time. Continued use of the service constitutes
          acceptance of any revised terms.
        </p>
      </section>

      <hr className="border-border mb-10" />

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Privacy Policy</h2>
        <p className="text-sm text-muted-foreground mb-4"><strong>Last updated: March 2026</strong></p>

        <h3 className="font-semibold mt-6 mb-2">1. Data We Collect</h3>
        <p className="leading-relaxed mb-3">
          This service is used solely by one individual. No personal data is collected from
          visitors or third parties. The only data processed is the Operator&rsquo;s own TikTok
          OAuth tokens, which are stored locally and used exclusively to post content on the
          Operator&rsquo;s behalf.
        </p>

        <h3 className="font-semibold mt-6 mb-2">2. TikTok Data</h3>
        <p className="leading-relaxed mb-3">
          We access TikTok account information only to the extent required to authenticate
          and publish scheduled posts. We do not share, sell, or transfer any TikTok user
          data to third parties. Data obtained via TikTok APIs is not used to train any AI
          or machine learning models.
        </p>

        <h3 className="font-semibold mt-6 mb-2">3. Cookies</h3>
        <p className="leading-relaxed mb-3">
          This service does not use tracking cookies or analytics.
        </p>

        <h3 className="font-semibold mt-6 mb-2">4. Third-Party Services</h3>
        <p className="leading-relaxed mb-3">
          This tool uses Postiz for scheduling. Please refer to Postiz&rsquo;s own privacy policy for
          information on how they handle data.
        </p>

        <h3 className="font-semibold mt-6 mb-2">5. Contact</h3>
        <p className="leading-relaxed">
          For any privacy-related questions, contact:{' '}
          <a href="mailto:hello@molty.marketing" className="text-primary underline">
            hello@molty.marketing
          </a>
        </p>
      </section>

      <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Molty Marketing. All rights reserved.
      </footer>
    </main>
  );
}
