import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';
import { generateSocialTemplates } from '@/lib/socialTemplates';
import type { MarketingPlan } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Generate a single social post image and save it to /app/data/images/
 * (Railway persistent volume), then return a public URL that Buffer can fetch.
 *
 * POST /api/generate-post-image
 * { planId, platform: "instagram-post" | "instagram-story", caption?, style?, visualMode? }
 *
 * visualMode: "screenshot" | "hero" | "hybrid" (default: screenshot)
 *
 * Returns:
 * {
 *   filename: "abc123.png",
 *   publicUrl: "/api/images/abc123.png",
 *   fullPublicUrl: "https://.../api/images/abc123.png",
 *   width,
 *   height,
 *   platform,
 *   style
 * }
 */

const IMAGES_DIR = '/app/data/images';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = body.planId;
    const platform = body.platform || 'instagram-post';
    const style = body.style || 'gradient';
    const visualMode = body.visualMode || 'screenshot';
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
    const templates = generateSocialTemplates({
      plan,
      platforms: [platform],
      style,
      visualMode,
      accentColor: config.accent_color || '#667eea',
    });

    if (templates.length === 0) {
      return NextResponse.json({ error: 'No template generated' }, { status: 500 });
    }

    const template = templates[0];

    // Render to PNG via our render-png API — use localhost to avoid HTTPS SSL errors on Railway
    const internalBase = `http://localhost:${process.env.PORT || 3000}`;
    const baseUrl = (body.publicBase as string | undefined) || request.nextUrl.origin;
    const renderRes = await fetch(`${internalBase}/api/render-png`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY || '',
      },
      body: JSON.stringify({
        html: template.html,
        width: template.width,
        height: template.height,
      }),
    });

    if (!renderRes.ok) {
      return NextResponse.json({ error: 'Failed to render image' }, { status: 502 });
    }

    const buffer = Buffer.from(await renderRes.arrayBuffer());

    // Ensure images dir exists on Railway persistent volume
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    const filename = `${crypto.randomUUID()}.png`;
    const filePath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/api/images/${filename}`;

    return NextResponse.json({
      filename,
      publicUrl,
      fullPublicUrl: `${baseUrl}${publicUrl}`,
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
