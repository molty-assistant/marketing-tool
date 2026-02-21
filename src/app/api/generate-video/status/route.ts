import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const KIE_API_BASE = 'https://api.kie.ai/api/v1/jobs';

function getApiKey() {
  return process.env.KIE_API_KEY || '';
}

/**
 * GET /api/generate-video/status?taskId=xxx
 * Returns: { done: false } | { done: true, videoUrl } | { done: true, error: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId') || '';

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'KIE_API_KEY is not set' }, { status: 500 });
    }

    const res = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Task poll failed (${res.status} ${res.statusText}). ${text}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const state = json?.data?.state;

    if (state === 'success') {
      const resultJson = json?.data?.resultJson;
      if (!resultJson) {
        return NextResponse.json(
          { done: true, error: 'Task completed but resultJson is empty' },
          { status: 502 }
        );
      }

      let videoUrl: string | undefined;
      try {
        const parsed = JSON.parse(resultJson);
        videoUrl = parsed?.resultUrls?.[0];
      } catch {
        return NextResponse.json(
          { done: true, error: 'Failed to parse resultJson' },
          { status: 502 }
        );
      }

      if (!videoUrl) {
        return NextResponse.json(
          { done: true, error: 'Task completed but no video URL found' },
          { status: 502 }
        );
      }

      return NextResponse.json({ done: true, videoUrl });
    }

    if (state === 'fail') {
      const failMsg = json?.data?.failMsg || 'Unknown error';
      return NextResponse.json({ done: true, error: `Video generation failed: ${failMsg}` });
    }

    // waiting, queuing, generating
    return NextResponse.json({ done: false, state });
  } catch (err) {
    console.error('generate-video status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
