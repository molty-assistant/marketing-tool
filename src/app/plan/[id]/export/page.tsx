import Link from 'next/link';
import { ChevronRight, Package, Image, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default async function ExportHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sections = [
    {
      title: 'Assets',
      description: 'Download generated images and export-ready assets',
      href: `/plan/${id}/assets`,
      icon: Image,
    },
    {
      title: 'Preview',
      description: 'Preview your plan output before sharing or exporting',
      href: `/plan/${id}/preview`,
      icon: Eye,
    },
    {
      title: 'Export',
      description: 'Bundle everything for sharing and collaboration',
      href: `/plan/${id}/distribute`,
      icon: Package,
    },
  ];

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Export</h1>
        <p className="text-slate-400 mt-1">
          Package your outputs, assets, and previews for shipping.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link href={section.href} key={section.href}>
              <Card className="group flex items-center justify-between p-5 bg-slate-800/50 border-white/[0.06] rounded-xl hover:border-indigo-500/30 hover:bg-slate-800/80 transition-all cursor-pointer">
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
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
