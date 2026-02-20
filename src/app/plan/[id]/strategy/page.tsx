import { FileText, Target, Users } from 'lucide-react';

import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

export default async function StrategyHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PlanPageShell
      title="Strategy"
      description="Start here to lock positioning, audience, and competitive angle before generating more assets."
      helper="Recommended order: Brief -> Foundation -> Competitors"
    >
      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/strategy/brief`}
          title="Brief"
          description="Your core positioning, audience, and messaging summary"
          icon={FileText}
        />
        <PlanLinkCard
          href={`/plan/${id}/foundation`}
          title="Foundation"
          description="Value props, differentiators, and brand fundamentals"
          icon={Target}
        />
        <PlanLinkCard
          href={`/plan/${id}/competitors`}
          title="Competitors"
          description="Competitive landscape and positioning angles"
          icon={Users}
        />
      </div>
    </PlanPageShell>
  );
}
