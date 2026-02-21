import { NextRequest, NextResponse } from 'next/server';

// Proxy video downloads — Kie.ai result URLs are public but we proxy them
// so the browser gets a proper Content-Disposition download header.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uri = searchParams.get('uri');

  if (!uri) {
    return NextResponse.json({ error: 'Missing uri parameter' }, { status: 400 });
  }

  // Only allow HTTPS URLs
  if (!uri.startsWith('https://')) {
    return NextResponse.json({ error: 'Invalid URI — must be HTTPS' }, { status: 400 });
  }

  try {
    const response = await fetch(uri);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
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
