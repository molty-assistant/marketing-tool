import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPlan, type ApprovalQueueRow, type ApprovalQueueStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

function emptyStats(): Stats {
  return { total: 0, pending: 0, approved: 0, rejected: 0 };
}

function normalizeStatus(input: unknown): ApprovalQueueStatus | null {
  if (input === 'pending' || input === 'approved' || input === 'rejected') return input;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const planId = request.nextUrl.searchParams.get('planId') || '';
    if (!planId) {
      return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
    }

    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const db = getDb();

    const items = db
      .prepare(
        `SELECT * FROM approval_queue
         WHERE plan_id = ?
         ORDER BY datetime(created_at) DESC`
      )
      .all(planId) as ApprovalQueueRow[];

    const statsRows = db
      .prepare(
        `SELECT status, COUNT(*) as count
         FROM approval_queue
         WHERE plan_id = ?
         GROUP BY status`
      )
      .all(planId) as { status: ApprovalQueueStatus; count: number }[];

    const stats = emptyStats();
    stats.total = items.length;
    for (const r of statsRows) {
      if (r.status === 'pending') stats.pending = r.count;
      if (r.status === 'approved') stats.approved = r.count;
      if (r.status === 'rejected') stats.rejected = r.count;
    }

    return NextResponse.json({ items, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch approval queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type PostBody =
  | {
      action: 'add';
      planId: string;
      sectionType: string;
      sectionLabel: string;
      content: string;
    }
  | {
      action: 'approve' | 'reject' | 'set-status';
      id: string;
      status?: ApprovalQueueStatus;
    }
  | {
      action: 'update';
      id: string;
      editedContent?: string | null;
      content?: string;
      sectionLabel?: string;
      sectionType?: string;
    }
  | {
      action: 'delete';
      id: string;
    };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PostBody>;

    const action = body?.action;
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Missing "action"' }, { status: 400 });
    }

    const db = getDb();

    if (action === 'add') {
      const planId = typeof body.planId === 'string' ? body.planId : '';
      const sectionType = typeof body.sectionType === 'string' ? body.sectionType.trim() : '';
      const sectionLabel = typeof body.sectionLabel === 'string' ? body.sectionLabel.trim() : '';
      const content = typeof body.content === 'string' ? body.content : '';

      if (!planId) return NextResponse.json({ error: 'Missing "planId"' }, { status: 400 });
      if (!sectionType) return NextResponse.json({ error: 'Missing "sectionType"' }, { status: 400 });
      if (!sectionLabel) return NextResponse.json({ error: 'Missing "sectionLabel"' }, { status: 400 });
      if (!content.trim()) return NextResponse.json({ error: 'Missing "content"' }, { status: 400 });

      const plan = getPlan(planId);
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO approval_queue (id, plan_id, section_type, section_label, content, status, edited_content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', NULL, datetime('now'), datetime('now'))`
      ).run(id, planId, sectionType, sectionLabel, content);

      const item = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(id) as ApprovalQueueRow;
      return NextResponse.json({ item });
    }

    if (action === 'approve' || action === 'reject' || action === 'set-status') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return NextResponse.json({ error: 'Missing "id"' }, { status: 400 });

      const status =
        action === 'approve'
          ? 'approved'
          : action === 'reject'
            ? 'rejected'
            : normalizeStatus(body.status);

      if (!status) {
        return NextResponse.json({ error: 'Missing/invalid "status"' }, { status: 400 });
      }

      const result = db
        .prepare(`UPDATE approval_queue SET status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(status, id);

      if (result.changes === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const item = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(id) as ApprovalQueueRow;
      return NextResponse.json({ item });
    }

    if (action === 'update') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return NextResponse.json({ error: 'Missing "id"' }, { status: 400 });

      const fields: string[] = [];
      const values: unknown[] = [];

      if ('editedContent' in body) {
        fields.push('edited_content = ?');
        values.push(typeof body.editedContent === 'string' ? body.editedContent : null);
      }

      if (typeof body.content === 'string') {
        fields.push('content = ?');
        values.push(body.content);
      }

      if (typeof body.sectionLabel === 'string') {
        fields.push('section_label = ?');
        values.push(body.sectionLabel.trim());
      }

      if (typeof body.sectionType === 'string') {
        fields.push('section_type = ?');
        values.push(body.sectionType.trim());
      }

      if (fields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      fields.push("updated_at = datetime('now')");

      const result = db
        .prepare(`UPDATE approval_queue SET ${fields.join(', ')} WHERE id = ?`)
        .run(...values, id);

      if (result.changes === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const item = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(id) as ApprovalQueueRow;
      return NextResponse.json({ item });
    }

    if (action === 'delete') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return NextResponse.json({ error: 'Missing "id"' }, { status: 400 });

      const result = db.prepare('DELETE FROM approval_queue WHERE id = ?').run(id);
      if (result.changes === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update approval queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
