import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const stock = db.prepare(`
      SELECT p.id, p.name, p.name_ar, c.name as category_name, c.name_ar as category_name_ar, p.current_stock, 'product' as type
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.track_stock = 1 AND p.active = 1
      UNION ALL
      SELECT id, name, name as name_ar, 'مواد خام' as category_name, 'مواد خام' as category_name_ar, current_stock, 'ingredient' as type
      FROM ingredients
      WHERE active = 1
      ORDER BY type, category_name, name
    `).all();
    return NextResponse.json(stock);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDb();
    
    const items = body.items ? body.items : [body];
    
    const insertEntry = db.prepare('INSERT INTO stock_entries (product_id, ingredient_id, period_id, quantity, unit_cost, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const updateProduct = db.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?');
    const updateIngredient = db.prepare('UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?');

    db.transaction(() => {
      for (const item of items) {
        const { productId, ingredientId, quantity, periodId, unitCost, notes, userId } = item;
        if (!quantity) continue;
        
        insertEntry.run(productId || null, ingredientId || null, periodId || null, quantity, unitCost || 0, notes || null, userId || null);

        if (productId) {
          updateProduct.run(quantity, productId);
        }
        if (ingredientId) {
          updateIngredient.run(quantity, ingredientId);
        }
      }
    })();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
