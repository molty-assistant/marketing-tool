import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const planId = url.searchParams.get('planId');
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const db = getDb();
    let query = 'SELECT * FROM content_schedule WHERE 1=1';
    const params: unknown[] = [];

    if (planId) { query += ' AND plan_id = ?'; params.push(planId); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (from) { query += ' AND scheduled_at >= ?'; params.push(from); }
    if (to) { query += ' AND scheduled_at <= ?'; params.push(to); }

    query += ' ORDER BY scheduled_at ASC';

    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ schedules: rows });
  } catch (err) {
    console.error('content-schedule GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, platform, contentType, topic, scheduledAt } = body;

    if (!planId || !scheduledAt) {
      return NextResponse.json({ error: 'Missing planId or scheduledAt' }, { status: 400 });
    }

    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO content_schedule (id, plan_id, platform, content_type, topic, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, planId, platform || 'instagram', contentType || 'post', topic || null, scheduledAt);

    const row = db.prepare('SELECT * FROM content_schedule WHERE id = ?').get(id);
    return NextResponse.json({ schedule: row }, { status: 201 });
  } catch (err) {
    console.error('content-schedule POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, topic, scheduledAt, platform, contentType, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM content_schedule WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE content_schedule SET
        topic = ?, scheduled_at = ?, platform = ?, content_type = ?, status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      topic ?? existing.topic,
      scheduledAt ?? existing.scheduled_at,
      platform ?? existing.platform,
      contentType ?? existing.content_type,
      status ?? existing.status,
      id
    );

    const row = db.prepare('SELECT * FROM content_schedule WHERE id = ?').get(id);
    return NextResponse.json({ schedule: row });
  } catch (err) {
    console.error('content-schedule PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare("UPDATE content_schedule SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND status = 'scheduled'").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Not found or not cancellable' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('content-schedule DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
