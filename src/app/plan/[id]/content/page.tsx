import { Languages, LayoutTemplate, Mail, PenLine } from 'lucide-react';

import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

export default async function ContentHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PlanPageShell
      title="Content"
      description="Build reusable copy assets from your strategy so distribution can run with minimal editing."
      helper="Recommended order: Copy Draft -> Email Sequences -> Templates -> Translations"
    >
      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/draft`}
          title="Copy Draft"
          description="Core marketing copy and listing draft variants"
          icon={PenLine}
        />
        <PlanLinkCard
          href={`/plan/${id}/emails`}
          title="Email Sequences"
          description="Welcome, launch, and lifecycle email sequences"
          icon={Mail}
        />
        <PlanLinkCard
          href={`/plan/${id}/templates`}
          title="Templates"
          description="Reusable templates for ads, landing pages, and outreach"
          icon={LayoutTemplate}
        />
        <PlanLinkCard
          href={`/plan/${id}/translate`}
          title="Translations"
          description="Localized variants for key markets and languages"
          icon={Languages}
        />
      </div>
    </PlanPageShell>
  );
}
