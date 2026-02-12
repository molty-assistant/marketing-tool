import { NextRequest, NextResponse } from 'next/server';
import { generateAssets } from '@/lib/asset-generator';
import { AssetConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, tagline, icon, url, features, colors } = body as AssetConfig;

    if (!name) {
      return NextResponse.json({ error: 'App name is required' }, { status: 400 });
    }

    const config: AssetConfig = {
      name,
      tagline: tagline || '',
      icon: icon || '🚀',
      url: url || '',
      features: features || [],
      colors: {
        background: colors?.background || '#0f172a',
        text: colors?.text || '#e2e8f0',
        primary: colors?.primary || '#6366f1',
        secondary: colors?.secondary || '#8b5cf6',
      },
    };

    const assets = generateAssets(config);
    return NextResponse.json({ assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate assets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
