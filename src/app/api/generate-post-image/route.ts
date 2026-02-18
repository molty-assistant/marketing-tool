import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';
import { generateSocialTemplates } from '@/lib/socialTemplates';
import type { MarketingPlan } from '@/lib/types';
import fs from 'fs';
import path from 'path';

/**
 * Generate a single social post image and save it to public/generated/
 * Returns the public URL of the image.
 * 
 * POST /api/generate-post-image
 * { planId, platform: "instagram-post" | "instagram-story", caption?, style? }
 * 
 * Returns: { imageUrl: "/generated/abc123.png", width, height }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = body.planId;
    const platform = body.platform || 'instagram-post';
    const style = body.style || 'gradient';
    const caption = body.caption || '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const stages = JSON.parse(row.stages || '{}');

    // Build a minimal MarketingPlan for the template generator
    const plan: MarketingPlan = {
      id: planId,
      config: {
        app_name: config.app_name || 'App',
        one_liner: caption || config.one_liner || '',
        category: config.category || '',
        app_url: config.app_url || '',
        app_type: config.app_type || 'website',
        ...config,
      },
      scraped: JSON.parse(row.scraped || '{}'),
      stages,
      generated: row.generated || '',
      createdAt: row.created_at,
    };

    // Generate HTML template
    const templates = generateSocialTemplates({ plan, platforms: [platform], style, accentColor: config.accent_color || '#667eea' });
    
    if (templates.length === 0) {
      return NextResponse.json({ error: 'No template generated' }, { status: 500 });
    }

    const template = templates[0];

    // Render to PNG via our render-png API
    const baseUrl = request.nextUrl.origin;
    const renderRes = await fetch(`${baseUrl}/api/render-png`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: template.html,
        width: template.width,
        height: template.height,
      }),
    });

    if (!renderRes.ok) {
      return NextResponse.json({ error: 'Failed to render image' }, { status: 502 });
    }

    // Save to public/generated/
    const buffer = Buffer.from(await renderRes.arrayBuffer());
    const generatedDir = path.join(process.cwd(), 'public', 'generated');
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }

    const filename = `${planId}-${platform}-${Date.now()}.png`;
    const filePath = path.join(generatedDir, filename);
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/generated/${filename}`;

    return NextResponse.json({
      imageUrl,
      fullUrl: `${baseUrl}${imageUrl}`,
      width: template.width,
      height: template.height,
      platform,
      style,
    });
  } catch (err) {
    console.error('generate-post-image error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
