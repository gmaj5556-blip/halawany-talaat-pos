import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { format } from 'date-fns';

// GET - active period
export async function GET() {
  try {
    const db = getDb();
    const today = format(new Date(), 'yyyy-MM-dd');
    const period = db.prepare("SELECT * FROM periods WHERE date = ? AND status = 'open'").get(today);
    return NextResponse.json(period || null);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - open period
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    const db = getDb();
    const today = format(new Date(), 'yyyy-MM-dd');

    const existing = db.prepare("SELECT * FROM periods WHERE date = ? AND status = 'open'").get(today);
    if (existing) {
      return NextResponse.json({ error: 'A period is already open for today' }, { status: 400 });
    }

    const result = db.prepare(
      "INSERT INTO periods (date, status, opened_by, start_time) VALUES (?, 'open', ?, datetime('now'))"
    ).run(today, userId);

    const period = db.prepare('SELECT * FROM periods WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(period);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - close period
export async function PUT(request: NextRequest) {
  try {
    const { periodId, userId } = await request.json();
    const db = getDb();

    const openShifts = db.prepare("SELECT COUNT(*) as count FROM shifts WHERE period_id = ? AND status = 'open'").get(periodId) as any;
    if (openShifts.count > 0) {
      return NextResponse.json({ error: 'Close all open shifts before closing the period' }, { status: 400 });
    }

    const stats = db.prepare("SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_sales FROM orders WHERE period_id = ? AND status = 'paid'").get(periodId) as any;

    db.prepare(
      "UPDATE periods SET status = 'closed', closed_by = ?, end_time = datetime('now'), total_sales = ?, total_orders = ? WHERE id = ?"
    ).run(userId, stats.total_sales, stats.total_orders, periodId);

    const period = db.prepare('SELECT * FROM periods WHERE id = ?').get(periodId);
    return NextResponse.json(period);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
