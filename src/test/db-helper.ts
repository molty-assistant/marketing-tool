import Database from 'better-sqlite3';

/**
 * Creates a fresh in-memory SQLite database with the full schema
 * matching what getDb() creates in src/lib/db.ts.
 */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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
      updated_at TEXT DEFAULT (datetime('now')),
      performance_rating TEXT,
      performance_notes TEXT,
      performance_metrics TEXT
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

  db.exec(`CREATE INDEX IF NOT EXISTS idx_orch_runs_plan_id ON orchestration_runs(plan_id)`);

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

  db.exec(`CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at ON api_rate_limits(updated_at)`);

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

  db.exec(`CREATE INDEX IF NOT EXISTS idx_api_usage_daily_endpoint_day ON api_usage_daily(endpoint, day)`);

  // PDF tables
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

  db.exec(`CREATE INDEX IF NOT EXISTS idx_pdf_orders_email ON pdf_orders(email)`);

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

  db.exec(`CREATE INDEX IF NOT EXISTS idx_pdf_gen_runs_order_id ON pdf_generation_runs(order_id)`);

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

  db.exec(`CREATE INDEX IF NOT EXISTS idx_pdf_tokens_hash ON pdf_download_tokens(token_hash)`);

  return db;
}
