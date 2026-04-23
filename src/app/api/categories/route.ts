import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const categories = db.prepare(
      'SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, id'
    ).all();
    return NextResponse.json(categories);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, name_ar, icon, color, sort_order } = await request.json();
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO categories (name, name_ar, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(name, name_ar, icon, color || '#6366f1', sort_order || 0);
    return NextResponse.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
