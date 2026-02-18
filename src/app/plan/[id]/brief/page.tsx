import { redirect } from 'next/navigation';

export default async function LegacyBriefRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/plan/${id}/strategy/brief`);
}
