import React from 'react';

export default function TikTokVerification() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans text-slate-800">
      <h1 className="text-3xl font-bold mb-8">TikTok Developer Verification</h1>
      
      <section className="hidden" aria-hidden="true">
        <h2 className="text-xl font-semibold mb-4">Verification Code</h2>
        <p className="font-mono text-lg bg-white p-3 border border-slate-300 rounded shadow-sm inline-block">
          tiktokK6k2GcLQ168JtZpLVwwQ8VAPr4KFYLra
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">App Description</h2>
        <p className="text-lg leading-relaxed text-slate-600">
          Molty is a marketing tool designed to help creators and businesses manage their social media presence efficiently. 
          The TikTok integration enables users to schedule and publish videos directly to their TikTok accounts through our 
          centralized dashboard. We use the TikTok Content Posting API to streamline the content distribution process.
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-12 border-t border-slate-200 pt-12">
        <section>
          <h2 className="text-2xl font-semibold mb-6">Terms of Service</h2>
          <div className="prose prose-slate text-slate-600 space-y-4">
            <p><strong>1. Acceptance of Terms:</strong> By connecting your TikTok account to Molty, you agree to these terms.</p>
            <p><strong>2. Service Description:</strong> Molty provides tools for content scheduling and automated posting to TikTok.</p>
            <p><strong>3. User Conduct:</strong> You are responsible for all content posted via your Molty account. Content must comply with TikTok&apos;s Community Guidelines.</p>
            <p><strong>4. Limitations:</strong> We do not guarantee 100% uptime and are not liable for any missed posts or platform restrictions imposed by TikTok.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Privacy Policy</h2>
          <div className="prose prose-slate text-slate-600 space-y-4">
            <p><strong>1. Data Collection:</strong> We collect your TikTok account name and access tokens provided via OAuth for the sole purpose of publishing content.</p>
            <p><strong>2. Data Usage:</strong> Your tokens are used exclusively to execute actions you initiate (e.g., uploading a video).</p>
            <p><strong>3. Data Protection:</strong> All tokens are encrypted and stored securely. We do not sell or share your personal information with third parties.</p>
            <p><strong>4. Data Removal:</strong> You can revoke access at any time via your TikTok settings or by contacting us at support@molty.marketing.</p>
          </div>
        </section>
      </div>

      <footer className="mt-20 pt-8 border-t border-slate-100 text-slate-400 text-sm italic">
        Last updated: March 13, 2026. For inquiries, contact support@molty.marketing.
      </footer>
    </div>
  );
}
