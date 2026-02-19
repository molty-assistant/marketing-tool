import * as React from 'react';

import { PlanSidebar } from '@/components/PlanSidebar';
import { getPlan } from '@/lib/db';

/**
 * Plan page spacing conventions (UX-27)
 * - Page top padding: pt-6
 * - Section gap: mb-8
 * - Card internal padding: p-6
 * - Form field gap: space-y-4
 */

export default async function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let appName = 'Marketing Plan';
  try {
    const row = getPlan(id);
    if (row) {
      const config = JSON.parse(row.config) as { app_name?: string };
      if (config?.app_name) appName = config.app_name;
    }
  } catch {
    // Best-effort only — keep rendering.
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-900">
      <PlanSidebar planId={id} appName={appName} />
      <main className="flex-1 overflow-auto min-w-0 pt-6 page-enter">{children}</main>
    </div>
  );
}
