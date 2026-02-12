import { NextRequest, NextResponse } from 'next/server';
import { generateMarketingPlan, scrapedToConfig } from '@/lib/plan-generator';
import { AppConfig, ScrapedApp } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scraped, config: userConfig } = body as { scraped: ScrapedApp; config?: Partial<AppConfig> };

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

    const plan = generateMarketingPlan(config, scraped);
    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
