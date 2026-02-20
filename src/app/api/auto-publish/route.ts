import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

/**
 * Auto-publish: Generate a social post + image and queue it to Buffer in one step.
 * This is the endpoint that cron jobs / scheduled tasks call.
 *
 * POST /api/auto-publish
 * {
 *   planId: string,
 *   platform: "instagram" | "tiktok",
 *   contentType?: "post" | "reel" | "story" | "carousel",
 *   topic?: string,
 *   publishNow?: boolean  // default false (queue)
 * }
 */

interface AutoPublishRequest {
  planId: string;
  platform: 'instagram' | 'tiktok';
  contentType?: string;
  topic?: string;
  publishNow?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<AutoPublishRequest>;

    const planId = body.planId;
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const platform = body.platform || 'instagram';
    const contentType = body.contentType || 'post';
    const topic = body.topic || '';
    const publishNow = body.publishNow ?? false;

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');

    // Step 1: Generate post text via Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const platformGuidelines: Record<string, string> = {
      instagram: `Create an Instagram ${contentType}. Caption: 150-300 words with engaging hook. 20-30 hashtags (mix broad + niche). Clear CTA. Moderate emoji use.`,
      tiktok: `Create a TikTok ${contentType}. Caption: 50-150 words, punchy. 3-5 hashtags. Hook in first 2 seconds. Casual authentic tone.`,
    };

    const systemPrompt = `You are an expert social media marketer. Generate a single ${platform} ${contentType} for the app below.

${platformGuidelines[platform] || platformGuidelines.instagram}

Return valid JSON:
{
  "caption": "full caption text",
  "hashtags": ["tag1", "tag2"],
  "media_concept": "what image/video to create"
}`;

    const userContent = `APP: ${config.app_name || scraped.name || 'Unknown'}
ONE-LINER: ${config.one_liner || scraped.subtitle || ''}
CATEGORY: ${config.category || scraped.category || ''}
TARGET AUDIENCE: ${config.target_audience || ''}
URL: ${config.app_url || scraped.url || ''}
${topic ? `ANGLE: ${topic}` : 'Choose an engaging angle.'}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResp.ok) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const geminiData = await geminiResp.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let generated: { caption: string; hashtags: string[]; media_concept?: string };
    try {
      generated = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return NextResponse.json({ error: 'Invalid AI JSON' }, { status: 502 });
      generated = JSON.parse(match[0]);
    }

    // Internal base URL — use localhost to avoid HTTPS SSL errors on Railway
    const internalBase = `http://localhost:${process.env.PORT || 3000}`;
    const publicBase = `https://${process.env.RAILWAY_PUBLIC_DOMAIN || request.nextUrl.host}`;

    // Step 2: Generate a social image (stored on persistent volume)
    let image: { filename?: string; publicUrl?: string; fullPublicUrl?: string } | null = null;
    try {
      const imgPlatform = platform === 'tiktok' ? 'instagram-story' : 'instagram-post';
      const imgRes = await fetch(`${internalBase}/api/generate-post-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.API_KEY || '',
        },
        body: JSON.stringify({
          planId,
          platform: imgPlatform,
          caption: generated.caption,
          publicBase,
        }),
      });
      if (imgRes.ok) {
        image = await imgRes.json();
      }
    } catch {
      image = null;
    }

    // Step 3: Post to Buffer via our dedicated endpoint (which calls Zapier MCP)
    const bufferRes = await fetch(`${internalBase}/api/post-to-buffer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY || '',
      },
      body: JSON.stringify({
        planId,
        platform,
        caption: generated.caption,
        hashtags: generated.hashtags || [],
        publishNow,
        imageFilename: image?.filename,
      }),
    });

    const bufferJson = await bufferRes.json();

    return NextResponse.json({
      success: bufferRes.ok && bufferJson?.success,
      platform,
      publishNow,
      generated: {
        caption: generated.caption,
        hashtags: generated.hashtags,
        media_concept: generated.media_concept,
      },
      image,
      buffer: bufferJson,
    });
  } catch (err) {
    console.error('auto-publish error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
