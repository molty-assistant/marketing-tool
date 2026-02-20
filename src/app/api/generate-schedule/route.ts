import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPlan } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

/**
 * Auto-generate a week of scheduled content using AI.
 *
 * POST /api/generate-schedule
 * { planId, platform?, startDate?, days? }
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-schedule',
    maxRequests: 12,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { planId, platform = 'instagram', startDate, days = 7 } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const appName = config.app_name || scraped.name || 'Unknown App';

    const start = startDate ? new Date(startDate) : new Date();
    // Round to next day if no startDate
    if (!startDate) {
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
    }

    const optimalTimes: Record<string, string[]> = {
      instagram: ['09:00', '12:00', '17:00', '20:00'],
      tiktok: ['07:00', '10:00', '14:00', '19:00'],
    };

    const times = optimalTimes[platform] || optimalTimes.instagram;

    const systemPrompt = `You are an expert social media strategist. Generate a content schedule for ${days} days.

Create diverse, engaging content topics for ${platform}. Mix these categories:
- Tips & how-tos
- Feature highlights
- User testimonials / social proof
- Behind-the-scenes / team stories
- Industry trends & insights
- Engagement posts (polls, questions)
- Seasonal / timely content

Return valid JSON array:
[
  {
    "day": 1,
    "time": "HH:MM",
    "topic": "brief topic description",
    "content_type": "post|reel|story|carousel",
    "category": "tips|feature|testimonial|bts|trends|engagement|seasonal"
  }
]

Schedule 1-2 posts per day. Use these optimal times: ${times.join(', ')}.
Vary content types and categories across the week.`;

    const userContent = `APP: ${appName}
DESCRIPTION: ${config.one_liner || scraped.subtitle || ''}
CATEGORY: ${config.category || scraped.category || ''}
TARGET AUDIENCE: ${config.target_audience || ''}
PLATFORM: ${platform}
DAYS: ${days}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.9,
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

    let schedule: Array<{ day: number; time: string; topic: string; content_type: string }>;
    try {
      schedule = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return NextResponse.json({ error: 'Invalid AI JSON' }, { status: 502 });
      schedule = JSON.parse(match[0]);
    }

    // Insert into DB
    const db = getDb();
    const created: string[] = [];

    for (const item of schedule) {
      const date = new Date(start);
      date.setDate(date.getDate() + (item.day - 1));
      const [hours, minutes] = item.time.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      const scheduledAt = date.toISOString().replace('T', ' ').slice(0, 19);
      const id = crypto.randomUUID();

      db.prepare(`
        INSERT INTO content_schedule (id, plan_id, platform, content_type, topic, scheduled_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, planId, platform, item.content_type || 'post', item.topic, scheduledAt);

      created.push(id);
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      ids: created,
    });
  } catch (err) {
    console.error('generate-schedule error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
