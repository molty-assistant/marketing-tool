import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';

import {

  Calendar,
  ChevronRight,
  Clock,
  Megaphone,
  Plus,
  Instagram,
  Linkedin,
  Youtube,
} from 'lucide-react';

function StatusPill({
  label,
  status,
}: {
  label: string;
  status: 'selected' | 'not_selected';
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/50 border border-white/[0.06]">
      <div className="text-xs text-slate-300">{label}</div>
      <div
        className={
          status === 'selected'
            ? 'text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-200 border border-indigo-500/20'
            : 'text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]'
        }
      >
        {status === 'selected' ? 'Selected' : 'Not selected'}
      </div>
    </div>
  );
}

export default async function DistributionHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  const planRes = await fetch(`${baseUrl}/api/plans/${id}`, {
    headers: {
      // Needed to bypass Basic Auth middleware for internal server-to-server fetches.
      'x-api-key': process.env.API_KEY || '',
    },
    cache: 'no-store',
  });

  const plan = (await planRes.json()) as MarketingPlan;
  const selected = new Set(
    (plan?.config?.distribution_channels || []).map((c) => String(c).toLowerCase())
  );

  const sections = [
    {
      title: 'Social Posts',
      description: 'Create posts, images, and video content for each channel',
      href: `/plan/${id}/social`,
      icon: Megaphone,
    },
    {
      title: 'Schedule',
      description: 'Plan and queue posts over time',
      href: `/plan/${id}/schedule`,
      icon: Clock,
    },
    {
      title: 'Calendar',
      description: 'See everything in a single calendar view',
      href: `/plan/${id}/calendar`,
      icon: Calendar,
    },
  ];

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Distribution</h1>
        <p className="text-slate-400 mt-1">
          Create social posts with AI-generated captions, images, and videos.
          Schedule across Instagram, TikTok, LinkedIn and more.
        </p>
      </div>

      {/* Primary CTA */}
      <Link href={`/plan/${id}/social`}>
        <div className="group mb-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-indigo-500/5 border border-indigo-500/25 hover:border-indigo-500/40 transition-all cursor-pointer">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                  <Plus className="w-5 h-5 text-indigo-300" />
                </div>
                <div className="text-base font-semibold text-white">
                  Create Social Post
                </div>
              </div>
              <div className="text-sm text-slate-400 mt-2">
                Generate captions, images and video variations for your next campaign.
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
            <StatusPill
              label="Instagram"
              status={selected.has('instagram') ? 'selected' : 'not_selected'}
            />
            <StatusPill
              label="LinkedIn"
              status={selected.has('linkedin') ? 'selected' : 'not_selected'}
            />
            <StatusPill
              label="TikTok / Shorts"
              status={selected.has('tiktok') ? 'selected' : 'not_selected'}
            />
          </div>

          <div className="flex items-center gap-3 mt-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Instagram className="w-3.5 h-3.5" />
              Instagram
            </div>
            <div className="flex items-center gap-1.5">
              <Linkedin className="w-3.5 h-3.5" />
              LinkedIn
            </div>
            <div className="flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5" />
              Shorts
            </div>
          </div>
        </div>
      </Link>

      {/* Sub-sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link href={section.href} key={section.href}>
              <div className="group flex items-center justify-between p-5 bg-slate-800/50 border border-white/[0.06] rounded-xl hover:border-indigo-500/30 hover:bg-slate-800/80 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {section.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {section.description}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
