import { NextRequest, NextResponse } from 'next/server';
import { getPlan } from '@/lib/db';

interface ImageInput {
  mimeType: string;
  base64Data: string;
}

interface GenerateSocialPostRequest {
  planId: string;
  platform: 'instagram' | 'tiktok';
  contentType: 'post' | 'reel' | 'story' | 'carousel';
  topic?: string; // optional theme/angle
  images?: ImageInput[]; // optional user photos for multimodal generation
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<GenerateSocialPostRequest>;

    const planId = body.planId;
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const platform = body.platform || 'instagram';
    const contentType = body.contentType || 'post';
    const topic = body.topic || '';

    // Validate optional user images (max 3, max ~7MB base64 each)
    const images: ImageInput[] = [];
    if (Array.isArray(body.images)) {
      for (const img of body.images.slice(0, 3)) {
        if (img && typeof img.mimeType === 'string' && typeof img.base64Data === 'string') {
          if (img.base64Data.length <= 7 * 1024 * 1024) {
            images.push({ mimeType: img.mimeType, base64Data: img.base64Data });
          }
        }
      }
    }

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const platformGuidelines: Record<string, string> = {
      instagram: `Instagram guidelines:
- Caption: 150-300 words, engaging hook in first line (before "...more")
- Use line breaks for readability
- 20-30 relevant hashtags (mix of broad + niche)
- Include a clear CTA
- Emoji usage: moderate, strategic
- For reels: suggest a hook, scene breakdown, trending audio direction
- For carousels: suggest 5-8 slide titles + key points per slide
- For stories: suggest 3-5 story frames with interactive elements (polls, questions)`,
      tiktok: `TikTok guidelines:
- Caption: 50-150 words, punchy and direct
- 3-5 hashtags max (trending + niche)
- Hook must grab attention in first 1-2 seconds
- Suggest a trending format/sound direction
- Include text overlay suggestions
- For posts: suggest visual concept
- Keep tone casual, authentic, slightly edgy`,
    };

    const systemPrompt = `You are an expert social media content creator specialising in app marketing on ${platform}.

${platformGuidelines[platform] || platformGuidelines.instagram}

Create a single ${contentType} for the app described below. Return valid JSON only.
${images.length > 0 ? `\nIMPORTANT: The user has provided ${images.length} photo(s). Study them carefully. Your caption MUST reference specific visual elements, colours, features, or scenes visible in the photos. Do NOT write generic copy — ground the caption in what you can actually see.` : ''}

Response schema:
{
  "caption": "string - the full post caption",
  "hashtags": ["string array"],
  "hook": "string - the attention-grabbing first line/moment",
  "media_concept": "string - what visual/video to create",
  "media_specs": {
    "format": "string - image/video/carousel",
    "aspect_ratio": "string - 1:1, 9:16, 4:5",
    "suggested_duration_seconds": number | null,
    "text_overlays": ["string array - text to show on screen"],
    "scene_breakdown": ["string array - scene descriptions for video"]
  },
  "cta": "string - call to action",
  "best_posting_time": "string - suggested time like '9:00 AM' or '7:30 PM'",
  "best_posting_day": "string - e.g. 'Tuesday' or 'Weekend'",
  "engagement_tips": ["string array - 2-3 tips to boost engagement"]
}`;

    const userContent = `APP: ${config.app_name || scraped.name || 'Unknown'}
ONE-LINER: ${config.one_liner || scraped.subtitle || ''}
CATEGORY: ${config.category || scraped.category || ''}
TARGET AUDIENCE: ${config.target_audience || ''}
PRICING: ${config.pricing || scraped.price || ''}
DIFFERENTIATORS: ${config.differentiators || ''}
RATING: ${scraped.rating || 'N/A'}
URL: ${config.app_url || scraped.url || ''}

CONTENT TYPE: ${contentType}
${topic ? `USER'S REQUESTED TOPIC: "${topic}" — the post MUST be about this specific topic.` : 'Generate a topic that would resonate with the target audience.'}

Generate a single compelling ${contentType} for ${platform}.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [
          { text: userContent },
          ...images.map(img => ({
            inlineData: { mimeType: img.mimeType, data: img.base64Data },
          })),
        ] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini error:', geminiResponse.status, errText);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    let post: Record<string, unknown>;
    try {
      post = JSON.parse(text);
    } catch {
      // Try to extract JSON
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
      }
      post = JSON.parse(match[0]);
    }

    return NextResponse.json({
      post,
      metadata: {
        platform,
        contentType,
        model: 'gemini-2.5-flash',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('generate-social-post error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
