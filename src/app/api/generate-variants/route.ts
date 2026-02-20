import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limit';

interface GenerateVariantsRequest {
  text: string;
  context: string;
  count?: number;
}

function coerceCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 3;
  const int = Math.floor(value);
  return Math.min(6, Math.max(1, int));
}

function extractJsonArray(text: string): string[] | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed;
  } catch {
    // fallthrough
  }

  // Fallback: try to extract the first JSON array substring.
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;

  const maybe = trimmed.slice(start, end + 1);
  try {
    const parsed = JSON.parse(maybe);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed;
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/generate-variants', bucket: 'ai' });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = (await request.json()) as Partial<GenerateVariantsRequest>;

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or empty "text" field' }, { status: 400 });
    }

    const context = typeof body.context === 'string' ? body.context : '';
    const count = coerceCount(body.count);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `Generate ${count} distinct marketing copy variants for this template. Each should have a different angle/tone: one punchy and bold, one conversational and friendly, one data-driven and professional. Return ONLY a JSON array of strings, no markdown. Context about the app: ${context}.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: body.text }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      }),
    }).finally(() => clearTimeout(timeout));

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error (${geminiResponse.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: 'Unexpected response from Gemini. Please try again.' }, { status: 502 });
    }

    const variants = extractJsonArray(rawText);
    if (!variants) {
      console.error('Could not parse variants JSON:', rawText.slice(0, 500));
      return NextResponse.json(
        { error: 'Gemini did not return valid JSON variants. Please try again.' },
        { status: 502 }
      );
    }

    const cleaned = variants
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, count);

    if (cleaned.length === 0) {
      return NextResponse.json(
        { error: 'No variants returned. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ variants: cleaned });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out. Please try again.' }, { status: 504 });
    }

    console.error('generate-variants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
