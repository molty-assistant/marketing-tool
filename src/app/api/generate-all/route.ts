import { NextRequest, NextResponse } from 'next/server';
import { updatePlanContent } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  generateBrandVoice,
  generatePositioningAngles,
  generateCompetitiveAnalysis,
  generateDraft,
  generateEmailsSequence,
  atomizeContent,
  generateTranslations,
  type SupportedLanguage,
} from '@/lib/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type StepId =
  | 'brand-voice'
  | 'positioning-angles'
  | 'competitive-analysis'
  | 'generate-draft'
  | 'generate-emails'
  | 'atomize-content'
  | 'generate-translations';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'brand-voice', label: 'Brand Voice' },
  { id: 'positioning-angles', label: 'Positioning Angles' },
  { id: 'competitive-analysis', label: 'Competitive Analysis' },
  { id: 'generate-draft', label: 'Draft Copy (6 sections, bold)' },
  { id: 'generate-emails', label: 'Email Sequence' },
  { id: 'atomize-content', label: 'Atomize Content' },
  { id: 'generate-translations', label: 'Translations (es,de,fr,ja,pt)' },
];

function line(obj: unknown): string {
  return JSON.stringify(obj) + '\n';
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { endpoint: '/api/generate-all', bucket: 'ai', maxRequests: 4, windowSec: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  const startedAt = Date.now();

  try {
    const body = (await request.json()) as { planId?: string };
    const planId = typeof body.planId === 'string' ? body.planId : '';

    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const wantsStream = request.headers.get('x-stream') === '1';

    const summary: {
      planId: string;
      generated: Record<StepId, boolean>;
      errors: Partial<Record<StepId, string>>;
      durationMs?: number;
    } = {
      planId,
      generated: {
        'brand-voice': false,
        'positioning-angles': false,
        'competitive-analysis': false,
        'generate-draft': false,
        'generate-emails': false,
        'atomize-content': false,
        'generate-translations': false,
      },
      errors: {},
    };

    const run = async (emit?: (o: unknown) => void) => {
      const pipelineGenerated: Record<string, unknown> = {};

      const save = () => {
        updatePlanContent(planId, {
          stagesPatch: {
            pipeline: {
              generatedAt: new Date().toISOString(),
              generated: pipelineGenerated,
            },
          },
        });
      };

      for (let i = 0; i < STEPS.length; i++) {
        const step = STEPS[i];
        emit?.({
          type: 'step:start',
          step: i + 1,
          total: STEPS.length,
          id: step.id,
          label: step.label,
        });

        try {
          switch (step.id) {
            case 'brand-voice': {
              const brandVoice = await generateBrandVoice(planId);
              pipelineGenerated.brandVoice = brandVoice;
              break;
            }
            case 'positioning-angles': {
              const positioning = await generatePositioningAngles(planId);
              pipelineGenerated.positioning = positioning;
              break;
            }
            case 'competitive-analysis': {
              const result = await generateCompetitiveAnalysis(planId);
              pipelineGenerated.competitive = result;
              break;
            }
            case 'generate-draft': {
              const { draft } = await generateDraft({
                planId,
                sections: [
                  'app_store_description',
                  'short_description',
                  'keywords',
                  'whats_new',
                  'feature_bullets',
                  'landing_page_hero',
                ],
                tone: 'bold',
              });
              pipelineGenerated.draftBold = draft;
              break;
            }
            case 'generate-emails': {
              const emails = await generateEmailsSequence({
                planId,
                sequenceType: 'welcome',
                emailCount: 7,
              });
              pipelineGenerated.emailsWelcome = emails;
              break;
            }
            case 'atomize-content': {
              const atoms = await atomizeContent({ planId });
              pipelineGenerated.atoms = atoms;
              break;
            }
            case 'generate-translations': {
              const targetLanguages: SupportedLanguage[] = [
                'es',
                'de',
                'fr',
                'ja',
                'pt-BR',
              ];
              const translations = await generateTranslations({
                planId,
                targetLanguages,
                sections: [
                  'app_store_description',
                  'short_description',
                  'keywords',
                ],
              });
              pipelineGenerated.translations = translations;
              break;
            }
          }

          summary.generated[step.id] = true;
          save();
          emit?.({
            type: 'step:complete',
            step: i + 1,
            total: STEPS.length,
            id: step.id,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          summary.errors[step.id] = msg;
          emit?.({
            type: 'step:error',
            step: i + 1,
            total: STEPS.length,
            id: step.id,
            error: msg,
          });
        }
      }

      summary.durationMs = Date.now() - startedAt;
      emit?.({ type: 'done', summary });
      return summary;
    };

    if (!wantsStream) {
      const final = await run();
      return NextResponse.json(final);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const emit = (o: unknown) =>
          controller.enqueue(encoder.encode(line(o)));
        emit({ type: 'start', total: STEPS.length, planId });
        run(emit)
          .catch((e) => {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            controller.enqueue(encoder.encode(line({ type: 'fatal', error: msg })));
          })
          .finally(() => controller.close());
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('generate-all error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
