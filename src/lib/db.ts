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

    // Migration: add share_token if missing
    const cols = db.prepare("PRAGMA table_info(plans)").all() as { name: string }[];
    if (!cols.some((c) => c.name === 'share_token')) {
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

export function getPlanByShareToken(token: string): PlanRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM plans WHERE share_token = ?').get(token) as PlanRow | undefined;
}
