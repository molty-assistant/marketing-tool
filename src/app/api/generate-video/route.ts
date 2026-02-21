import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const KIE_API_BASE = 'https://api.kie.ai/api/v1/jobs';

function getApiKey() {
  return process.env.KIE_API_KEY || '';
}

/**
 * POST /api/generate-video
 * Body: { planId, prompt, aspectRatio?, duration?, mode? }
 * Returns immediately: { success: true, taskId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const planId = body?.planId ? String(body.planId) : '';
    const customPrompt = body?.prompt ? String(body.prompt) : '';
    const bodyAspectRatio = body?.aspectRatio ? String(body.aspectRatio) : '1:1';
    const duration = body?.duration ? String(body.duration) : '6';
    const mode = body?.mode === 'pro' ? 'pro' : 'std';

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    if (!customPrompt || customPrompt.trim() === '') {
      return NextResponse.json(
        { error: 'Missing prompt' },
        { status: 400 }
      );
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'KIE_API_KEY is not set' }, { status: 500 });
    }

    const res = await fetch(`${KIE_API_BASE}/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'kling-3.0/video',
        input: {
          mode,
          prompt: customPrompt.slice(0, 2500),
          duration,
          aspect_ratio: bodyAspectRatio,
          multi_shots: false,
          sound: false,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Kling 3.0 task creation failed (${res.status} ${res.statusText}). ${text}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const taskId = json?.data?.taskId;
    if (!taskId) {
      return NextResponse.json(
        { error: `Unexpected Kie.ai response (missing taskId): ${JSON.stringify(json)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, taskId });
  } catch (err) {
    console.error('generate-video error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
