import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'marketing-tool.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        scraped TEXT NOT NULL,
        generated TEXT NOT NULL,
        stages TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        share_token TEXT
      )
    `);

    db.exec(`
CREATE TABLE IF NOT EXISTS approval_queue (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        section_type TEXT NOT NULL,
        section_label TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
        edited_content TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS plan_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content_key TEXT,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(plan_id, content_type, content_key)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS content_schedule (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'instagram',
        content_type TEXT NOT NULL DEFAULT 'post',
        topic TEXT,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        post_id TEXT,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT,
        platform TEXT NOT NULL,
        caption TEXT,
        hashtags TEXT,
        media_url TEXT,
        method TEXT,
        buffer_response TEXT,
        status TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS orchestration_runs (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('running','done','failed')),
        current_step TEXT,
        steps_json TEXT NOT NULL,
        input_json TEXT NOT NULL,
        output_refs_json TEXT NOT NULL DEFAULT '{}',
        last_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_orch_runs_plan_id ON orchestration_runs(plan_id)
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS api_rate_limits (
        endpoint TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        actor_key TEXT NOT NULL,
        window_start_epoch INTEGER NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (endpoint, actor_type, actor_key, window_start_epoch)
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at
      ON api_rate_limits(updated_at)
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS api_usage_daily (
        day TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        actor_key TEXT NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        blocked_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (day, endpoint, actor_type, actor_key)
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_api_usage_daily_endpoint_day
      ON api_usage_daily(endpoint, day)
    `);

    // Migration: add share_token if missing
    const cols = db.prepare("PRAGMA table_info(plans)").all() as { name: string }[];
    if (!cols.some((c) => c.name === 'share_token')) {
      db.exec("ALTER TABLE plans ADD COLUMN share_token TEXT");
    }

    // Migration: add performance tracking columns
    const schedCols = db.prepare("PRAGMA table_info(content_schedule)").all() as { name: string }[];
    if (!schedCols.some((c) => c.name === 'performance_rating')) {
      db.exec("ALTER TABLE content_schedule ADD COLUMN performance_rating TEXT");
    }
    if (!schedCols.some((c) => c.name === 'performance_notes')) {
      db.exec("ALTER TABLE content_schedule ADD COLUMN performance_notes TEXT");
    }
    if (!schedCols.some((c) => c.name === 'performance_metrics')) {
      db.exec("ALTER TABLE content_schedule ADD COLUMN performance_metrics TEXT");
    }

    // Migration: add orchestration run columns if missing
    const runCols = db.prepare("PRAGMA table_info(orchestration_runs)").all() as { name: string }[];
    if (!runCols.some((c) => c.name === 'current_step')) {
      db.exec('ALTER TABLE orchestration_runs ADD COLUMN current_step TEXT');
    }
    if (!runCols.some((c) => c.name === 'steps_json')) {
      db.exec("ALTER TABLE orchestration_runs ADD COLUMN steps_json TEXT NOT NULL DEFAULT '[]'");
    }
    if (!runCols.some((c) => c.name === 'input_json')) {
      db.exec("ALTER TABLE orchestration_runs ADD COLUMN input_json TEXT NOT NULL DEFAULT '{}'");
    }
    if (!runCols.some((c) => c.name === 'output_refs_json')) {
      db.exec("ALTER TABLE orchestration_runs ADD COLUMN output_refs_json TEXT NOT NULL DEFAULT '{}'");
    }
    if (!runCols.some((c) => c.name === 'last_error')) {
      db.exec('ALTER TABLE orchestration_runs ADD COLUMN last_error TEXT');
    }

    const usageCols = db.prepare("PRAGMA table_info(api_usage_daily)").all() as { name: string }[];
    if (!usageCols.some((c) => c.name === 'blocked_count')) {
      db.exec('ALTER TABLE api_usage_daily ADD COLUMN blocked_count INTEGER NOT NULL DEFAULT 0');
    }

    // ── PDF product tables ────────────────────────────────────────────────────

    db.exec(`
      CREATE TABLE IF NOT EXISTS pdf_orders (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        product_url TEXT NOT NULL,
        tier TEXT NOT NULL CHECK(tier IN ('basic','pro')),
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK(status IN ('draft','checkout_created','paid','generating','ready','failed')),
        intake_json TEXT NOT NULL DEFAULT '{}',
        stripe_session_id TEXT,
        stripe_payment_intent TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pdf_orders_email ON pdf_orders(email)
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS pdf_generation_runs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running'
          CHECK(status IN ('running','done','failed')),
        current_step TEXT,
        steps_json TEXT NOT NULL DEFAULT '[]',
        attempt INTEGER NOT NULL DEFAULT 1,
        last_error TEXT,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(order_id) REFERENCES pdf_orders(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pdf_gen_runs_order_id ON pdf_generation_runs(order_id)
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS pdf_documents (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(order_id) REFERENCES pdf_orders(id) ON DELETE CASCADE,
        FOREIGN KEY(run_id) REFERENCES pdf_generation_runs(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS pdf_download_tokens (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        download_count INTEGER NOT NULL DEFAULT 0,
        max_downloads INTEGER NOT NULL DEFAULT 10,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(order_id) REFERENCES pdf_orders(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pdf_tokens_hash ON pdf_download_tokens(token_hash)
    `);
  }
  return db;
}

export interface PlanRow {
  id: string;
  config: string;
  scraped: string;
  generated: string;
  stages: string;
  created_at: string;
  updated_at: string;
  share_token: string | null;
}

export type ApprovalQueueStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalQueueRow {
  id: string;
  plan_id: string;
  section_type: string;
  section_label: string;
  content: string;
  status: ApprovalQueueStatus;
  edited_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentScheduleRow {
  id: string;
  plan_id: string;
  platform: string;
  content_type: string;
  topic: string | null;
  scheduled_at: string;
  status: string;
  post_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  performance_rating: string | null;
  performance_notes: string | null;
  performance_metrics: string | null;
}

export type OrchestrationRunStatus = 'running' | 'done' | 'failed';

export interface OrchestrationRunRow {
  id: string;
  plan_id: string;
  status: OrchestrationRunStatus;
  current_step: string | null;
  steps_json: string;
  input_json: string;
  output_refs_json: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRunInput {
  planId: string;
  status?: OrchestrationRunStatus;
  currentStep?: string | null;
  stepsJson: string;
  inputJson: string;
  outputRefsJson?: string;
  lastError?: string | null;
}

export interface UpdateRunPatch {
  status?: OrchestrationRunStatus;
  currentStep?: string | null;
  stepsJson?: string;
  inputJson?: string;
  outputRefsJson?: string;
  lastError?: string | null;
}

export function createRun(input: CreateRunInput): OrchestrationRunRow {
  const db = getDb();
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO orchestration_runs
      (id, plan_id, status, current_step, steps_json, input_json, output_refs_json, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(
    id,
    input.planId,
    input.status ?? 'running',
    input.currentStep ?? null,
    input.stepsJson,
    input.inputJson,
    input.outputRefsJson ?? '{}',
    input.lastError ?? null
  );

  const row = getRun(id);
  if (!row) {
    throw new Error('Failed to create orchestration run');
  }
  return row;
}

export function updateRun(id: string, patch: UpdateRunPatch): boolean {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.status !== undefined) {
    sets.push('status = ?');
    values.push(patch.status);
  }
  if (patch.currentStep !== undefined) {
    sets.push('current_step = ?');
    values.push(patch.currentStep);
  }
  if (patch.stepsJson !== undefined) {
    sets.push('steps_json = ?');
    values.push(patch.stepsJson);
  }
  if (patch.inputJson !== undefined) {
    sets.push('input_json = ?');
    values.push(patch.inputJson);
  }
  if (patch.outputRefsJson !== undefined) {
    sets.push('output_refs_json = ?');
    values.push(patch.outputRefsJson);
  }
  if (patch.lastError !== undefined) {
    sets.push('last_error = ?');
    values.push(patch.lastError);
  }

  if (sets.length === 0) return false;

  sets.push("updated_at = datetime('now')");
  values.push(id);

  const res = db.prepare(`UPDATE orchestration_runs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return res.changes > 0;
}

export function getRun(id: string): OrchestrationRunRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM orchestration_runs WHERE id = ?').get(id) as
    | OrchestrationRunRow
    | undefined;
}

export function listRunsByPlan(planId: string): OrchestrationRunRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM orchestration_runs WHERE plan_id = ? ORDER BY created_at DESC')
    .all(planId) as OrchestrationRunRow[];
}

export function getScheduleItemsForPlan(planId: string): ContentScheduleRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM content_schedule WHERE plan_id = ? ORDER BY scheduled_at DESC')
    .all(planId) as ContentScheduleRow[];
}

export function updateSchedulePerformance(
  id: string,
  rating: string | null,
  notes: string | null,
  metrics: string | null
) {
  const db = getDb();
  db.prepare(
    "UPDATE content_schedule SET performance_rating = ?, performance_notes = ?, performance_metrics = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(rating, notes, metrics, id);
}

export function savePlan(plan: {
  id: string;
  config: object;
  scraped: object;
  generated: string;
  stages: object;
  createdAt: string;
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO plans (id, config, scraped, generated, stages, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      config = excluded.config,
      scraped = excluded.scraped,
      generated = excluded.generated,
      stages = excluded.stages,
      updated_at = datetime('now')
`);
  stmt.run(
    plan.id,
    JSON.stringify(plan.config),
    JSON.stringify(plan.scraped),
    plan.generated,
    JSON.stringify(plan.stages),
    plan.createdAt
  );
}

export function getPlan(id: string): PlanRow | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM plans WHERE id = ?');
  return stmt.get(id) as PlanRow | undefined;
}

export function getAllPlans(): PlanRow[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM plans ORDER BY created_at DESC');
  return stmt.all() as PlanRow[];
}

export function deletePlan(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM plans WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function createShareToken(planId: string): string | null {
  const db = getDb();
  const plan = getPlan(planId);
  if (!plan) return null;
  if (plan.share_token) return plan.share_token;
  const token = crypto.randomUUID();
  db.prepare('UPDATE plans SET share_token = ? WHERE id = ?').run(token, planId);
  return token;
}

export function removeShareToken(planId: string): boolean {
  const db = getDb();
  const result = db.prepare('UPDATE plans SET share_token = NULL WHERE id = ?').run(planId);
  return result.changes > 0;
}

export function updatePlanContent(planId: string, key: string, value: unknown): void;
export function updatePlanContent(
  planId: string,
  patch: {
    config?: object;
    scraped?: object;
    generated?: string;
    stagesPatch?: Record<string, unknown>;
  }
): boolean;
/**
 * Update helper used by a few endpoints:
 * - updatePlanContent(planId, key, value) stores extra JSON in plans.content (legacy).
 * - updatePlanContent(planId, patch) partially updates plans fields (generate-all pipeline).
 */
export function updatePlanContent(planId: string, arg2: unknown, arg3?: unknown): boolean | void {
  const db = getDb();

  // Signature: (planId, key, value)
  if (typeof arg2 === 'string') {
    const key = arg2;
    const value = arg3;

    const row = getPlan(planId);
    if (!row) return;

    // Ensure content column exists
    const cols = db.prepare('PRAGMA table_info(plans)').all() as { name: string }[];
    if (!cols.some((c) => c.name === 'content')) {
      db.exec("ALTER TABLE plans ADD COLUMN content TEXT DEFAULT '{}'");
    }

    const existing = JSON.parse(
      ((row as unknown as Record<string, unknown>).content as string) || '{}'
    ) as Record<string, unknown>;

    existing[key] = value;

    db.prepare("UPDATE plans SET content = ?, updated_at = datetime('now') WHERE id = ?").run(
      JSON.stringify(existing),
      planId
    );

    return;
  }

  // Signature: (planId, patch)
  const patch = (arg2 || {}) as {
    config?: object;
    scraped?: object;
    generated?: string;
    stagesPatch?: Record<string, unknown>;
  };

  const row = getPlan(planId);
  if (!row) return false;

  const nextConfig = patch.config ? JSON.stringify(patch.config) : row.config;
  const nextScraped = patch.scraped ? JSON.stringify(patch.scraped) : row.scraped;
  const nextGenerated = typeof patch.generated === 'string' ? patch.generated : row.generated;

  let nextStagesObj: Record<string, unknown>;
  try {
    nextStagesObj = JSON.parse(row.stages || '{}');
  } catch {
    nextStagesObj = {};
  }

  if (patch.stagesPatch && typeof patch.stagesPatch === 'object') {
    nextStagesObj = { ...nextStagesObj, ...patch.stagesPatch };
  }

  const nextStages = JSON.stringify(nextStagesObj);

  const res = db
    .prepare(
      `UPDATE plans SET config = ?, scraped = ?, generated = ?, stages = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(nextConfig, nextScraped, nextGenerated, nextStages, planId);

  return res.changes > 0;
}

export function getPlanContent(planId: string): Record<string, unknown> {
  const db = getDb();
  // Ensure content column exists
  const cols = db.prepare('PRAGMA table_info(plans)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'content')) {
    db.exec("ALTER TABLE plans ADD COLUMN content TEXT DEFAULT '{}'");
  }
  const row = db
    .prepare('SELECT content FROM plans WHERE id = ?')
    .get(planId) as { content: string } | undefined;
  if (!row) return {};
  return JSON.parse(row.content || '{}');
}

export function getPlanByShareToken(token: string): PlanRow | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM plans WHERE share_token = ?')
    .get(token) as PlanRow | undefined;
}

export interface PlanContentRow {
  id: number;
  plan_id: string;
  content_type: string;
  content_key: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

function normaliseContentKey(contentKey?: string | null): string {
  // SQLite UNIQUE constraints treat NULL values as distinct, which breaks upserts
  // for single-result content types. We normalise "no key" to an empty string.
  return typeof contentKey === 'string' ? contentKey : '';
}

export function saveContent(
  planId: string,
  contentType: string,
  contentKey: string | null | undefined,
  content: string
): void {
  const db = getDb();
  const key = normaliseContentKey(contentKey);

  db.prepare(
    `INSERT INTO plan_content (plan_id, content_type, content_key, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(plan_id, content_type, content_key)
     DO UPDATE SET content = excluded.content, updated_at = datetime('now')`
  ).run(planId, contentType, key, content);
}

export function getContent(
  planId: string,
  contentType: string,
  contentKey?: string | null
): unknown {
  const db = getDb();
  if (typeof contentKey === 'string' || contentKey === null) {
    const key = normaliseContentKey(contentKey);
    const row = db
      .prepare(
        'SELECT content FROM plan_content WHERE plan_id = ? AND content_type = ? AND content_key = ?'
      )
      .get(planId, contentType, key) as { content: string } | undefined;

    if (!row) return null;
    try {
      return JSON.parse(row.content);
    } catch {
      return row.content;
    }
  }

  const rows = db
    .prepare(
      'SELECT content_key, content FROM plan_content WHERE plan_id = ? AND content_type = ? ORDER BY content_key'
    )
    .all(planId, contentType) as { content_key: string | null; content: string }[];

  return rows.map((r) => {
    let parsed: unknown = r.content;
    try {
      parsed = JSON.parse(r.content);
    } catch {
      // ignore
    }
    return { contentKey: r.content_key, content: parsed };
  });
}

export function getAllContent(planId: string): Array<{ contentType: string; contentKey: string | null; content: unknown }> {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT content_type, content_key, content FROM plan_content WHERE plan_id = ? ORDER BY content_type, content_key'
    )
    .all(planId) as { content_type: string; content_key: string | null; content: string }[];

  return rows.map((r) => {
    let parsed: unknown = r.content;
    try {
      parsed = JSON.parse(r.content);
    } catch {
      // ignore
    }
    return { contentType: r.content_type, contentKey: r.content_key, content: parsed };
  });
}

export type RateLimitActorType = 'ip' | 'api_key' | 'unknown';

export interface ConsumeApiRateLimitInput {
  endpoint: string;
  actorType: RateLimitActorType;
  actorKey: string;
  windowSeconds: number;
  maxRequests: number;
  nowMs?: number;
}

export interface ConsumeApiRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
  resetAtEpochSeconds: number;
}

export function consumeApiRateLimit(input: ConsumeApiRateLimitInput): ConsumeApiRateLimitResult {
  const db = getDb();

  const windowSeconds = Math.max(1, Math.floor(input.windowSeconds));
  const maxRequests = Math.max(1, Math.floor(input.maxRequests));
  const nowMs = typeof input.nowMs === 'number' ? input.nowMs : Date.now();
  const nowEpochSeconds = Math.floor(nowMs / 1000);
  const windowStartEpoch = nowEpochSeconds - (nowEpochSeconds % windowSeconds);
  const resetAtEpochSeconds = windowStartEpoch + windowSeconds;

  // Keep the working set bounded without requiring external cleanup jobs.
  db.prepare('DELETE FROM api_rate_limits WHERE window_start_epoch < ?').run(nowEpochSeconds - 172800);

  const nextCount = db.transaction(() => {
    const row = db
      .prepare(
        `SELECT request_count
         FROM api_rate_limits
         WHERE endpoint = ? AND actor_type = ? AND actor_key = ? AND window_start_epoch = ?`
      )
      .get(input.endpoint, input.actorType, input.actorKey, windowStartEpoch) as
      | { request_count: number }
      | undefined;

    if (!row) {
      db.prepare(
        `INSERT INTO api_rate_limits
          (endpoint, actor_type, actor_key, window_start_epoch, request_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
      ).run(input.endpoint, input.actorType, input.actorKey, windowStartEpoch);
      return 1;
    }

    const count = row.request_count + 1;
    db.prepare(
      `UPDATE api_rate_limits
       SET request_count = ?, updated_at = datetime('now')
       WHERE endpoint = ? AND actor_type = ? AND actor_key = ? AND window_start_epoch = ?`
    ).run(count, input.endpoint, input.actorType, input.actorKey, windowStartEpoch);

    return count;
  })();

  const remaining = Math.max(0, maxRequests - nextCount);
  const allowed = nextCount <= maxRequests;

  return {
    allowed,
    remaining,
    retryAfterSeconds: allowed ? 0 : Math.max(1, resetAtEpochSeconds - nowEpochSeconds),
    limit: maxRequests,
    resetAtEpochSeconds,
  };
}

export interface TrackApiUsageInput {
  endpoint: string;
  actorType: RateLimitActorType;
  actorKey: string;
  blocked: boolean;
  nowMs?: number;
}

export function trackApiUsage(input: TrackApiUsageInput): void {
  const db = getDb();
  const now = typeof input.nowMs === 'number' ? new Date(input.nowMs) : new Date();
  const day = now.toISOString().slice(0, 10);
  const blockedCount = input.blocked ? 1 : 0;

  db.prepare(
    `INSERT INTO api_usage_daily
      (day, endpoint, actor_type, actor_key, request_count, blocked_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
     ON CONFLICT(day, endpoint, actor_type, actor_key)
     DO UPDATE SET
       request_count = request_count + 1,
       blocked_count = blocked_count + excluded.blocked_count,
       updated_at = datetime('now')`
  ).run(day, input.endpoint, input.actorType, input.actorKey, blockedCount);
}

// ── PDF product: types ────────────────────────────────────────────────────────

export type PdfTier = 'basic' | 'pro';
export type PdfOrderStatus = 'draft' | 'checkout_created' | 'paid' | 'generating' | 'ready' | 'failed';
export type PdfRunStatus = 'running' | 'done' | 'failed';

export interface PdfOrderRow {
  id: string;
  email: string;
  product_url: string;
  tier: PdfTier;
  status: PdfOrderStatus;
  intake_json: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  created_at: string;
  updated_at: string;
}

export interface PdfGenerationRunRow {
  id: string;
  order_id: string;
  status: PdfRunStatus;
  current_step: string | null;
  steps_json: string;
  attempt: number;
  last_error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PdfDocumentRow {
  id: string;
  order_id: string;
  run_id: string;
  file_path: string;
  file_size: number;
  page_count: number;
  created_at: string;
}

export interface PdfDownloadTokenRow {
  id: string;
  order_id: string;
  token_hash: string;
  download_count: number;
  max_downloads: number;
  expires_at: string;
  created_at: string;
}

// ── PDF product: pdf_orders CRUD ─────────────────────────────────────────────

export interface CreatePdfOrderInput {
  email: string;
  productUrl: string;
  tier: PdfTier;
  intakeJson: string;
}

export function createPdfOrder(input: CreatePdfOrderInput): PdfOrderRow {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO pdf_orders (id, email, product_url, tier, status, intake_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', ?, datetime('now'), datetime('now'))`
  ).run(id, input.email, input.productUrl, input.tier, input.intakeJson);
  return getPdfOrder(id)!;
}

export function getPdfOrder(id: string): PdfOrderRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM pdf_orders WHERE id = ?').get(id) as PdfOrderRow | undefined;
}

export interface UpdatePdfOrderPatch {
  status?: PdfOrderStatus;
  tier?: PdfTier;
  stripeSessionId?: string | null;
  stripePaymentIntent?: string | null;
}

export function updatePdfOrder(id: string, patch: UpdatePdfOrderPatch): boolean {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.status !== undefined) { sets.push('status = ?'); values.push(patch.status); }
  if (patch.tier !== undefined) { sets.push('tier = ?'); values.push(patch.tier); }
  if (patch.stripeSessionId !== undefined) { sets.push('stripe_session_id = ?'); values.push(patch.stripeSessionId); }
  if (patch.stripePaymentIntent !== undefined) { sets.push('stripe_payment_intent = ?'); values.push(patch.stripePaymentIntent); }

  if (sets.length === 0) return false;
  sets.push("updated_at = datetime('now')");
  values.push(id);

  const res = db.prepare(`UPDATE pdf_orders SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return res.changes > 0;
}

/**
 * Atomically transition an order from one status to another.
 * Returns true if the update happened (status matched), false if not (someone else got there first).
 * Use this to prevent concurrent pipeline starts.
 */
export function transitionPdfOrderStatus(
  id: string,
  fromStatuses: string[],
  toStatus: string,
): boolean {
  const db = getDb();
  const placeholders = fromStatuses.map(() => '?').join(', ');
  const res = db.prepare(
    `UPDATE pdf_orders SET status = ?, updated_at = datetime('now') WHERE id = ? AND status IN (${placeholders})`
  ).run(toStatus, id, ...fromStatuses);
  return res.changes > 0;
}

export function getPdfOrdersByEmail(email: string): PdfOrderRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM pdf_orders WHERE email = ? ORDER BY created_at DESC')
    .all(email) as PdfOrderRow[];
}

export function getPdfOrderByStripeSession(sessionId: string): PdfOrderRow | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM pdf_orders WHERE stripe_session_id = ?')
    .get(sessionId) as PdfOrderRow | undefined;
}

// ── PDF product: pdf_generation_runs CRUD ────────────────────────────────────

export function createPdfGenerationRun(orderId: string, attempt: number): PdfGenerationRunRow {
  const db = getDb();
  const id = crypto.randomUUID();
  const initialSteps = JSON.stringify([
    { id: 'scrape', status: 'pending' },
    { id: 'generate-positioning', status: 'pending' },
    { id: 'generate-copy', status: 'pending' },
    { id: 'render-html', status: 'pending' },
    { id: 'render-pdf', status: 'pending' },
    { id: 'quality-check', status: 'pending' },
  ]);
  db.prepare(
    `INSERT INTO pdf_generation_runs
      (id, order_id, status, current_step, steps_json, attempt, created_at, updated_at)
     VALUES (?, ?, 'running', NULL, ?, ?, datetime('now'), datetime('now'))`
  ).run(id, orderId, initialSteps, attempt);
  return getPdfGenerationRun(id)!;
}

export function getPdfGenerationRun(id: string): PdfGenerationRunRow | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM pdf_generation_runs WHERE id = ?')
    .get(id) as PdfGenerationRunRow | undefined;
}

export function getLatestPdfGenerationRun(orderId: string): PdfGenerationRunRow | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM pdf_generation_runs WHERE order_id = ? ORDER BY attempt DESC LIMIT 1')
    .get(orderId) as PdfGenerationRunRow | undefined;
}

export interface UpdatePdfRunPatch {
  status?: PdfRunStatus;
  currentStep?: string | null;
  stepsJson?: string;
  lastError?: string | null;
  completedAt?: string | null;
}

export function updatePdfGenerationRun(id: string, patch: UpdatePdfRunPatch): boolean {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.status !== undefined) { sets.push('status = ?'); values.push(patch.status); }
  if (patch.currentStep !== undefined) { sets.push('current_step = ?'); values.push(patch.currentStep); }
  if (patch.stepsJson !== undefined) { sets.push('steps_json = ?'); values.push(patch.stepsJson); }
  if (patch.lastError !== undefined) { sets.push('last_error = ?'); values.push(patch.lastError); }
  if (patch.completedAt !== undefined) { sets.push('completed_at = ?'); values.push(patch.completedAt); }

  if (sets.length === 0) return false;
  sets.push("updated_at = datetime('now')");
  values.push(id);

  const res = db.prepare(`UPDATE pdf_generation_runs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return res.changes > 0;
}

// ── PDF product: pdf_documents CRUD ──────────────────────────────────────────

export function savePdfDocument(input: {
  orderId: string;
  runId: string;
  filePath: string;
  fileSize: number;
  pageCount: number;
}): PdfDocumentRow {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO pdf_documents (id, order_id, run_id, file_path, file_size, page_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, input.orderId, input.runId, input.filePath, input.fileSize, input.pageCount);
  return db.prepare('SELECT * FROM pdf_documents WHERE id = ?').get(id) as PdfDocumentRow;
}

export function getPdfDocument(orderId: string): PdfDocumentRow | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM pdf_documents WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(orderId) as PdfDocumentRow | undefined;
}

// ── PDF product: pdf_download_tokens CRUD ────────────────────────────────────

export function createPdfDownloadToken(input: {
  orderId: string;
  tokenHash: string;
  expiresAt: string;
  maxDownloads?: number;
}): PdfDownloadTokenRow {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO pdf_download_tokens
      (id, order_id, token_hash, download_count, max_downloads, expires_at, created_at)
     VALUES (?, ?, ?, 0, ?, ?, datetime('now'))`
  ).run(id, input.orderId, input.tokenHash, input.maxDownloads ?? 10, input.expiresAt);
  return db.prepare('SELECT * FROM pdf_download_tokens WHERE id = ?').get(id) as PdfDownloadTokenRow;
}

export function getPdfDownloadTokenByHash(tokenHash: string): PdfDownloadTokenRow | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM pdf_download_tokens WHERE token_hash = ?')
    .get(tokenHash) as PdfDownloadTokenRow | undefined;
}

/**
 * Atomically increment download count only if under the limit.
 * Returns true if the increment succeeded (download allowed), false if limit reached.
 */
export function tryIncrementDownloadCount(tokenId: string): boolean {
  const db = getDb();
  const res = db.prepare(
    'UPDATE pdf_download_tokens SET download_count = download_count + 1 WHERE id = ? AND download_count < max_downloads'
  ).run(tokenId);
  return res.changes > 0;
}
