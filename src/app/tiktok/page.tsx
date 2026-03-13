export const metadata = {
  title: 'Molty Marketing – TikTok Integration',
};

export default function TikTokPage() {
  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto', padding: '40px 24px', color: '#111' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Molty Marketing</h1>
      <p style={{ color: '#555', marginBottom: 40 }}>
        Molty Marketing is a personal social media scheduling tool used by one individual to
        plan, draft, and schedule content to TikTok and other platforms via Postiz. It is not
        a public product and does not collect data from or about any other users.
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', marginBottom: 40 }} />

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Terms of Service</h2>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          <strong>Last updated: March 2026</strong>
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          This tool is operated solely for personal use by its owner (&ldquo;Operator&rdquo;). By accessing
          this service you acknowledge the following terms.
        </p>
        <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>1. Use of Service</h3>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          This service is provided for the Operator&rsquo;s personal content scheduling needs. It is
          not intended for use by third parties.
        </p>
        <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>2. TikTok Integration</h3>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          This service integrates with the TikTok API solely to allow the Operator to publish
          content to their own TikTok account. No TikTok user data is stored beyond what is
          required to authenticate and post content.
        </p>
        <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>3. Limitation of Liability</h3>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          The service is provided &ldquo;as is&rdquo; without warranties of any kind. The Operator accepts
          no liability for any losses arising from use of this tool.
        </p>
        <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>4. Changes</h3>
        <p style={{ lineHeight: 1.7 }}>
          These terms may be updated at any time. Continued use of the service constitutes
          acceptance of any revised terms.
        </p>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', marginBottom: 40 }} />

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Privacy Policy</h2>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          <strong>Last updated: March 2026</strong>
        </p>
        <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>1. Data We Collect</h3>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          This service is used solely by one individual. No personal data is collected from
          visitors or third parties. The only data processed is the Operator&rsquo;s own TikTok
          OAuth tokens, which are stored locally and used exclusively to post content on the
          Operator&rsquo;s behalf.
        </p>
        <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>2. TikTok Data</h3>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          We access TikTok account information only to the extent required to authenticate
          and publish scheduled posts. We do not share, sell, or transfer any TikTok user
          data to third parties. Data obtained via TikTok APIs is not used to train any AI
          or machine learning models.
        </p>
        <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>3. Cookies</h3>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          This service does not use tracking cookies or analytics.
        </p>
        <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>4. Third-Party Services</h3>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          This tool uses Postiz for scheduling. Please refer to Postiz&rsquo;s own privacy policy for
          information on how they handle data.
        </p>
        <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>5. Contact</h3>
        <p style={{ lineHeight: 1.7 }}>
          For any privacy-related questions, contact: <a href="mailto:hello@molty.marketing" style={{ color: '#0066cc' }}>hello@molty.marketing</a>
        </p>
      </section>

      <footer style={{ borderTop: '1px solid #e5e5e5', paddingTop: 24, color: '#888', fontSize: 14 }}>
        &copy; {new Date().getFullYear()} Molty Marketing. All rights reserved.
      </footer>
    </main>
  );
}
