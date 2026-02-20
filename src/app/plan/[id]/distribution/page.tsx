import Link from 'next/link';
import { headers } from 'next/headers';
import { Calendar, Clock, Linkedin, Megaphone, Plus, Youtube } from 'lucide-react';

import type { MarketingPlan } from '@/lib/types';
import { PlanLinkCard, PlanPageShell } from '@/components/plan/PlanPage';

function StatusPill({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/[0.06] dark:bg-slate-900/50">
      <span className="text-xs text-slate-700 dark:text-slate-300">{label}</span>
      <span
        className={
          'rounded-full border px-2 py-0.5 text-[11px] ' +
          (selected
            ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
            : 'border-slate-300 bg-slate-100 text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-slate-400')
        }
      >
        {selected ? 'Selected' : 'Not selected'}
      </span>
    </div>
  );
}

export default async function DistributionHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const baseUrl = host ? `${proto}://${host}` : `http://localhost:${process.env.PORT || 3000}`;

  const planRes = await fetch(`${baseUrl}/api/plans/${id}`, {
    headers: {
      'x-api-key': process.env.API_KEY || '',
    },
    cache: 'no-store',
  });

  const plan = (await planRes.json()) as MarketingPlan;
  const selected = new Set(
    (plan?.config?.distribution_channels || []).map((c) => String(c).toLowerCase())
  );

  return (
    <PlanPageShell
      title="Distribution"
      description="Generate and route channel-ready content with clear publish sequencing."
      helper="Recommended order: Social Posts -> Schedule -> Calendar"
    >
      <Link
        href={`/plan/${id}/social`}
        className="group mb-6 block rounded-2xl border border-indigo-300/60 bg-indigo-50 p-5 transition-colors hover:border-indigo-400/80 dark:border-indigo-500/25 dark:bg-indigo-950/20 dark:hover:border-indigo-400/40"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/15">
                <Plus className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                Create Social Post
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Generate captions, images, and video variations for your next campaign.
            </p>
          </div>
          <Megaphone className="h-5 w-5 text-slate-500 transition-colors group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatusPill label="Instagram" selected={selected.has('instagram')} />
          <StatusPill label="LinkedIn" selected={selected.has('linkedin')} />
          <StatusPill label="TikTok / Shorts" selected={selected.has('tiktok')} />
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">📸 Instagram</div>
          <div className="flex items-center gap-1.5">
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
          </div>
          <div className="flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5" />
            Shorts
          </div>
        </div>
      </Link>

      <div className="space-y-3">
        <PlanLinkCard
          href={`/plan/${id}/social`}
          title="Social Posts"
          description="Create posts, images, and video content for each channel"
          icon={Megaphone}
        />
        <PlanLinkCard
          href={`/plan/${id}/schedule`}
          title="Schedule"
          description="Plan and queue posts over time"
          icon={Clock}
        />
        <PlanLinkCard
          href={`/plan/${id}/calendar`}
          title="Calendar"
          description="See publishing cadence in one calendar view"
          icon={Calendar}
        />
      </div>
    </PlanPageShell>
  );
}
