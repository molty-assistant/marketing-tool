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

    // Migration: add share_token if missing
    const cols = db.prepare("PRAGMA table_info(plans)").all() as { name: string }[];
    if (!cols.some(c => c.name === 'share_token')) {
      db.exec("ALTER TABLE plans ADD COLUMN share_token TEXT");
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

export function updatePlanContent(planId: string, key: string, value: unknown): void {
  const db = getDb();
  const row = getPlan(planId);
  if (!row) return;

  // Ensure content column exists
  const cols = db.prepare("PRAGMA table_info(plans)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'content')) {
    db.exec("ALTER TABLE plans ADD COLUMN content TEXT DEFAULT '{}'");
  }

  const existing = JSON.parse((row as unknown as Record<string, unknown>).content as string || '{}');
  existing[key] = value;
  db.prepare('UPDATE plans SET content = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(JSON.stringify(existing), planId);
}

export function getPlanContent(planId: string): Record<string, unknown> {
  const db = getDb();
  // Ensure content column exists
  const cols = db.prepare("PRAGMA table_info(plans)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'content')) {
    db.exec("ALTER TABLE plans ADD COLUMN content TEXT DEFAULT '{}'");
  }
  const row = db.prepare('SELECT content FROM plans WHERE id = ?').get(planId) as { content: string } | undefined;
  if (!row) return {};
  return JSON.parse(row.content || '{}');
}

export function getPlanByShareToken(token: string): PlanRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM plans WHERE share_token = ?').get(token) as PlanRow | undefined;
}

/**
 * Partial update helper used by the generate-all pipeline.
 * Merges stagesPatch into the existing stages JSON.
 */
export function updatePlanContent(
  planId: string,
  patch: {
    config?: object;
    scraped?: object;
    generated?: string;
    stagesPatch?: Record<string, unknown>;
  }
): boolean {
  const db = getDb();
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
