import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET - active shift for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const periodId = searchParams.get('periodId');
    const db = getDb();

    if (userId) {
      const shift = db.prepare(
        `SELECT s.*, u.name as user_name, cd.name as drawer_name 
         FROM shifts s 
         LEFT JOIN users u ON s.user_id = u.id 
         LEFT JOIN cash_drawers cd ON s.cash_drawer_id = cd.id
         WHERE s.user_id = ? AND s.status = 'open' ORDER BY s.id DESC LIMIT 1`
      ).get(userId);
      return NextResponse.json(shift || null);
    }

    if (periodId) {
      const shifts = db.prepare(
        `SELECT s.*, u.name as user_name, cd.name as drawer_name 
         FROM shifts s 
         LEFT JOIN users u ON s.user_id = u.id 
         LEFT JOIN cash_drawers cd ON s.cash_drawer_id = cd.id
         WHERE s.period_id = ? ORDER BY s.id DESC`
      ).all(periodId);
      return NextResponse.json(shifts);
    }

    return NextResponse.json([]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - open shift
export async function POST(request: NextRequest) {
  try {
    const { userId, periodId, cashDrawerId, openingCash } = await request.json();
    const db = getDb();

    const existing = db.prepare("SELECT * FROM shifts WHERE user_id = ? AND status = 'open'").get(userId);
    if (existing) {
      return NextResponse.json({ error: 'You already have an open shift' }, { status: 400 });
    }

    const result = db.prepare(
      "INSERT INTO shifts (period_id, user_id, cash_drawer_id, opening_cash, status, start_time) VALUES (?, ?, ?, ?, 'open', datetime('now'))"
    ).run(periodId, userId, cashDrawerId, openingCash || 0);

    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(shift);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - close shift
export async function PUT(request: NextRequest) {
  try {
    const { shiftId, actualCash, actualCard, actualWallet } = await request.json();
    const db = getDb();

    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId) as any;
    if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 });

    // Calculate payment totals
    const payments = db.prepare(
      `SELECT method, COALESCE(SUM(amount), 0) as total 
       FROM payments p 
       JOIN orders o ON p.order_id = o.id 
       WHERE o.shift_id = ? AND o.status = 'paid'
       GROUP BY method`
    ).all(shiftId) as any[];

    let cashSales = 0, cardSales = 0, instapaySales = 0, vodafoneSales = 0, deliverySales = 0;
    payments.forEach((p: any) => {
      if (p.method === 'cash') cashSales = p.total;
      else if (p.method === 'card') cardSales = p.total;
      else if (p.method === 'instapay') instapaySales = p.total;
      else if (p.method === 'vodafone') vodafoneSales = p.total;
      else if (p.method === 'delivery') deliverySales = p.total;
    });

    const totalSalesRow = db.prepare(
      "SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_sales FROM orders WHERE shift_id = ? AND status = 'paid'"
    ).get(shiftId) as any;

    const expectedCash = shift.opening_cash + cashSales;
    const cashDifference = actualCash - expectedCash;

    db.prepare(
      "UPDATE shifts SET status = 'closed', end_time = datetime('now'), total_sales = ?, total_orders = ? WHERE id = ?"
    ).run(totalSalesRow.total_sales, totalSalesRow.total_orders, shiftId);

    // Create shift report
    db.prepare(
      `INSERT OR REPLACE INTO shift_reports 
       (shift_id, total_sales, total_orders, cash_sales, card_sales, instapay_sales, vodafone_sales, delivery_sales,
        opening_cash, expected_cash, actual_cash, actual_card, actual_wallet, cash_difference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      shiftId, totalSalesRow.total_sales, totalSalesRow.total_orders,
      cashSales, cardSales, instapaySales, vodafoneSales, deliverySales,
      shift.opening_cash, expectedCash, actualCash, actualCard || 0, actualWallet || 0, cashDifference
    );

    const report = db.prepare('SELECT * FROM shift_reports WHERE shift_id = ?').get(shiftId);
    return NextResponse.json({ shift: db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId), report });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
