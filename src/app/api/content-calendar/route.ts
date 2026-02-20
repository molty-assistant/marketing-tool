import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

export type CalendarContentType = 'post' | 'reel' | 'story' | 'thread' | 'article';

export interface CalendarPost {
  date: string; // YYYY-MM-DD
  platform: string;
  content_type: CalendarContentType;
  title: string;
  draft_copy: string;
  hashtags: string[];
  suggested_time: string; // e.g. "09:30" or "9:30am"
  media_notes: string;
}

interface ContentCalendarRequest {
  planId: string;
  platforms: string[];
  weeks: number;
}

function cleanAndParseJson(text: string): unknown {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    cleaned = '{' + cleaned + '}';
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error('No JSON found');
    return JSON.parse(objMatch[0]);
  }
}

function isCalendarPost(x: unknown): x is CalendarPost {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.date === 'string' &&
    typeof o.platform === 'string' &&
    typeof o.content_type === 'string' &&
    typeof o.title === 'string' &&
    typeof o.draft_copy === 'string' &&
    Array.isArray(o.hashtags) &&
    typeof o.suggested_time === 'string' &&
    typeof o.media_notes === 'string'
  );
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/content-calendar', bucket: 'ai' });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = (await request.json()) as Partial<ContentCalendarRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const platformsRaw = Array.isArray(body.platforms) ? body.platforms : [];
    const platforms = platformsRaw
      .filter((p): p is string => typeof p === 'string')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "platforms"' },
        { status: 400 }
      );
    }

    const weeksRaw = typeof body.weeks === 'number' ? body.weeks : 0;
    const weeks = Number.isFinite(weeksRaw)
      ? Math.max(1, Math.min(4, Math.round(weeksRaw)))
      : 2;

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const appContext = {
      app_name: config?.app_name,
      one_liner: config?.one_liner,
      category: config?.category,
      target_audience: config?.target_audience,
      pricing: config?.pricing,
      differentiators: config?.differentiators,
      competitors: config?.competitors,
      distribution_channels: config?.distribution_channels,
      app_url: config?.app_url,
      app_type: config?.app_type,
    };

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    const systemPrompt = `You are a senior social media strategist and content marketer.

Create a ${weeks}-week posting calendar starting next Monday (relative to the user's locale). Use the given marketing plan.

Rules:
- Output MUST be valid JSON only (no markdown, no commentary).
- Return an ARRAY of scheduled posts.
- Each item MUST have this exact shape:
  {
    "date": "YYYY-MM-DD",
    "platform": string,
    "content_type": "post"|"reel"|"story"|"thread"|"article",
    "title": string,
    "draft_copy": string,
    "hashtags": string[],
    "suggested_time": string,
    "media_notes": string
  }
- Use only these platforms: ${platforms.map((p) => JSON.stringify(p)).join(', ')}
- Ensure dates are within the requested ${weeks} weeks window.
- Make the calendar realistic: 3-6 posts/week total across platforms, vary content types.
- Draft copy should be platform-appropriate and grounded in the app's differentiators.
- Hashtags: 3-12 relevant hashtags per item (no duplicates).
- suggested_time should be a local-time suggestion like "09:00" or "6:30pm".
- Avoid unverifiable claims (no #1, guaranteed).`;

    const userContent = `TODAY: ${todayIso}

APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}\n\nREQUEST:\nplatforms=${platforms.join(', ')}\nweeks=${weeks}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      console.error(
        'Unexpected Gemini response shape:',
        JSON.stringify(data).slice(0, 500)
      );
      return NextResponse.json(
        { error: 'Unexpected response from Gemini. Please try again.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = cleanAndParseJson(text);
    } catch {
      console.error('Failed to parse Gemini JSON:', text.slice(0, 500));
      return NextResponse.json(
        { error: 'Model returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const usage = data?.usageMetadata;
    const tokens =
      typeof usage?.totalTokenCount === 'number'
        ? usage.totalTokenCount
        : typeof usage?.promptTokenCount === 'number' &&
            typeof usage?.candidatesTokenCount === 'number'
          ? usage.promptTokenCount + usage.candidatesTokenCount
          : null;

    // Accept either an array directly, or { calendar: [...] }
    let calendarRaw: unknown = parsed;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const maybe = (parsed as Record<string, unknown>).calendar;
      if (maybe) calendarRaw = maybe;
    }

    const calendar: CalendarPost[] = Array.isArray(calendarRaw)
      ? calendarRaw.filter(isCalendarPost)
      : [];

    if (calendar.length === 0) {
      return NextResponse.json(
        { error: 'Model did not return a calendar. Please try again.' },
        { status: 502 }
      );
    }

    // Persist to plan_content
    saveContent(planId, 'calendar', null, JSON.stringify(calendar));

    return NextResponse.json({
      calendar,
      metadata: {
        model: 'gemini-2.0-flash',
        tokens,
        platforms,
        weeks,
      },
    });
  } catch (err) {
    console.error('content-calendar error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
