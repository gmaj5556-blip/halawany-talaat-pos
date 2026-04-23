import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET - reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const periodId = searchParams.get('periodId');
    const shiftId = searchParams.get('shiftId');
    const db = getDb();

    if (type === 'period' && periodId) {
      const period = db.prepare('SELECT * FROM periods WHERE id = ?').get(periodId) as any;
      const shifts = db.prepare(`
        SELECT s.*, u.name as user_name, sr.*
        FROM shifts s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN shift_reports sr ON sr.shift_id = s.id
        WHERE s.period_id = ?
      `).all(periodId);
      const topProducts = db.prepare(`
        SELECT oi.product_name, SUM(oi.quantity) as total_qty, SUM(oi.total_price) as total_sales
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.period_id = ? AND o.status = 'paid'
        GROUP BY oi.product_name
        ORDER BY total_qty DESC
        LIMIT 10
      `).all(periodId);
      const paymentBreakdown = db.prepare(`
        SELECT p.method, SUM(p.amount) as total
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE o.period_id = ? AND o.status = 'paid'
        GROUP BY p.method
      `).all(periodId);
      return NextResponse.json({ period, shifts, topProducts, paymentBreakdown });
    }

    if (type === 'shift' && shiftId) {
      const shift = db.prepare('SELECT s.*, u.name as user_name FROM shifts s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(shiftId) as any;
      const report = db.prepare('SELECT * FROM shift_reports WHERE shift_id = ?').get(shiftId);
      const orders = db.prepare('SELECT * FROM orders WHERE shift_id = ? AND status = ?').all(shiftId, 'paid');
      return NextResponse.json({ shift, report, orders });
    }

    if (type === 'periods') {
      const periods = db.prepare('SELECT p.*, u.name as opened_by_name FROM periods p LEFT JOIN users u ON p.opened_by = u.id ORDER BY p.id DESC LIMIT 30').all();
      return NextResponse.json(periods);
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
