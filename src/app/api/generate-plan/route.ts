import { NextRequest, NextResponse } from 'next/server';
import { generateMarketingPlan, scrapedToConfig } from '@/lib/plan-generator';
import { savePlan } from '@/lib/db';
import { AppConfig, ScrapedApp } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scraped, config: userConfig, goals, tone } = body as {
      scraped: ScrapedApp;
      config?: Partial<AppConfig>;
      goals?: string[];
      tone?: string;
    };

    if (!scraped || !scraped.name) {
      return NextResponse.json({ error: 'Scraped app data is required' }, { status: 400 });
    }

    // Build config from scraped data, merging any user overrides
    const baseConfig = scrapedToConfig(scraped);
    const config: AppConfig = {
      ...baseConfig,
      ...userConfig,
      differentiators: userConfig?.differentiators?.length ? userConfig.differentiators : baseConfig.differentiators,
      distribution_channels: userConfig?.distribution_channels?.length ? userConfig.distribution_channels : baseConfig.distribution_channels,
      competitors: userConfig?.competitors?.length ? userConfig.competitors : baseConfig.competitors,
    };

    const plan = generateMarketingPlan(config, scraped, goals, tone);

    // Auto-save to SQLite (DB-first: only return success if persisted)
    try {
      savePlan(plan);
    } catch (dbErr) {
      console.error('Failed to save plan to database:', dbErr);
      return NextResponse.json(
        { error: 'Failed to save plan. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
