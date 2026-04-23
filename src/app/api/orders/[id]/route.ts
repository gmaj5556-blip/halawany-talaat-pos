import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(id);
    const cashier = db.prepare('SELECT name FROM users WHERE id = ?').get(order.user_id) as any;

    return NextResponse.json({ ...order, items, payments, cashier_name: cashier?.name });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
