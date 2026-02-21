import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { internalBaseUrl } from '@/lib/orchestrator';

/**
 * Process scheduled posts that are due.
 * Called by external cron. Idempotent — marks as 'generating' before processing.
 *
 * POST /api/process-schedule
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Atomically claim due posts (single transaction to prevent double-processing)
    const due = db.transaction(() => {
      return db.prepare(
        `UPDATE content_schedule SET status = 'generating', updated_at = datetime('now')
         WHERE rowid IN (
           SELECT rowid FROM content_schedule
           WHERE scheduled_at <= ? AND status = 'scheduled'
         ) RETURNING *`
      ).all(now) as Array<Record<string, string>>;
    })();

    if (due.length === 0) {
      return NextResponse.json({ processed: 0, results: [] });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];
    const origin = internalBaseUrl();

    for (const item of due) {
      try {
        const res = await fetch(`${origin}/api/auto-publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.API_KEY || '',
          },
          body: JSON.stringify({
            planId: item.plan_id,
            platform: item.platform,
            contentType: item.content_type,
            topic: item.topic || undefined,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          db.prepare(
            "UPDATE content_schedule SET status = 'posted', post_id = ?, updated_at = datetime('now') WHERE id = ?"
          ).run(data.postId || null, item.id);
          results.push({ id: item.id, status: 'posted' });
        } else {
          const errMsg = data.error || `HTTP ${res.status}`;
          db.prepare(
            "UPDATE content_schedule SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?"
          ).run(errMsg, item.id);
          results.push({ id: item.id, status: 'failed', error: errMsg });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        db.prepare(
          "UPDATE content_schedule SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(errMsg, item.id);
        results.push({ id: item.id, status: 'failed', error: errMsg });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error('process-schedule error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
