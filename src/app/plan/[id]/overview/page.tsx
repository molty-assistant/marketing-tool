import { redirect } from 'next/navigation';

export default async function LegacyOverviewRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The redesign uses /plan/[id] as the primary overview dashboard.
  // Keep this route as an alias to avoid breaking old links.
  redirect(`/plan/${id}`);
}
