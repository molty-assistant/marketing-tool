import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

const DEFAULT_MODEL = 'models/veo-2.0-generate-001';
const GENERATE_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning';

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    // Prefer env vars when set; fallback to repo key per project instruction.
    'AIzaSyDUDWAd7UkEE3zPeUpqyqBzG0IU26-bGdU'
  );
}

type VeoTemplateConfig = {
  templates?: Record<
    string,
    {
      prompt: string;
      aspectRatio?: string;
      durationSeconds?: number;
    }
  >;
};

function loadTemplates(): VeoTemplateConfig {
  const configPath = path.join(process.cwd(), 'tools', 'veo-video.config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

/**
 * POST /api/generate-video
 * Body: { planId, template?, prompt?, aspectRatio? }
 * Returns immediately: { success: true, operationName }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const planId = body?.planId ? String(body.planId) : '';
    const templateName = body?.template ? String(body.template) : '';
    const customPrompt = body?.prompt ? String(body.prompt) : '';
    const bodyAspectRatio = body?.aspectRatio ? String(body.aspectRatio) : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    let prompt = customPrompt;
    let aspectRatio = bodyAspectRatio;

    if (templateName) {
      const config = loadTemplates();
      const tpl = config?.templates?.[templateName];
      if (!tpl) {
        return NextResponse.json(
          {
            error: `Unknown template "${templateName}"`,
            availableTemplates: Object.keys(config?.templates || {})
          },
          { status: 400 }
        );
      }
      prompt = prompt || tpl.prompt;
      aspectRatio = aspectRatio || tpl.aspectRatio || '';
    }

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Missing prompt (provide prompt or template)' },
        { status: 400 }
      );
    }

    const apiKey = getApiKey();

    const veoBody = {
      model: DEFAULT_MODEL,
      instances: [{ prompt }],
      parameters: {
        aspectRatio: aspectRatio || undefined,
        sampleCount: 1,
        durationSeconds: 6
      }
    };

    const res = await fetch(GENERATE_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(veoBody)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Veo generate failed (${res.status} ${res.statusText}). ${text}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const operationName = json?.name;
    if (!operationName) {
      return NextResponse.json(
        { error: `Unexpected Veo response (missing name): ${JSON.stringify(json)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, operationName });
  } catch (err) {
    console.error('generate-video error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
