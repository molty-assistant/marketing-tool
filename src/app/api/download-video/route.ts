import { NextRequest, NextResponse } from 'next/server';

// Allowed hostnames for video downloads — prevents SSRF via open proxy
const ALLOWED_HOSTS = new Set([
  'cdn.klingai.com',
  'cdn.kie.ai',
  'klingai.com',
  'kie.ai',
]);

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    // Allow exact match or subdomain match (e.g. cdn.klingai.com)
    return Array.from(ALLOWED_HOSTS).some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

// Proxy video downloads — Kie.ai result URLs are public but we proxy them
// so the browser gets a proper Content-Disposition download header.
// Also handles Kie.ai URL expiry by returning a clear error message.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uri = searchParams.get('uri');
  const aspect = searchParams.get('aspect') || '';

  if (!uri) {
    return NextResponse.json({ error: 'Missing uri parameter' }, { status: 400 });
  }

  if (!isAllowedUrl(uri)) {
    return NextResponse.json(
      { error: 'URL not allowed — only Kie.ai video URLs are supported' },
      { status: 403 }
    );
  }

  try {
    const response = await fetch(uri);

    if (!response.ok) {
      // Kie.ai URLs expire after some time — give user a clear message
      if (response.status === 403 || response.status === 410) {
        return NextResponse.json(
          { error: 'Video URL has expired. Please regenerate the video.', expired: true },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch video' },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const videoBuffer = await response.arrayBuffer();

    // Build descriptive filename with aspect ratio
    const aspectSuffix = aspect === '9:16' ? '-vertical' : aspect === '1:1' ? '-square' : '';
    const filename = `promo-video${aspectSuffix}.mp4`;

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(videoBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error('download-video error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
