import { Monitor, Search, Sparkles } from 'lucide-react';

import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

export default async function SeoHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PlanPageShell
      title="SEO & ASO"
      description="Improve discoverability with keyword targeting, preview checks, and variant testing."
      helper="Recommended order: Keywords -> SERP Preview -> Variants"
    >
      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/keywords`}
          title="Keywords"
          description="Keyword ideas and targeting strategy"
          icon={Search}
        />
        <PlanLinkCard
          href={`/plan/${id}/serp`}
          title="SERP Preview"
          description="How your title and description look in search results"
          icon={Monitor}
        />
        <PlanLinkCard
          href={`/plan/${id}/variants`}
          title="Variants"
          description="Alternative positioning angles and copy variants"
          icon={Sparkles}
        />
      </div>
    </PlanPageShell>
  );
}
