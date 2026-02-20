import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui/card';

type IconComponent = React.ComponentType<{ className?: string }>;

export function PlanPageShell({
  title,
  description,
  helper,
  children,
}: {
  title: string;
  description: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-10 pt-6 sm:px-8">
      {helper && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300">
          {helper}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>

      {children}
    </div>
  );
}

export function PlanLinkCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: IconComponent;
}) {
  return (
    <Link href={href}>
      <Card className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-300 dark:border-white/[0.06] dark:bg-slate-800/50 dark:hover:border-indigo-500/30 dark:hover:bg-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">{title}</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:text-slate-300" />
      </Card>
    </Link>
  );
}
