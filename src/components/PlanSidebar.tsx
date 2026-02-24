'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ChevronDown,
  ChevronRight,
  Zap,
  MoreHorizontal,
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

type NavGroupKey =
  | 'create'
  | 'plan'
  | 'more';

type NavGroup = {
  key: NavGroupKey;
  label: string;
  href: string; // group landing route under /plan/[id]
  icon: React.ComponentType<{ className?: string }>; // lucide
  children?: NavChild[];
  alwaysOpen?: boolean; // if true, section cannot be collapsed
};

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'create',
    label: 'Create',
    icon: Zap,
    href: '/strategy/brief',
    alwaysOpen: true,
    children: [
      { label: 'Brief', href: '/strategy/brief' },
      { label: 'Copy Draft', href: '/draft' },
    ],
  },
  {
    key: 'plan',
    label: 'Plan',
    icon: LayoutDashboard,
    href: '',
    children: [
      { label: 'Overview', href: '' },
    ],
  },
  {
    key: 'more',
    label: 'Supporting Tools',
    icon: Package,
    href: '/strategy',
    children: [
      { label: 'Brief', href: '/strategy/brief' },
      { label: 'Foundation', href: '/foundation' },
      { label: 'Competitors', href: '/competitors' },
      { label: 'Reviews', href: '/reviews' },
      { label: 'Copy Draft', href: '/draft' },
      { label: 'Tone Compare', href: '/tone-compare' },
      { label: 'Email Sequences', href: '/emails' },
      { label: 'Templates', href: '/templates' },
      { label: 'Translations', href: '/translate' },
      { label: 'Approvals', href: '/approvals' },
      { label: 'Distribute', href: '/distribute' },
      { label: 'Performance', href: '/performance' },
      { label: 'Keywords', href: '/keywords' },
      { label: 'SERP Preview', href: '/serp' },
      { label: 'Variants', href: '/variants' },
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

  const SIDEBAR_STATE_KEY = 'sidebar-collapsed';

  const activeGroupKey = React.useMemo((): NavGroupKey => {
    // Most-specific match first — check children before group-level
    for (const g of NAV_GROUPS) {
      if (g.children?.some((c) => pathname === `${basePath}${c.href}`)) return g.key;
    }
    // Then check group landing routes
    for (const g of NAV_GROUPS) {
      const groupPath = `${basePath}${g.href}`;
      if (g.key === 'plan' && pathname === basePath) return g.key;
      if (pathname === groupPath) return g.key;
      if (g.href && pathname.startsWith(groupPath + '/')) return g.key;
    }
    return 'plan';
  }, [pathname, basePath]);

  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        // Create is always open
        parsed.create = true;
        return parsed;
      }
    } catch { /* ignore */ }
    return {
      create: true,
      plan: true,
      more: false,
    };
  });

  React.useEffect(() => {
    setOpen((prev) => ({ ...prev, [activeGroupKey]: true }));
  }, [activeGroupKey]);

  React.useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(open));
    } catch { /* ignore */ }
  }, [open]);

  const createGroup = NAV_GROUPS.find((g) => g.key === 'create');
  const suiteGroups = NAV_GROUPS.filter((g) => g.key !== 'create');
  const activeGroup = NAV_GROUPS.find((group) => group.key === activeGroupKey);
  const mobileChildren = activeGroup?.children ?? [];
  const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);

  return (
    <>
      {/* Mobile: compact top nav */}
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

        {/* Primary row: Create items + More */}
        <div className="flex gap-1 overflow-x-auto px-2 pb-2">
          {createGroup?.children?.map((child) => {
            const href = `${basePath}${child.href}`;
            const isActive = pathname === href;
            return (
              <Link
                key={child.href}
                href={href}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                )}
              >
                {child.label}
              </Link>
            );
          })}
          {/* Overview link */}
          <Link
            href={basePath}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              activeGroupKey === 'plan'
                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
            )}
          >
            Overview
          </Link>
          {/* More button for suite sections */}
          <button
            type="button"
            onClick={() => setMobileMoreOpen((v) => !v)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              mobileMoreOpen
                ? 'bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
            )}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            More
          </button>
        </div>

        {/* Suite sections (shown when More is open or active group is a suite group) */}
        {(mobileMoreOpen || (activeGroupKey !== 'create' && activeGroupKey !== 'plan')) && (
          <>
            <div className="flex gap-1 overflow-x-auto px-2 pb-2 pt-1 border-t border-slate-200/70 dark:border-white/[0.04]">
              {suiteGroups.filter((g) => g.key !== 'plan').map((group) => {
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

            {mobileChildren.length > 0 && activeGroupKey !== 'create' && (
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
          </>
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
              group.key === 'plan'
                ? pathname === basePath
                : pathname === groupHref ||
                (group.href !== '' && pathname.startsWith(groupHref + '/')) ||
                group.children?.some((c) => pathname === `${basePath}${c.href}`);

            // Always-open section (Create) — no collapse, visually distinct
            if (group.alwaysOpen && group.children?.length) {
              return (
                <div key={group.key} className="mb-2">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    <Icon className="w-3.5 h-3.5" />
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.children.map((child) => {
                      const childHref = `${basePath}${child.href}`;
                      const childActive = pathname === childHref;
                      return (
                        <Link
                          key={child.href}
                          href={childHref}
                          className={cn(
                            'group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            childActive
                              ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.04] dark:hover:text-white'
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
                  <div className="mx-3 my-2 border-b border-slate-200 dark:border-white/[0.06]" />
                </div>
              );
            }

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
