import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getDb } from '@/lib/db';

export interface SectionStatus {
  hasContent: boolean;
  preview: string;
}

export interface OverviewResponse {
  plan: {
    id: string;
    config: {
      app_name: string;
      app_url: string;
      one_liner: string;
      app_type: string;
      category: string;
      pricing: string;
      distribution_channels: string[];
      icon?: string;
    };
    generated: string;
    stages: Record<string, string>;
    createdAt: string;
    updatedAt: string;
  };
  sections: Record<string, SectionStatus>;
  socialPostsCount: number;
  scheduleCount: number;
  wordCount: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = getPlan(id);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const db = getDb();

    // Get all plan_content types for this plan
    const contentRows = db
      .prepare('SELECT content_type FROM plan_content WHERE plan_id = ?')
      .all(id) as { content_type: string }[];
    const contentTypes = new Set(contentRows.map((r) => r.content_type));

    // Count social posts (table created lazily by post-to-buffer)
    let socialPostsCount = 0;
    try {
      const tableExists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='social_posts'")
        .get();
      if (tableExists) {
        const socialResult = db
          .prepare('SELECT COUNT(*) as count FROM social_posts WHERE plan_id = ?')
          .get(id) as { count: number } | undefined;
        socialPostsCount = socialResult?.count ?? 0;
      }
    } catch {
      // Table doesn't exist yet — that's fine
    }

    // Count scheduled (non-cancelled) items
    const scheduleResult = db
      .prepare(
        "SELECT COUNT(*) as count FROM content_schedule WHERE plan_id = ? AND status != 'cancelled'"
      )
      .get(id) as { count: number } | undefined;
    const scheduleCount = scheduleResult?.count ?? 0;

    // Parse stored JSON
    const stages = JSON.parse(row.stages || '{}') as Record<string, string>;
    const config = JSON.parse(row.config) as {
      app_name: string;
      app_url: string;
      one_liner: string;
      app_type: string;
      category: string;
      pricing: string;
      distribution_channels: string[];
      icon?: string;
    };

    const hasStage = (key: string) =>
      typeof stages[key] === 'string' && stages[key].trim().length > 0;

    const stagePreview = (key: string) =>
      hasStage(key) ? stages[key].slice(0, 120).replace(/\n+/g, ' ').trim() : '';

    // Section status map
    const sections: Record<string, SectionStatus> = {
      brief: {
        hasContent: !!(row.generated?.trim()),
        preview: row.generated?.slice(0, 120).replace(/\n+/g, ' ').trim() || '',
      },
      foundation: {
        hasContent:
          hasStage('foundation') ||
          contentTypes.has('brand-voice') ||
          contentTypes.has('positioning'),
        preview: stagePreview('foundation'),
      },
      draft: {
        hasContent: contentTypes.has('draft') || hasStage('structure'),
        preview: stagePreview('structure'),
      },
      copy: {
        hasContent: hasStage('assets') || contentTypes.has('variant-scores'),
        preview: stagePreview('assets'),
      },
      templates: {
        hasContent: hasStage('assets'),
        preview: stagePreview('assets'),
      },
      keywords: {
        hasContent: contentTypes.has('keyword-research'),
        preview: '',
      },
      distribute: {
        hasContent: hasStage('distribution') || contentTypes.has('atoms'),
        preview: stagePreview('distribution'),
      },
      emails: {
        hasContent: contentTypes.has('emails'),
        preview: '',
      },
      social: {
        hasContent: socialPostsCount > 0,
        preview: socialPostsCount > 0 ? `${socialPostsCount} post${socialPostsCount !== 1 ? 's' : ''} generated` : '',
      },
      schedule: {
        hasContent: scheduleCount > 0,
        preview: scheduleCount > 0 ? `${scheduleCount} item${scheduleCount !== 1 ? 's' : ''} scheduled` : '',
      },
      translate: {
        hasContent: contentTypes.has('translations'),
        preview: '',
      },
      serp: {
        hasContent: !!(config.app_url && config.one_liner),
        preview: config.app_url || '',
      },
    };

    // Approximate word count of the main generated field
    const wordCount = row.generated
      ? row.generated.split(/\s+/).filter(Boolean).length
      : 0;

    const response: OverviewResponse = {
      plan: {
        id: row.id,
        config,
        generated: row.generated,
        stages,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      sections,
      socialPostsCount,
      scheduleCount,
      wordCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch overview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
