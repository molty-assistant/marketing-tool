import { Eye, Image, Package } from 'lucide-react';

import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

export default async function ExportHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PlanPageShell
      title="Export"
      description="Review and package outputs for handoff, sharing, and launch operations."
      helper="Recommended order: Assets -> Preview -> Distribution Export"
    >
      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/assets`}
          title="Assets"
          description="Download generated images and export-ready files"
          icon={Image}
        />
        <PlanLinkCard
          href={`/plan/${id}/preview`}
          title="Preview"
          description="Check listing and content output before distribution"
          icon={Eye}
        />
        <PlanLinkCard
          href={`/plan/${id}/distribute`}
          title="Distribution Export"
          description="Bundle channel-ready content for publishing workflows"
          icon={Package}
        />
      </div>
    </PlanPageShell>
  );
}
