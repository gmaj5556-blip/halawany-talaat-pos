import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { format } from 'date-fns';

// POST - create order
export async function POST(request: NextRequest) {
  try {
    const { items, payments, shiftId, periodId, userId, discount, notes } = await request.json();
    const db = getDb();

    // Generate order number
    const today = format(new Date(), 'yyyyMMdd');
    const lastOrder = db.prepare(
      "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1"
    ).get(`${today}%`) as any;

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.order_number.slice(-4));
      seq = lastSeq + 1;
    }
    const orderNumber = `${today}${String(seq).padStart(4, '0')}`;

    const subtotal = items.reduce((sum: number, item: any) => sum + item.unit_price * item.quantity, 0);
    const totalDiscount = discount || 0;
    const total = subtotal - totalDiscount;

    const createOrder = db.transaction(() => {
      // Create order
      const orderResult = db.prepare(
        `INSERT INTO orders (order_number, period_id, shift_id, user_id, status, order_type, subtotal, discount, total, notes)
         VALUES (?, ?, ?, ?, 'paid', 'takeaway', ?, ?, ?, ?)`
      ).run(orderNumber, periodId, shiftId, userId, subtotal, totalDiscount, total, notes || null);

      const orderId = orderResult.lastInsertRowid;

      // Add order items
      const insertItem = db.prepare(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const item of items) {
        insertItem.run(orderId, item.product_id, item.name, item.quantity, item.unit_price, item.unit_price * item.quantity);
      }

      // Add payments
      const insertPayment = db.prepare(
        'INSERT INTO payments (order_id, method, amount, received_amount, change_amount) VALUES (?, ?, ?, ?, ?)'
      );
      for (const payment of payments) {
        insertPayment.run(orderId, payment.method, payment.amount, payment.received_amount || payment.amount, payment.change_amount || 0);
      }

      // Deduct stock for tracked products
      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as any;
        if (product && product.track_stock) {
          db.prepare('UPDATE products SET current_stock = MAX(0, current_stock - ?) WHERE id = ?').run(item.quantity, item.product_id);
        }

        // Deduct ingredients
        const recipes = db.prepare('SELECT * FROM recipes WHERE product_id = ?').all(item.product_id) as any[];
        for (const recipe of recipes) {
          const deduct = recipe.quantity * item.quantity;
          db.prepare('UPDATE ingredients SET current_stock = MAX(0, current_stock - ?) WHERE id = ?').run(deduct, recipe.ingredient_id);
        }
      }

      // Update shift totals
      if (shiftId) {
        db.prepare('UPDATE shifts SET total_sales = total_sales + ?, total_orders = total_orders + 1 WHERE id = ?').run(total, shiftId);
      }

      return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    });

    const order = createOrder();
    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET - list orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const shiftId = searchParams.get('shiftId');
    const limit = searchParams.get('limit') || '50';
    const db = getDb();

    let query = `SELECT o.*, u.name as cashier_name FROM orders o LEFT JOIN users u ON o.user_id = u.id`;
    const params: any[] = [];

    if (periodId) {
      query += ' WHERE o.period_id = ?';
      params.push(periodId);
    } else if (shiftId) {
      query += ' WHERE o.shift_id = ?';
      params.push(shiftId);
    }

    query += ` ORDER BY o.id DESC LIMIT ${limit}`;
    const orders = db.prepare(query).all(...params);
    return NextResponse.json(orders);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
