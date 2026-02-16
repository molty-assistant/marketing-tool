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
      );

      CREATE TABLE IF NOT EXISTS digests (
        id TEXT PRIMARY KEY,
        week_start TEXT NOT NULL,
        week_end TEXT NOT NULL,
        content TEXT NOT NULL,
        stats TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migration: add share_token if missing
    const cols = db.prepare("PRAGMA table_info(plans)").all() as { name: string }[];
    if (!cols.some(c => c.name === 'share_token')) {
      db.exec("ALTER TABLE plans ADD COLUMN share_token TEXT");
    }
    // Migration: add content column for persisted generated content
    if (!cols.some(c => c.name === 'content')) {
      db.exec("ALTER TABLE plans ADD COLUMN content TEXT DEFAULT '{}'");
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
  content: string; // JSON object storing all generated content
}

// Content keys for the persisted content object
export type ContentKey = 
  | 'brandVoice'
  | 'positioning'
  | 'drafts'
  | 'emails'
  | 'atoms'
  | 'translations';

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

/**
 * Update a specific content key in the plan's content JSON object.
 * This merges the new value into the existing content object.
 */
export function updatePlanContent(
  planId: string,
  key: ContentKey,
  value: unknown
): boolean {
  const db = getDb();
  const row = getPlan(planId);
  if (!row) return false;

  const existingContent = JSON.parse(row.content || '{}');
  existingContent[key] = value;

  const stmt = db.prepare(`
    UPDATE plans 
    SET content = ?, updated_at = datetime('now') 
    WHERE id = ?
  `);
  const result = stmt.run(JSON.stringify(existingContent), planId);
  return result.changes > 0;
}

/**
 * Get all persisted content for a plan.
 */
export function getPlanContent(planId: string): Record<string, unknown> | null {
  const row = getPlan(planId);
  if (!row) return null;
  return JSON.parse(row.content || '{}');
}

// Digest types and functions
export interface DigestRow {
  id: string;
  week_start: string;
  week_end: string;
  content: string;
  stats: string;
  created_at: string;
}

export interface DigestStats {
  totalPlans: number;
  newPlans: number;
  topCategories: { category: string; count: number }[];
  topSources: { source: string; count: number }[];
}

export function saveDigest(digest: {
  id: string;
  weekStart: string;
  weekEnd: string;
  content: string;
  stats: DigestStats;
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO digests (id, week_start, week_end, content, stats, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(
    digest.id,
    digest.weekStart,
    digest.weekEnd,
    digest.content,
    JSON.stringify(digest.stats)
  );
}

export function getDigest(id: string): DigestRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM digests WHERE id = ?').get(id) as DigestRow | undefined;
}

export function getAllDigests(): DigestRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM digests ORDER BY created_at DESC').all() as DigestRow[];
}

export function getLatestDigest(): DigestRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM digests ORDER BY created_at DESC LIMIT 1').get() as DigestRow | undefined;
}

export function getPlansInRange(startDate: string, endDate: string): PlanRow[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM plans WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC'
  ).all(startDate, endDate) as PlanRow[];
}
