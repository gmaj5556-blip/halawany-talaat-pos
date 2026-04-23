import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const ingredients = db.prepare('SELECT * FROM ingredients WHERE active = 1 ORDER BY name').all();
    return NextResponse.json(ingredients);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, unit, current_stock, min_stock, cost_per_unit } = await request.json();
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit) VALUES (?, ?, ?, ?, ?)'
    ).run(name, unit || 'g', current_stock || 0, min_stock || 0, cost_per_unit || 0);
    return NextResponse.json(db.prepare('SELECT * FROM ingredients WHERE id = ?').get(result.lastInsertRowid));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
