import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

interface AtomizeContentRequest {
  planId: string;
  sourceContent?: string;
  platforms?: string[];
}

const DEFAULT_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'twitter', 'reddit', 'email'] as const;

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
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found');
    return JSON.parse(jsonMatch[0]);
  }
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string' && v.trim().length > 0) as string[];
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/atomize-content',
    maxRequests: 8,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = (await request.json()) as Partial<AtomizeContentRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const platforms =
      body.platforms && Array.isArray(body.platforms) && body.platforms.length > 0
        ? safeStringArray(body.platforms)
        : [...DEFAULT_PLATFORMS];

    const sourceContent = typeof body.sourceContent === 'string' ? body.sourceContent.trim() : '';

    const row = getPlan(planId);
    if (!row) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const config = JSON.parse(row.config || '{}');
    const scraped = JSON.parse(row.scraped || '{}');
    const stages = JSON.parse(row.stages || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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

    const systemPrompt = `You are a content strategist and social copywriter.

Your job: take ONE core piece of content about the product and atomize it into many platform-native pieces.

Rules:
- Output MUST be valid JSON only (no markdown fences, no commentary).
- Tone: human, specific, non-corporate. Avoid hype.
- Reference real product features/benefits from the plan context.
- If sourceContent is empty, first create a "corePiece" (blog post / announcement) that would make sense to publish.
- Then generate 12-15+ content atoms derived from the core piece across the requested platforms.
- Each atom must include characterCount (count the characters of the content field) and helpful posting notes.
- When platform is twitter, include both a thread and at least one single tweet.
- When platform is reddit, keep it authentic, no marketing speak; include suggested subreddits.
- When platform is instagram, write a visually-led caption with a strong hook in the first line, emojis, line breaks for readability, and 5-10 relevant hashtags. Format: "hook\n\nbody\n\nCTA\n\n#hashtags". Keep under 2200 chars.
- When platform is tiktok, write a punchy video script caption (hook + 3 key points + CTA) under 300 chars for the caption, plus a "videoScript" style notes field with talking points for a 30-60s video. Include trending-style hashtags.

Return JSON shape:
{
  "corePiece": { "title": "...", "content": "..." },
  "atoms": [
    {
      "platform": "linkedin" | "twitter" | "instagram" | "reddit" | "email" | string,
      "format": "...",
      "content": "...",
      "hashtags": ["#tag"],
      "subreddits": ["/r/..."],
      "characterCount": 123,
      "notes": "..."
    }
  ],
  "metadata": { "model": "gemini-2.5-flash", "tokens": 0, "atomCount": 15 }
}

Do not include any keys besides corePiece, atoms, metadata.`;

    const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}\n\nREQUEST:\nplatforms=${JSON.stringify(platforms)}\n\nSOURCE CONTENT (if provided):\n${sourceContent || '(none)'}`;

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
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
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

    // Server-side fixups: character counts + metadata
    let atoms: Record<string, unknown>[] = [];
    let corePieceContent: string | null = null;

    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const atomsRaw = obj.atoms;
      if (Array.isArray(atomsRaw)) {
        atoms = atomsRaw.filter((a) => a && typeof a === 'object') as Record<string, unknown>[];
      }

      const corePiece = obj.corePiece;
      if (corePiece && typeof corePiece === 'object') {
        const content = (corePiece as Record<string, unknown>).content;
        if (typeof content === 'string') corePieceContent = content;
      }

      for (const atom of atoms) {
        const contentVal = typeof atom.content === 'string' ? (atom.content as string) : '';
        atom.characterCount = contentVal.length;
      }

      const metadataRaw = (obj.metadata && typeof obj.metadata === 'object'
        ? (obj.metadata as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      metadataRaw.model = 'gemini-2.5-flash';
      metadataRaw.tokens = tokens;
      metadataRaw.atomCount = atoms.length;
      obj.metadata = metadataRaw;
    }

    if (corePieceContent && atoms.length >= 8) {
      saveContent(planId, 'atoms', null, JSON.stringify(parsed));
    }

    if (!corePieceContent || atoms.length < 8) {
      return NextResponse.json(
        { error: 'Model did not return enough content atoms. Please try again.' },
        { status: 502 }
      );
    }

    // Persist the generated atoms
    updatePlanContent(planId, 'atoms', parsed);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('atomize-content error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
