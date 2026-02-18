import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    // Prefer env vars when set; fallback to repo key per project instruction.
    'AIzaSyDUDWAd7UkEE3zPeUpqyqBzG0IU26-bGdU'
  );
}

/**
 * GET /api/generate-video/status?operation=models/veo-2.0-generate-001/operations/xxx
 * Returns: { done: false } | { done: true, videoUrl }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationName = searchParams.get('operation') || '';

    if (!operationName) {
      return NextResponse.json({ error: 'Missing operation' }, { status: 400 });
    }

    const apiKey = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

    const res = await fetch(url, {
      headers: {
        'x-goog-api-key': apiKey
      }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Operation poll failed (${res.status} ${res.statusText}). ${text}` },
        { status: 502 }
      );
    }

    const json = await res.json();

    if (json?.error) {
      return NextResponse.json({ error: json.error }, { status: 502 });
    }

    if (json?.done !== true) {
      return NextResponse.json({ done: false });
    }

    const videoUri =
      json?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

    if (!videoUri) {
      return NextResponse.json(
        { done: true, error: 'Operation completed but video URI missing' },
        { status: 502 }
      );
    }

    // Return a temporary download link. (No proxying needed.)
    const videoUrl = videoUri.includes('?')
      ? `${videoUri}&alt=media`
      : `${videoUri}?alt=media`;

    return NextResponse.json({ done: true, videoUrl });
  } catch (err) {
    console.error('generate-video status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
