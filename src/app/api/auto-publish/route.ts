import { NextRequest, NextResponse } from 'next/server';
import { getPlan, getDb } from '@/lib/db';

/**
 * Auto-publish: Generate a social post and queue it to Buffer in one step.
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

const ZAPIER_MCP_URL = 'https://mcp.zapier.com/api/v1/connect';
const ZAPIER_TOKEN = 'ZDY4MjBhNDktZWU0NC00ZDIwLThhNTctNjAyYWVjMzFhMmUzOmRNdDJqaFBKOFl4dERuVis0OVJZdEI2bGo1SVNla2dGUVptY2lxUEc0aGs9';

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

    // Step 1: Generate post via Gemini
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

    // Step 2: Post to Buffer via Zapier MCP
    const fullCaption = generated.hashtags?.length > 0
      ? `${generated.caption}\n\n${generated.hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}`
      : generated.caption;

    const channelInstruction = platform === 'instagram'
      ? 'Post to the Instagram channel'
      : 'Post to the TikTok channel';

    const method = publishNow ? 'now' : 'queue';

    const zapierPayload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'buffer_add_to_queue',
        arguments: {
          instructions: `${channelInstruction}. Method: ${method}.`,
          text: fullCaption,
        },
      },
    };

    const zapierResp = await fetch(`${ZAPIER_MCP_URL}?token=${ZAPIER_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(zapierPayload),
    });

    const zapierText = await zapierResp.text();
    let bufferResult: unknown = null;
    const lines = zapierText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.result) bufferResult = parsed.result;
        } catch { /* skip */ }
      }
    }
    if (!bufferResult) {
      try { bufferResult = JSON.parse(zapierText); } catch { bufferResult = { raw: zapierText.slice(0, 300) }; }
    }

    // Step 3: Log to DB
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT,
        platform TEXT NOT NULL,
        caption TEXT NOT NULL,
        hashtags TEXT,
        media_url TEXT,
        method TEXT NOT NULL DEFAULT 'queue',
        buffer_response TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.prepare(`
      INSERT INTO social_posts (plan_id, platform, caption, hashtags, method, buffer_response, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      planId,
      platform,
      generated.caption,
      JSON.stringify(generated.hashtags || []),
      method,
      JSON.stringify(bufferResult),
      zapierResp.ok ? 'queued' : 'failed'
    );

    return NextResponse.json({
      success: zapierResp.ok,
      platform,
      method,
      generated: {
        caption: generated.caption,
        hashtags: generated.hashtags,
        media_concept: generated.media_concept,
      },
      buffer: {
        status: zapierResp.status,
        result: bufferResult,
      },
    });
  } catch (err) {
    console.error('auto-publish error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
