import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const db = getDb();

    const query = categoryId
      ? 'SELECT * FROM products WHERE category_id = ? AND active = 1 ORDER BY name'
      : 'SELECT * FROM products WHERE active = 1 ORDER BY category_id, name';

    const products = categoryId
      ? db.prepare(query).all(categoryId)
      : db.prepare(query).all();

    return NextResponse.json(products);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { category_id, name, name_ar, price, cost, track_stock, current_stock, unit } = await request.json();
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO products (category_id, name, name_ar, price, cost, track_stock, current_stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(category_id, name, name_ar, price, cost || 0, track_stock ? 1 : 0, current_stock || 0, unit || 'piece');
    return NextResponse.json(db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, category_id, name, name_ar, price, cost, track_stock, unit, active } = await request.json();
    const db = getDb();
    db.prepare(
      'UPDATE products SET category_id=?, name=?, name_ar=?, price=?, cost=?, track_stock=?, unit=?, active=? WHERE id=?'
    ).run(category_id, name, name_ar, price, cost || 0, track_stock ? 1 : 0, unit || 'piece', active !== false ? 1 : 0, id);
    return NextResponse.json(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
