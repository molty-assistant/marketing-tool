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
    INSERT OR REPLACE INTO plans (id, config, scraped, generated, stages, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
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
