'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PenLine,
  Megaphone,
  Search,
  Package,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type NavChild = {
  label: string;
  href: string; // full route under /plan/[id]
};

type NavGroup = {
  key: 'overview' | 'strategy' | 'content' | 'distribution' | 'seo' | 'export';
  label: string;
  href: string; // group landing route under /plan/[id]
  icon: React.ComponentType<{ className?: string }>; // lucide
  children?: NavChild[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    href: '', // /plan/[id]
  },
  {
    key: 'strategy',
    label: 'Strategy',
    icon: FileText,
    href: '/strategy',
    children: [
      { label: 'Brief', href: '/strategy/brief' },
      { label: 'Foundation', href: '/foundation' },
      { label: 'Competitors', href: '/competitors' },
      { label: 'Reviews', href: '/reviews' },
    ],
  },
  {
    key: 'content',
    label: 'Content',
    icon: PenLine,
    href: '/content',
    children: [
      { label: 'Copy Draft', href: '/draft' },
      { label: 'Tone Compare', href: '/tone-compare' },
      { label: 'Email sequences', href: '/emails' },
      { label: 'Templates', href: '/templates' },
      { label: 'Translations', href: '/translate' },
      { label: 'Approvals', href: '/approvals' },
    ],
  },
  {
    key: 'distribution',
    label: 'Distribution',
    icon: Megaphone,
    href: '/distribution',
    children: [
      { label: 'Social Posts', href: '/social' },
      { label: 'Schedule', href: '/schedule' },
      { label: 'Calendar', href: '/calendar' },
      { label: 'Distribute', href: '/distribute' },
      { label: 'Performance', href: '/performance' },
    ],
  },
  {
    key: 'seo',
    label: 'SEO & ASO',
    icon: Search,
    href: '/seo',
    children: [
      { label: 'Keywords', href: '/keywords' },
      { label: 'SERP Preview', href: '/serp' },
      { label: 'Variants', href: '/variants' },
    ],
  },
  {
    key: 'export',
    label: 'Export',
    icon: Package,
    href: '/export',
    children: [
      { label: 'Assets', href: '/assets' },
      { label: 'Preview', href: '/preview' },
      { label: 'Digest', href: '/digest' },
    ],
  },
];

export function PlanSidebar({
  planId,
  appName,
}: {
  planId: string;
  appName: string;
}) {
  const pathname = usePathname();
  const basePath = `/plan/${planId}`;

  const activeGroupKey = React.useMemo(() => {
    // Most-specific match first
    for (const g of NAV_GROUPS) {
      const groupPath = `${basePath}${g.href}`;
      if (g.key === 'overview') {
        if (pathname === groupPath) return g.key;
        continue;
      }
      if (pathname === groupPath) return g.key;
      if (g.children?.some((c) => pathname === `${basePath}${c.href}`)) return g.key;
      if (pathname.startsWith(groupPath + '/')) return g.key;
    }
    return 'overview' as const;
  }, [pathname, basePath]);

  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) {
      initial[g.key] = g.key === activeGroupKey;
    }
    return initial;
  });

  React.useEffect(() => {
    setOpen((prev) => ({ ...prev, [activeGroupKey]: true }));
  }, [activeGroupKey]);

  const activeGroup = NAV_GROUPS.find((group) => group.key === activeGroupKey);
  const mobileChildren = activeGroup?.children ?? [];

  return (
    <>
      {/* Mobile: compact top icon bar */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/[0.06] dark:bg-slate-900/80 lg:hidden">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← All Plans
            </Link>
            <div className="flex items-center gap-2">
              <div className="max-w-[60%] truncate text-right text-xs font-medium text-slate-900 dark:text-white">
                {appName}
              </div>
              <ThemeToggle className="hidden min-[420px]:inline-flex" />
            </div>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV_GROUPS.map((group) => {
            const href = `${basePath}${group.href}`;
            const isActive = group.key === activeGroupKey;
            const Icon = group.icon;

            return (
              <Link
                key={group.key}
                href={href}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {group.label}
              </Link>
            );
          })}
        </div>

        {mobileChildren.length > 0 && (
          <div className="flex gap-1 overflow-x-auto px-2 pb-2 pt-1 border-t border-slate-200/70 dark:border-white/[0.04]">
            {mobileChildren.map((child) => {
              const childHref = `${basePath}${child.href}`;
              const childActive = pathname === childHref;
              return (
                <Link
                  key={child.href}
                  href={childHref}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-[11px] whitespace-nowrap transition-colors',
                    childActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.04]'
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: left sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-white/[0.06] dark:bg-slate-900 lg:block">
        <div className="mb-6 px-2">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/dashboard"
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ← All Plans
            </Link>
            <ThemeToggle />
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {appName}
          </h3>
        </div>

        <nav className="space-y-1">
          {NAV_GROUPS.map((group) => {
            const Icon = group.icon;
            const groupHref = `${basePath}${group.href}`;

            const groupIsActive =
              group.key === 'overview'
                ? pathname === groupHref
                : pathname === groupHref ||
                  pathname.startsWith(groupHref + '/') ||
                  group.children?.some((c) => pathname === `${basePath}${c.href}`);

            if (!group.children?.length) {
              return (
                <Link
                  key={group.key}
                  href={groupHref}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    groupIsActive
                      ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{group.label}</span>
                </Link>
              );
            }

            return (
              <Collapsible
                key={group.key}
                open={!!open[group.key]}
                onOpenChange={(v) => setOpen((prev) => ({ ...prev, [group.key]: v }))}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      groupIsActive
                        ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left flex items-center gap-2">
                      {group.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform text-slate-500',
                        open[group.key] && 'rotate-180'
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-6 mt-1 space-y-0.5">
                    {group.children.map((child) => {
                      const childHref = `${basePath}${child.href}`;
                      const childActive = pathname === childHref;

                      return (
                        <Link
                          key={child.href}
                          href={childHref}
                          className={cn(
                            'group flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors',
                            childActive
                              ? 'bg-indigo-500/10 text-slate-900 dark:bg-white/[0.06] dark:text-white'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.03] dark:hover:text-slate-300'
                          )}
                        >
                          <span>{child.label}</span>
                          {childActive && (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
