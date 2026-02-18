import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface PostToBufferRequest {
  planId: string;
  platform: 'instagram' | 'tiktok';
  caption: string;
  hashtags?: string[];
  mediaUrl?: string; // optional image/video URL
  imageFilename?: string; // optional filename returned by /api/generate-post-image
  publishNow?: boolean; // true = post immediately, false = add to queue
}

// Zapier MCP endpoint for Buffer
const ZAPIER_MCP_URL = 'https://mcp.zapier.com/api/v1/connect';
const ZAPIER_TOKEN = 'ZDY4MjBhNDktZWU0NC00ZDIwLThhNTctNjAyYWVjMzFhMmUzOmRNdDJqaFBKOFl4dERuVis0OVJZdEI2bGo1SVNla2dGUVptY2lxUEc0aGs9';

// Public base URL for Buffer to fetch attachments from (Railway production)
const PUBLIC_BASE_URL = 'https://marketing-tool-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PostToBufferRequest>;

    if (!body.caption) {
      return NextResponse.json({ error: 'Missing caption' }, { status: 400 });
    }

    const platform = body.platform || 'instagram';
    const hashtags = body.hashtags || [];
    const fullText = hashtags.length > 0
      ? `${body.caption}\n\n${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`
      : body.caption;

    const method = body.publishNow ? 'now' : 'queue';

    // Prefer imageFilename (served via our /api/images route) over raw mediaUrl
    const attachmentUrl = body.imageFilename
      ? `${PUBLIC_BASE_URL}/api/images/${encodeURIComponent(body.imageFilename)}`
      : (body.mediaUrl || null);

    // Build instructions for Buffer via Zapier
    const channelInstruction = platform === 'instagram'
      ? 'Post to the Instagram channel'
      : 'Post to the TikTok channel';

    const zapierPayload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'buffer_add_to_queue',
        arguments: {
          instructions: `${channelInstruction}. Method: ${method}.`,
          output_hint: 'confirmation that the post was queued or sent, including any post ID or URL',
          text: fullText,
          method: method === 'now' ? 'Share Now' : 'Add to Queue',
          ...(attachmentUrl ? { attachment: attachmentUrl } : {}),
        },
      },
    };

    const zapierResponse = await fetch(`${ZAPIER_MCP_URL}?token=${ZAPIER_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(zapierPayload),
    });

    const responseText = await zapierResponse.text();

    // Parse SSE response - look for the result
    let result: unknown = null;
    const lines = responseText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.result) {
            result = parsed.result;
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }

    // If not SSE, try direct JSON
    if (!result) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { raw: responseText.slice(0, 500) };
      }
    }

    // Log to DB for tracking
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

    const stmt = db.prepare(`
      INSERT INTO social_posts (plan_id, platform, caption, hashtags, media_url, method, buffer_response, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      body.planId || null,
      platform,
      body.caption,
      JSON.stringify(hashtags),
      attachmentUrl,
      method,
      JSON.stringify(result),
      zapierResponse.ok ? 'queued' : 'failed'
    );

    return NextResponse.json({
      success: zapierResponse.ok,
      platform,
      method,
      attachmentUrl,
      bufferStatus: zapierResponse.status,
      result,
    });
  } catch (err) {
    console.error('post-to-buffer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: list posted content history
export async function GET() {
  try {
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

    const posts = db.prepare('SELECT * FROM social_posts ORDER BY created_at DESC LIMIT 50').all();
    return NextResponse.json({ posts });
  } catch (err) {
    console.error('social-posts GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
