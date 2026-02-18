'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface PlanNavProps {
  planId: string;
  appName?: string;
}

type NavItem = {
  href: string;
  label: string;
  description: string;
  exact?: boolean;
};

const NAV_OVERVIEW: NavItem[] = [
  { href: '/overview', label: '📊 Overview', description: 'Plan health & readiness dashboard' },
];

const NAV_STRATEGY: NavItem[] = [
  { href: '', label: '📋 Brief', description: "Your app's core marketing brief", exact: true },
  { href: '/foundation', label: '🏛️ Foundation', description: 'Brand voice & competitive positioning' },
  { href: '/variants', label: '🎯 Variants', description: 'A/B test different headline angles' },
  { href: '/serp', label: '🔍 SERP', description: 'Google search result preview' },
  { href: '/competitors', label: '🏆 Competitors', description: 'Competitive intelligence & gap analysis' },
];

const NAV_CONTENT: NavItem[] = [
  { href: '/draft', label: '✍️ Draft', description: 'App Store copy in multiple tones' },
  { href: '/translate', label: '🌍 Translate', description: 'App Store copy in 10 languages' },
  { href: '/templates', label: '🧩 Templates', description: 'Ready-to-copy marketing templates' },
  { href: '/emails', label: '📧 Emails', description: 'Welcome & launch email sequences' },
  { href: '/keywords', label: '🔑 Keywords', description: 'ASO keyword research by volume & difficulty' },
];

const NAV_DISTRIBUTION: NavItem[] = [
  { href: '/distribute', label: '📣 Distribute', description: 'One post → Instagram, TikTok, LinkedIn, Twitter' },
  { href: '/social', label: '📱 Social', description: 'Generate & post to Instagram/TikTok' },
  { href: '/schedule', label: '🗓️ Schedule', description: 'Content calendar & auto-posting' },
  { href: '/calendar', label: '📅 Calendar', description: 'AI content calendar for all platforms' },
];

const NAV_OPERATIONS: NavItem[] = [
  { href: '/reviews', label: '💊 Reviews', description: 'App Store review monitoring & sentiment' },
  { href: '/export', label: '📦 Export', description: 'Export & share plan outputs' },
  { href: '/digest', label: '📊 Digest', description: 'Weekly performance summary & next actions' },
  { href: '/approvals', label: '✅ Approvals', description: 'Review & approve generated content' },
  { href: '/assets', label: '🖼️ Assets', description: 'Social graphics & device mockups' },
  { href: '/preview', label: '👁️ Preview', description: 'App Store & Play Store listing preview' },
];

const NAV_GROUPS: Array<{ label?: string; items: NavItem[] }> = [
  { items: NAV_OVERVIEW },
  { label: 'Strategy', items: NAV_STRATEGY },
  { label: 'Content', items: NAV_CONTENT },
  { label: 'Distribution', items: NAV_DISTRIBUTION },
  { label: 'Operations', items: NAV_OPERATIONS },
];

export default function PlanNav({ planId, appName }: PlanNavProps) {
  const pathname = usePathname();
  const basePath = `/plan/${planId}`;

  return (
    <div className="mb-6">
      {/* Back to dashboard */}
      <div className="mb-3">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          ← All Plans
        </Link>
        {appName && (
          <span className="text-slate-500 text-sm ml-2">/ {appName}</span>
        )}
      </div>

      {/* Tab navigation */}
      <nav className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
        <div className="flex flex-col gap-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label ?? 'overview'}>
              {group.label ? (
                <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2">
                  {group.label}
                </div>
              ) : null}

              <div className="flex gap-1 overflow-x-auto flex-nowrap -mx-1 px-1">
                {group.items.map((item) => {
                  const fullPath = `${basePath}${item.href}`;
                  const isActive = item.exact
                    ? pathname === fullPath
                    : pathname.startsWith(fullPath);

                  return (
                    <Link
                      key={item.href}
                      href={fullPath}
                      title={item.description}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
