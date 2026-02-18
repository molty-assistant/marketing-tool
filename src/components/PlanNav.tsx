'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface PlanNavProps {
  planId: string;
  appName?: string;
}

const NAV_ITEMS = [
  { href: '', label: '📋 Brief', description: 'Your app\'s core marketing brief', exact: true },
  { href: '/foundation', label: '🧱 Foundation', description: 'Brand voice & competitive positioning' },
  { href: '/draft', label: '📝 Draft', description: 'App Store copy in multiple tones' },
  { href: '/variants', label: '🏆 Variants', description: 'A/B test different headline angles' },
  { href: '/preview', label: '📱 Preview', description: 'App Store & Play Store listing preview' },
  { href: '/approvals', label: '✅ Approvals', description: 'Review & approve generated content' },
  { href: '/emails', label: '✉️ Emails', description: 'Welcome & launch email sequences' },
  { href: '/calendar', label: '📅 Calendar', description: 'AI content calendar for all platforms' },
  { href: '/digest', label: '📊 Digest', description: 'Weekly performance summary & next actions' },
  { href: '/distribute', label: '📣 Distribute', description: 'One post → Instagram, TikTok, LinkedIn, Twitter' },
  { href: '/translate', label: '🌍 Translate', description: 'App Store copy in 10 languages' },
  { href: '/serp', label: '🔍 SERP', description: 'Google search result preview' },
  { href: '/competitors', label: '🏆 Competitors', description: 'Competitive intelligence & gap analysis' },
  { href: '/assets', label: '🎨 Assets', description: 'Social graphics & device mockups' },
  { href: '/reviews', label: '⭐ Reviews', description: 'App Store review monitoring & sentiment' },
  { href: '/keywords', label: '🔑 Keywords', description: 'ASO keyword research by volume & difficulty' },
  { href: '/social', label: '📱 Social', description: 'Generate & post to Instagram/TikTok' },
  { href: '/templates', label: '🧩 Templates', description: 'Ready-to-copy marketing templates' },
  { href: '/schedule', label: '⏰ Schedule', description: 'Content calendar & auto-posting' },
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
      <nav className="flex flex-wrap gap-1 bg-slate-800/50 border border-slate-700 rounded-xl p-1">
        {NAV_ITEMS.map((item) => {
          const fullPath = `${basePath}${item.href}`;
          const isActive = item.exact
            ? pathname === fullPath
            : pathname.startsWith(fullPath);

          return (
            <Link
              key={item.href}
              href={fullPath}
              title={item.description}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex flex-col items-start ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[10px] font-normal leading-tight mt-0.5 ${
                  isActive ? 'text-indigo-200' : 'text-slate-500'
                }`}
              >
                {item.description}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
