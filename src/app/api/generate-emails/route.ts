import { NextRequest, NextResponse } from 'next/server';
import { getPlan, saveContent, updatePlanContent, getPlanContent } from '@/lib/db';
import { guardApiRoute } from '@/lib/api-guard';

type SequenceType = 'welcome' | 'launch' | 'nurture';

interface GenerateEmailsRequest {
  planId: string;
  sequenceType?: SequenceType;
  emailCount?: number;
}

const VALID_SEQUENCE_TYPES: SequenceType[] = ['welcome', 'launch', 'nurture'];

function cleanAndParseJson(text: string): unknown {
  // Strip markdown code fences if present (common Gemini behaviour)
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  // If Gemini omitted the outer braces, try wrapping
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

export async function POST(request: NextRequest) {
  const rateLimitResponse = guardApiRoute(request, {
    endpoint: '/api/generate-emails',
    maxRequests: 10,
    windowSeconds: 60,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = (await request.json()) as Partial<GenerateEmailsRequest>;

    const planId = typeof body.planId === 'string' ? body.planId : '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const sequenceType: SequenceType =
      body.sequenceType && VALID_SEQUENCE_TYPES.includes(body.sequenceType)
        ? body.sequenceType
        : 'welcome';

    const emailCountRaw = typeof body.emailCount === 'number' ? body.emailCount : undefined;
    const emailCount =
      typeof emailCountRaw === 'number' && Number.isFinite(emailCountRaw)
        ? Math.max(1, Math.min(20, Math.round(emailCountRaw)))
        : 7;

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

    const welcomePurposes = [
      'DELIVER - deliver the lead magnet',
      'CONNECT - quick origin story + set expectations',
      'VALUE - teach one useful thing they can do today',
      'VALUE - another quick win (framework/checklist)',
      'BRIDGE - reframe the problem + why your solution works',
      'SOFT ASK - invite them to try / reply / low-friction CTA',
      'DIRECT ASK - clear offer + deadline/urgency (ethical)',
    ];

    const systemPrompt = `You are a direct-response email marketer.

Write a ${sequenceType} email sequence for the given app marketing plan.

Rules:
- Output MUST be valid JSON only (no markdown, no commentary).
- Write emails that sound like a real person (short sentences, contractions, no corporate fluff).
- Benefit-led, specific, and grounded in the plan's features/differentiators.
- Avoid unverifiable claims (no #1, guaranteed). If you add urgency, keep it ethical.
- Each email body must be in Markdown.
- Include a clear CTA per email: { text, action } where action describes what the link should do (e.g. "open onboarding", "book a demo", "read the blog post", "reply to this email").
- Include a sendDelay per email (e.g. "immediately", "+1 day", "+3 days").

Sequence requirements:
- For sequenceType=welcome, follow this exact purpose progression (7 emails):
  1) ${welcomePurposes[0]}
  2) ${welcomePurposes[1]}
  3) ${welcomePurposes[2]}
  4) ${welcomePurposes[3]}
  5) ${welcomePurposes[4]}
  6) ${welcomePurposes[5]}
  7) ${welcomePurposes[6]}
- If emailCount is not 7, keep the same progression but compress/expand logically.
- Subject lines: punchy, not spammy (no ALL CAPS, no excessive punctuation).
- Preview text: 35-90 characters.

Return JSON shape:
{
  "sequence": {
    "type": "welcome" | "launch" | "nurture",
    "description": "...",
    "emails": [
      {
        "number": 1,
        "purpose": "...",
        "subjectLine": "...",
        "previewText": "...",
        "body": "...",
        "cta": { "text": "...", "action": "..." },
        "sendDelay": "..."
      }
    ]
  },
  "metadata": { "model": "gemini-2.5-flash", "tokens": 0, "sequenceType": "..." }
}

Do not include any keys besides sequence and metadata.`;

    const userContent = `APP CONTEXT (structured):\n${JSON.stringify(appContext)}\n\nSCRAPED INFO (may be noisy):\n${JSON.stringify(scraped)}\n\nPLAN STAGES (markdown snippets):\n${JSON.stringify(stages)}\n\nFULL PLAN MARKDOWN:\n${row.generated}\n\nREQUEST:\nsequenceType=${sequenceType}\nemailCount=${emailCount}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
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

    // Ensure metadata tokens/model are present (don't trust model for this)
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const metadataRaw = (obj.metadata && typeof obj.metadata === 'object'
        ? (obj.metadata as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      metadataRaw.model = 'gemini-2.5-flash';
      metadataRaw.tokens = tokens;
      metadataRaw.sequenceType = sequenceType;
      obj.metadata = metadataRaw;
    }

    // Light validation to avoid UI crashes
    let emails: unknown = null;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const seq = obj.sequence;
      if (seq && typeof seq === 'object') {
        emails = (seq as Record<string, unknown>).emails;
      }
    }

    if (Array.isArray(emails) && emails.length > 0) {
      saveContent(planId, 'emails', null, JSON.stringify(parsed));
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Model did not return an email sequence. Please try again.' },
        { status: 502 }
      );
    }

    // Persist the generated email sequence (keyed by sequenceType)
    const existingEmails = (getPlanContent(planId).emails || {}) as Record<string, unknown>;
    existingEmails[sequenceType] = parsed;
    updatePlanContent(planId, 'emails', existingEmails);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('generate-emails error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
