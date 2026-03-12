import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDb,
  savePlan,
  getPlan,
  getAllPlans,
  deletePlan,
  saveContent,
  getContent,
  getAllContent,
  consumeApiRateLimit,
  trackApiUsage,
  createRun,
  updateRun,
  getRun,
  listRunsByPlan,
  createShareToken,
  removeShareToken,
  createPdfOrder,
  getPdfOrder,
  transitionPdfOrderStatus,
  createPdfDownloadToken,
  getPdfDownloadTokenByHash,
  tryIncrementDownloadCount,
} from './db';

// Use the real getDb() singleton. Clean all tables before each test for isolation.
beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM pdf_download_tokens');
  db.exec('DELETE FROM pdf_documents');
  db.exec('DELETE FROM pdf_generation_runs');
  db.exec('DELETE FROM pdf_orders');
  db.exec('DELETE FROM orchestration_runs');
  db.exec('DELETE FROM plan_content');
  db.exec('DELETE FROM content_schedule');
  db.exec('DELETE FROM social_posts');
  db.exec('DELETE FROM approval_queue');
  db.exec('DELETE FROM api_usage_daily');
  db.exec('DELETE FROM api_rate_limits');
  db.exec('DELETE FROM plans');
});

function seedPlan(id = 'plan-1') {
  savePlan({
    id,
    config: { app_name: 'Test' },
    scraped: { url: 'https://example.com', source: 'website', name: 'Test', description: '', features: [], pricing: 'Free' },
    generated: '# Test Plan',
    stages: { research: 'done' },
    createdAt: new Date().toISOString(),
  });
  return id;
}

describe('Plan CRUD', () => {
  it('saves and retrieves a plan', () => {
    seedPlan('p1');
    const plan = getPlan('p1');
    expect(plan).toBeDefined();
    expect(plan!.id).toBe('p1');
    expect(JSON.parse(plan!.config)).toHaveProperty('app_name', 'Test');
  });

  it('upserts on conflict', () => {
    seedPlan('p1');
    savePlan({
      id: 'p1',
      config: { app_name: 'Updated' },
      scraped: {},
      generated: '# Updated',
      stages: {},
      createdAt: new Date().toISOString(),
    });
    const plan = getPlan('p1');
    expect(JSON.parse(plan!.config)).toHaveProperty('app_name', 'Updated');
    expect(plan!.generated).toBe('# Updated');
  });

  it('lists all plans', () => {
    seedPlan('p1');
    seedPlan('p2');
    const all = getAllPlans();
    expect(all.length).toBe(2);
  });

  it('deletes a plan', () => {
    seedPlan('p1');
    expect(deletePlan('p1')).toBe(true);
    expect(getPlan('p1')).toBeUndefined();
  });

  it('returns false when deleting non-existent plan', () => {
    expect(deletePlan('nonexistent')).toBe(false);
  });
});

describe('Share tokens', () => {
  it('creates a share token', () => {
    seedPlan('p1');
    const token = createShareToken('p1');
    expect(token).toBeTruthy();
    const plan = getPlan('p1');
    expect(plan!.share_token).toBe(token);
  });

  it('returns existing token if already set', () => {
    seedPlan('p1');
    const t1 = createShareToken('p1');
    const t2 = createShareToken('p1');
    expect(t1).toBe(t2);
  });

  it('returns null for non-existent plan', () => {
    expect(createShareToken('nonexistent')).toBeNull();
  });

  it('removes a share token', () => {
    seedPlan('p1');
    createShareToken('p1');
    expect(removeShareToken('p1')).toBe(true);
    const plan = getPlan('p1');
    expect(plan!.share_token).toBeNull();
  });
});

describe('Content CRUD', () => {
  it('saves and retrieves content', () => {
    seedPlan('p1');
    saveContent('p1', 'brand-voice', null, JSON.stringify({ voice: 'bold' }));
    const result = getContent('p1', 'brand-voice', null);
    expect(result).toEqual({ voice: 'bold' });
  });

  it('upserts on same key', () => {
    seedPlan('p1');
    saveContent('p1', 'draft', 'professional', JSON.stringify({ v: 1 }));
    saveContent('p1', 'draft', 'professional', JSON.stringify({ v: 2 }));
    const result = getContent('p1', 'draft', 'professional');
    expect(result).toEqual({ v: 2 });
  });

  it('normalizes null key to empty string for UNIQUE constraint', () => {
    seedPlan('p1');
    saveContent('p1', 'brand-voice', null, '"first"');
    saveContent('p1', 'brand-voice', undefined, '"second"');
    const result = getContent('p1', 'brand-voice', null);
    expect(result).toBe('second');
  });

  it('lists all content by type when no key specified', () => {
    seedPlan('p1');
    saveContent('p1', 'draft', 'bold', JSON.stringify({ tone: 'bold' }));
    saveContent('p1', 'draft', 'casual', JSON.stringify({ tone: 'casual' }));
    const result = getContent('p1', 'draft') as Array<{ contentKey: string; content: unknown }>;
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('returns null for missing content', () => {
    seedPlan('p1');
    expect(getContent('p1', 'nonexistent', null)).toBeNull();
  });

  it('getAllContent returns all types', () => {
    seedPlan('p1');
    saveContent('p1', 'brand-voice', null, '"voice"');
    saveContent('p1', 'draft', 'bold', '"draft"');
    const all = getAllContent('p1');
    expect(all.length).toBe(2);
  });
});

describe('consumeApiRateLimit', () => {
  const baseInput = {
    endpoint: '/api/test',
    actorType: 'ip' as const,
    actorKey: '1.2.3.4',
    windowSeconds: 60,
    maxRequests: 3,
    nowMs: 1700000000000,
  };

  it('allows first request and returns correct remaining', () => {
    const result = consumeApiRateLimit(baseInput);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.limit).toBe(3);
  });

  it('decrements remaining on sequential requests', () => {
    consumeApiRateLimit(baseInput);
    const r2 = consumeApiRateLimit(baseInput);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = consumeApiRateLimit(baseInput);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks when over max requests', () => {
    consumeApiRateLimit(baseInput);
    consumeApiRateLimit(baseInput);
    consumeApiRateLimit(baseInput);
    const r4 = consumeApiRateLimit(baseInput);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks different endpoints independently', () => {
    consumeApiRateLimit(baseInput);
    consumeApiRateLimit(baseInput);
    consumeApiRateLimit(baseInput);

    const otherEndpoint = consumeApiRateLimit({ ...baseInput, endpoint: '/api/other' });
    expect(otherEndpoint.allowed).toBe(true);
    expect(otherEndpoint.remaining).toBe(2);
  });

  it('tracks different actors independently', () => {
    consumeApiRateLimit(baseInput);
    consumeApiRateLimit(baseInput);
    consumeApiRateLimit(baseInput);

    const otherActor = consumeApiRateLimit({ ...baseInput, actorKey: '5.6.7.8' });
    expect(otherActor.allowed).toBe(true);
  });

  it('resets in a new time window', () => {
    consumeApiRateLimit(baseInput);
    consumeApiRateLimit(baseInput);
    consumeApiRateLimit(baseInput);

    const nextWindow = consumeApiRateLimit({ ...baseInput, nowMs: baseInput.nowMs + 61_000 });
    expect(nextWindow.allowed).toBe(true);
    expect(nextWindow.remaining).toBe(2);
  });
});

describe('trackApiUsage', () => {
  it('creates a new daily row', () => {
    trackApiUsage({
      endpoint: '/api/track-test',
      actorType: 'ip',
      actorKey: '1.2.3.4',
      blocked: false,
      nowMs: 1700000000000,
    });

    const db = getDb();
    const row = db.prepare(
      "SELECT * FROM api_usage_daily WHERE endpoint = '/api/track-test'"
    ).get() as { request_count: number; blocked_count: number } | undefined;

    expect(row).toBeDefined();
    expect(row!.request_count).toBe(1);
    expect(row!.blocked_count).toBe(0);
  });

  it('increments existing row', () => {
    const input = {
      endpoint: '/api/track-test-2',
      actorType: 'ip' as const,
      actorKey: '1.2.3.4',
      blocked: false,
      nowMs: 1700000000000,
    };
    trackApiUsage(input);
    trackApiUsage(input);

    const db = getDb();
    const row = db.prepare(
      "SELECT * FROM api_usage_daily WHERE endpoint = '/api/track-test-2'"
    ).get() as { request_count: number };

    expect(row.request_count).toBe(2);
  });

  it('increments blocked_count when blocked', () => {
    trackApiUsage({
      endpoint: '/api/track-test-3',
      actorType: 'ip',
      actorKey: '1.2.3.4',
      blocked: true,
      nowMs: 1700000000000,
    });

    const db = getDb();
    const row = db.prepare(
      "SELECT * FROM api_usage_daily WHERE endpoint = '/api/track-test-3'"
    ).get() as { blocked_count: number };

    expect(row.blocked_count).toBe(1);
  });
});

describe('Orchestration runs', () => {
  it('creates, retrieves, and updates a run', () => {
    seedPlan('p1');
    const run = createRun({
      planId: 'p1',
      stepsJson: '[]',
      inputJson: '{}',
    });
    expect(run.id).toBeTruthy();
    expect(run.status).toBe('running');
    expect(run.plan_id).toBe('p1');

    const fetched = getRun(run.id);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(run.id);

    const updated = updateRun(run.id, { status: 'done', currentStep: null });
    expect(updated).toBe(true);

    const after = getRun(run.id);
    expect(after!.status).toBe('done');
  });

  it('lists runs by plan', () => {
    seedPlan('p1');
    createRun({ planId: 'p1', stepsJson: '[]', inputJson: '{}' });
    createRun({ planId: 'p1', stepsJson: '[]', inputJson: '{}' });

    const runs = listRunsByPlan('p1');
    expect(runs.length).toBe(2);
  });

  it('updateRun returns false for empty patch', () => {
    seedPlan('p1');
    const run = createRun({ planId: 'p1', stepsJson: '[]', inputJson: '{}' });
    expect(updateRun(run.id, {})).toBe(false);
  });
});

describe('PDF order status transitions', () => {
  function seedPdfOrder(id: string, status = 'draft') {
    const db = getDb();
    db.prepare(
      `INSERT INTO pdf_orders (id, email, product_url, tier, status, intake_json) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, 'test@test.com', 'https://example.com', 'basic', status, '{}');
  }

  it('transitions from matching status', () => {
    seedPdfOrder('o1', 'paid');
    expect(transitionPdfOrderStatus('o1', ['paid'], 'generating')).toBe(true);
    const order = getPdfOrder('o1');
    expect(order!.status).toBe('generating');
  });

  it('returns false for non-matching status', () => {
    seedPdfOrder('o1', 'draft');
    expect(transitionPdfOrderStatus('o1', ['paid'], 'generating')).toBe(false);
    const order = getPdfOrder('o1');
    expect(order!.status).toBe('draft');
  });

  it('handles multiple fromStatuses (OR logic)', () => {
    seedPdfOrder('o1', 'failed');
    expect(transitionPdfOrderStatus('o1', ['paid', 'failed'], 'generating')).toBe(true);
    const order = getPdfOrder('o1');
    expect(order!.status).toBe('generating');
  });
});

describe('PDF download tokens', () => {
  function seedOrderAndToken(maxDownloads = 3) {
    const db = getDb();
    db.prepare(
      `INSERT INTO pdf_orders (id, email, product_url, tier, status) VALUES (?, ?, ?, ?, ?)`
    ).run('o1', 'test@test.com', 'https://example.com', 'basic', 'ready');

    return createPdfDownloadToken({
      orderId: 'o1',
      tokenHash: 'hash123',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      maxDownloads,
    });
  }

  it('creates and retrieves a download token', () => {
    const token = seedOrderAndToken();
    expect(token.order_id).toBe('o1');
    expect(token.download_count).toBe(0);
    expect(token.max_downloads).toBe(3);

    const found = getPdfDownloadTokenByHash('hash123');
    expect(found).toBeDefined();
    expect(found!.id).toBe(token.id);
  });

  it('increments download count when under limit', () => {
    const token = seedOrderAndToken(3);
    expect(tryIncrementDownloadCount(token.id)).toBe(true);
    expect(tryIncrementDownloadCount(token.id)).toBe(true);
    expect(tryIncrementDownloadCount(token.id)).toBe(true);

    const after = getPdfDownloadTokenByHash('hash123');
    expect(after!.download_count).toBe(3);
  });

  it('returns false when at download limit', () => {
    const token = seedOrderAndToken(2);
    tryIncrementDownloadCount(token.id);
    tryIncrementDownloadCount(token.id);
    expect(tryIncrementDownloadCount(token.id)).toBe(false);
  });
});
