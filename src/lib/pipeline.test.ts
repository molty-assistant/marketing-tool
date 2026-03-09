import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test parseGeminiJson which is not exported.
// We'll test it indirectly through callGemini behavior,
// and also test the exported pipeline functions with mocked DB + fetch.

// Mock db module
vi.mock('@/lib/db', () => ({
  getPlan: vi.fn(),
  getDb: vi.fn(),
}));

import { getPlan } from '@/lib/db';
import { generateBrandVoice, generatePositioningAngles, SUPPORTED_LANGUAGES } from './pipeline';

const mockGetPlan = vi.mocked(getPlan);

const fakePlanRow = {
  id: 'plan-1',
  config: JSON.stringify({ app_name: 'TestApp', category: 'Utilities', app_url: 'https://testapp.com' }),
  scraped: JSON.stringify({ description: 'A test app', features: ['feature 1'] }),
  generated: '# Test Plan',
  stages: JSON.stringify({ research: 'done' }),
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  share_token: null,
};

beforeEach(() => {
  vi.restoreAllMocks();
  mockGetPlan.mockReturnValue(fakePlanRow as never);
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
});

describe('parseGeminiJson (tested via callGemini)', () => {
  it('parses clean JSON response', async () => {
    const responseData = { voiceSummary: 'Bold and direct' };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: JSON.stringify(responseData) }] } }],
        usageMetadata: { totalTokenCount: 100 },
      }),
    }));

    const result = await generateBrandVoice('plan-1');
    expect(result).toEqual(responseData);
  });

  it('handles markdown code block wrapping', async () => {
    const responseData = { voiceSummary: 'Wrapped response' };
    const wrappedText = '```json\n' + JSON.stringify(responseData) + '\n```';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: wrappedText }] } }],
        usageMetadata: { totalTokenCount: 50 },
      }),
    }));

    const result = await generateBrandVoice('plan-1');
    expect(result).toEqual(responseData);
  });

  it('handles JSON without outer braces', async () => {
    // Text like: "key": "value" (missing outer braces)
    const rawText = '"voiceSummary": "No braces"';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: rawText }] } }],
        usageMetadata: { totalTokenCount: 30 },
      }),
    }));

    const result = await generateBrandVoice('plan-1');
    expect(result).toHaveProperty('voiceSummary', 'No braces');
  });

  it('falls back to regex extraction for partial JSON', async () => {
    // Some preamble text then valid JSON embedded
    const rawText = 'Here is the analysis:\n{"voiceSummary": "Extracted via regex"}\nSome trailing text';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: rawText }] } }],
        usageMetadata: { totalTokenCount: 40 },
      }),
    }));

    const result = await generateBrandVoice('plan-1');
    expect(result).toHaveProperty('voiceSummary', 'Extracted via regex');
  });
});

describe('callGemini retry logic', () => {
  it('retries on 429 responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('rate limited') })
      .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('rate limited') })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: '{"result": "ok"}' }] } }],
          usageMetadata: { totalTokenCount: 10 },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const result = await generateBrandVoice('plan-1');
    expect(result).toEqual({ result: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 15000);

  it('retries on 500/502/503 responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 502, text: () => Promise.resolve('bad gateway') })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: '{"ok": true}' }] } }],
          usageMetadata: { totalTokenCount: 10 },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const result = await generateBrandVoice('plan-1');
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10000);

  it('does not retry on 400 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('bad request'),
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(generateBrandVoice('plan-1')).rejects.toThrow('Gemini API error (400)');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws after all retries exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(generateBrandVoice('plan-1')).rejects.toThrow('Gemini API error (429)');
    expect(fetchMock).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  }, 20000);
});

describe('loadPlan', () => {
  it('throws when plan not found', async () => {
    mockGetPlan.mockReturnValue(undefined);

    vi.stubGlobal('fetch', vi.fn());

    await expect(generateBrandVoice('nonexistent')).rejects.toThrow('Plan not found');
  });
});

describe('getApiKey', () => {
  it('throws when GEMINI_API_KEY not set', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');

    await expect(generateBrandVoice('plan-1')).rejects.toThrow('GEMINI_API_KEY is not set');
  });
});

describe('SUPPORTED_LANGUAGES', () => {
  it('has 10 languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(10);
    expect(SUPPORTED_LANGUAGES).toContain('es');
    expect(SUPPORTED_LANGUAGES).toContain('ja');
    expect(SUPPORTED_LANGUAGES).toContain('pt-BR');
    expect(SUPPORTED_LANGUAGES).toContain('zh-Hans');
  });
});
