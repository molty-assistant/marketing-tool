'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart2,
  Building2,
  Calendar,
  CalendarClock,
  CheckSquare,
  Eye,
  FileText,
  Globe,
  Image,
  Key,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Megaphone,
  Package,
  PenLine,
  Search,
  Smartphone,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';

interface PlanNavProps {
  planId: string;
  appName?: string;
}

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  exact?: boolean;
};

const NAV_OVERVIEW: NavItem[] = [
  {
    href: '/overview',
    label: 'Overview',
    description: 'Plan health & readiness dashboard',
    icon: LayoutDashboard,
  },
];

const NAV_STRATEGY: NavItem[] = [
  {
    href: '',
    label: 'Brief',
    description: "Your app's core marketing brief",
    icon: FileText,
    exact: true,
  },
  {
    href: '/foundation',
    label: 'Foundation',
    description: 'Brand voice & competitive positioning',
    icon: Building2,
  },
  {
    href: '/variants',
    label: 'Variants',
    description: 'A/B test different headline angles',
    icon: Target,
  },
  {
    href: '/serp',
    label: 'SERP',
    description: 'Google search result preview',
    icon: Search,
  },
  {
    href: '/competitors',
    label: 'Competitors',
    description: 'Competitive intelligence & gap analysis',
    icon: Trophy,
  },
];

const NAV_CONTENT: NavItem[] = [
  {
    href: '/draft',
    label: 'Draft',
    description: 'App Store copy in multiple tones',
    icon: PenLine,
  },
  {
    href: '/translate',
    label: 'Translate',
    description: 'App Store copy in 10 languages',
    icon: Globe,
  },
  {
    href: '/templates',
    label: 'Templates',
    description: 'Ready-to-copy marketing templates',
    icon: LayoutTemplate,
  },
  {
    href: '/emails',
    label: 'Emails',
    description: 'Welcome & launch email sequences',
    icon: Mail,
  },
  {
    href: '/keywords',
    label: 'Keywords',
    description: 'ASO keyword research by volume & difficulty',
    icon: Key,
  },
];

const NAV_DISTRIBUTION: NavItem[] = [
  {
    href: '/distribute',
    label: 'Distribute',
    description: 'One post → Instagram, TikTok, LinkedIn, Twitter',
    icon: Megaphone,
  },
  {
    href: '/social',
    label: 'Social',
    description: 'Generate & post to Instagram/TikTok',
    icon: Smartphone,
  },
  {
    href: '/schedule',
    label: 'Schedule',
    description: 'Content calendar & auto-posting',
    icon: CalendarClock,
  },
  {
    href: '/calendar',
    label: 'Calendar',
    description: 'AI content calendar for all platforms',
    icon: Calendar,
  },
  {
    href: '/performance',
    label: 'Performance',
    description: 'Track which posts worked best',
    icon: TrendingUp,
  },
];

const NAV_OPERATIONS: NavItem[] = [
  {
    href: '/reviews',
    label: 'Reviews',
    description: 'App Store review monitoring & sentiment',
    icon: Star,
  },
  {
    href: '/export',
    label: 'Export',
    description: 'Export & share plan outputs',
    icon: Package,
  },
  {
    href: '/digest',
    label: 'Digest',
    description: 'Weekly performance summary & next actions',
    icon: BarChart2,
  },
  {
    href: '/approvals',
    label: 'Approvals',
    description: 'Review & approve generated content',
    icon: CheckSquare,
  },
  {
    href: '/assets',
    label: 'Assets',
    description: 'Social graphics & device mockups',
    icon: Image,
  },
  {
    href: '/preview',
    label: 'Preview',
    description: 'App Store & Play Store listing preview',
    icon: Eye,
  },
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
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <item.icon size={14} />
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
