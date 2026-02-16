'use client';

import { usePathname } from 'next/navigation';

interface PlanNavProps {
  planId: string;
  appName?: string;
}

const NAV_ITEMS = [
  { href: '', label: '📋 Brief', exact: true },
  { href: '/foundation', label: '🧱 Foundation' },
  { href: '/draft', label: '📝 Draft' },
  { href: '/translate', label: '🌍 Translate' },
  { href: '/serp', label: '🔍 SERP' },
  { href: '/assets', label: '🎨 Assets' },
];

export default function PlanNav({ planId, appName }: PlanNavProps) {
  const pathname = usePathname();
  const basePath = `/plan/${planId}`;

  return (
    <div className="mb-6">
      {/* Back to dashboard */}
      <div className="mb-3">
        <a
          href="/dashboard"
          className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          ← All Plans
        </a>
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
            <a
              key={item.href}
              href={fullPath}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
