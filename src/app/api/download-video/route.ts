import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limit';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

// Proxy Veo 2 video downloads — the raw URI requires an API key header
// which browsers can't send via a plain <a href> link.
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/download-video', bucket: 'public', maxRequests: 20, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const uri = searchParams.get('uri');

  if (!uri) {
    return NextResponse.json({ error: 'Missing uri parameter' }, { status: 400 });
  }

  // Only allow Veo / Google AI file downloads
  if (!uri.startsWith('https://generativelanguage.googleapis.com/')) {
    return NextResponse.json({ error: 'Invalid URI' }, { status: 400 });
  }

  // Ensure alt=media is present
  const downloadUrl = uri.includes('alt=media') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}alt=media`;

  try {
    const response = await fetch(downloadUrl, {
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch video', detail: text.slice(0, 500) },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const videoBuffer = await response.arrayBuffer();

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment; filename="promo-video.mp4"',
        'Content-Length': String(videoBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error('download-video error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
