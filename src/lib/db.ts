import Database from 'better-sqlite3';
import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';

// Configuration
const isCloud = !!process.env.DATABASE_URL;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'pos.db');

if (!isCloud && !fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _sqliteDb: Database.Database | null = null;
let _pgPool: Pool | null = null;

export function getDb() {
  if (isCloud) {
    if (!_pgPool) {
      _pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      // We don't initialize schema automatically for PG here to avoid connection overhead in each request
      // But for this simple app, we can do a one-time init
    }
    return {
      type: 'pg',
      pool: _pgPool,
      prepare: (sql: string) => {
        // Mocking SQLite's prepare for PG
        return {
          run: async (...params: any[]) => {
            const pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
            return await _pgPool!.query(pgSql, params);
          },
          get: async (...params: any[]) => {
            const pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
            const res = await _pgPool!.query(pgSql, params);
            return res.rows[0];
          },
          all: async (...params: any[]) => {
            const pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
            const res = await _pgPool!.query(pgSql, params);
            return res.rows;
          }
        };
      },
      exec: async (sql: string) => {
        return await _pgPool!.query(sql);
      },
      transaction: (fn: any) => fn // simplified for now
    };
  } else {
    if (!_sqliteDb) {
      _sqliteDb = new Database(DB_PATH);
      _sqliteDb.pragma('journal_mode = WAL');
      _sqliteDb.pragma('foreign_keys = ON');
      initializeSQLiteSchema(_sqliteDb);
    }
    return {
      type: 'sqlite',
      db: _sqliteDb,
      prepare: (sql: string) => {
        const stmt = _sqliteDb!.prepare(sql);
        return {
          run: (...params: any[]) => stmt.run(...params),
          get: (...params: any[]) => stmt.get(...params),
          all: (...params: any[]) => stmt.all(...params)
        };
      },
      exec: (sql: string) => _sqliteDb!.exec(sql),
      transaction: (fn: any) => _sqliteDb!.transaction(fn)
    };
  }
}

// Since the API routes use .run().lastInsertRowid which is SQLite specific, 
// I will need to update them or provide a better wrapper. 
// For now, I'll keep the direct DB functions available.

function initializeSQLiteSchema(db: Database.Database) {
  db.exec(`
    -- Users & Auth
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      pin TEXT UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'cashier',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Cash Drawers
    CREATE TABLE IF NOT EXISTS cash_drawers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    -- Periods
    CREATE TABLE IF NOT EXISTS periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      opened_by INTEGER REFERENCES users(id),
      closed_by INTEGER REFERENCES users(id),
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      total_sales REAL NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    -- Shifts
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL REFERENCES periods(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      cash_drawer_id INTEGER REFERENCES cash_drawers(id),
      status TEXT NOT NULL DEFAULT 'open',
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      opening_cash REAL NOT NULL DEFAULT 0,
      total_sales REAL NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT,
      icon TEXT,
      color TEXT DEFAULT '#6366f1',
      sort_order INTEGER DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      name_ar TEXT,
      price REAL NOT NULL,
      cost REAL DEFAULT 0,
      track_stock INTEGER NOT NULL DEFAULT 0,
      current_stock REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'piece',
      active INTEGER NOT NULL DEFAULT 1,
      image_url TEXT
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      period_id INTEGER REFERENCES periods(id),
      shift_id INTEGER REFERENCES shifts(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'paid',
      order_type TEXT NOT NULL DEFAULT 'takeaway',
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Order Items
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      notes TEXT
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      received_amount REAL,
      change_amount REAL DEFAULT 0,
      reference TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Seed
    INSERT OR IGNORE INTO users (id, name, username, pin, role) VALUES 
      (1, 'مدير الفرع', 'admin', '1234', 'admin'),
      (2, 'كاشير 1', 'cashier1', '1111', 'cashier');

    INSERT OR IGNORE INTO categories (id, name, name_ar, icon, color, sort_order) VALUES 
      (1, 'Drinks', 'مشروبات', '🥤', '#06B6D4', 1),
      (2, 'Baked Goods', 'مخبوزات بالكيلو', '🥐', '#F59E0B', 2),
      (3, 'Sweets', 'حلويات', '🍰', '#EC4899', 3),
      (4, 'Gateau', 'جاتوه', '🧁', '#8B5CF6', 4),
      (5, 'Eclair', 'إكلير', '🥖', '#92400E', 5),
      (6, 'Mille-feuille', 'ميلفاي', '🥮', '#D97706', 6);
  `);
}

// PG Schema Initialization Helper
export async function initializePgSchema() {
  const db = getDb();
  if (db.type !== 'pg') return;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      pin TEXT UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'cashier',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_drawers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS periods (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      opened_by INTEGER REFERENCES users(id),
      closed_by INTEGER REFERENCES users(id),
      start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP,
      total_sales REAL NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id SERIAL PRIMARY KEY,
      period_id INTEGER NOT NULL REFERENCES periods(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      cash_drawer_id INTEGER REFERENCES cash_drawers(id),
      status TEXT NOT NULL DEFAULT 'open',
      start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP,
      opening_cash REAL NOT NULL DEFAULT 0,
      total_sales REAL NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_ar TEXT,
      icon TEXT,
      color TEXT DEFAULT '#6366f1',
      sort_order INTEGER DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      name_ar TEXT,
      price REAL NOT NULL,
      cost REAL DEFAULT 0,
      track_stock INTEGER NOT NULL DEFAULT 0,
      current_stock REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'piece',
      active INTEGER NOT NULL DEFAULT 1,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      period_id INTEGER REFERENCES periods(id),
      shift_id INTEGER REFERENCES shifts(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'paid',
      order_type TEXT NOT NULL DEFAULT 'takeaway',
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      received_amount REAL,
      change_amount REAL DEFAULT 0,
      reference TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Seed
    INSERT INTO users (name, username, pin, role) 
    SELECT 'مدير الفرع', 'admin', '1234', 'admin'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

    INSERT INTO categories (name, name_ar, icon, color, sort_order)
    SELECT 'Drinks', 'مشروبات', '🥤', '#06B6D4', 1
    WHERE NOT EXISTS (SELECT 1 FROM categories WHERE id = 1);
  `);
}

      -- Baked Goods (2)
      (17, 2, 'Syrian Maamoul Dates', 'معمول سوري عجوة', 295, 0, 0),
      (18, 2, 'Syrian Maamoul Malban', 'معمول سوري ملبن', 340, 0, 0),
      (19, 2, 'Semolina Maamoul Plain', 'معمول سميد سادة', 235, 0, 0),
      (20, 2, 'Semolina Maamoul Cinnamon', 'معمول سميد قرفة', 245, 0, 0),
      (21, 2, 'Plain Qoras', 'قرص سادة', 245, 0, 0),
      (22, 2, 'Dates Qoras', 'قرص عجوة', 210, 0, 0),
      (23, 2, 'Plain Qaraqish', 'قراقيش سادة', 245, 0, 0),
      (24, 2, 'Black Seed Qaraqish', 'قراقيش حبة البركة', 295, 0, 0),
      (25, 2, 'Regular Remosh', 'رموش عادية', 315, 0, 0),
      (26, 2, 'Turkish Remosh', 'رموش تركي', 315, 0, 0),
      (27, 2, 'Hazelnut Maqlouba', 'مقلوبة بندق', 355, 0, 0),
      (28, 2, 'Pistachio Maqlouba', 'مقلوبة فستق', 620, 0, 0),

      -- Sweets (3)
      (29, 3, 'Large Banana Strawberry Pudding', 'بودينج موز وفراولة كبير', 100, 1, 0),
      (30, 3, 'Small Banana Strawberry Pudding', 'بودينج موز وفراولة صغير', 50, 1, 0),
      (31, 3, 'Large Banana Pudding Cup', 'كوب بودينج موز كبير', 120, 1, 0),
      (32, 3, 'Small Banana Pudding Cup', 'كوب بودينج موز صغير', 65, 1, 0),
      (33, 3, 'Mini Torte Piece', 'قطعة ميني تورتة', 75, 1, 0),
      (34, 3, 'Molten Cake', 'مولتن كيك', 45, 1, 0),
      (35, 3, 'Snickers Tart Piece', 'قطعة تارت سنيكرز', 40, 1, 0),
      (36, 3, 'Assorted Piece', 'قطعة متنوع', 40, 1, 0),
      (37, 3, 'Blueberry Cheesecake', 'تشيز كيك بلوبيري', 95, 1, 0),
      (38, 3, 'Strawberry Cheesecake', 'تشيز كيك فراولة', 60, 1, 0),
      (39, 3, 'Lotus Cheesecake', 'تشيز كيك لوتس', 65, 1, 0),
      (40, 3, 'Mango Cheesecake', 'تشيز كيك مانجو', 65, 1, 0),
      (41, 3, 'Blueberry Cheesecake Slice', 'تشيز كيك بلوبيري سلايس', 75, 1, 0),
      (42, 3, 'Lotus Tiramisu Scoop', 'بولة تراميسو لوتس', 70, 1, 0),
      (43, 3, 'Cocoa Tiramisu Scoop', 'بولة تراميسو كاكاو', 110, 1, 0),
      (44, 3, 'Sebastian Cheesecake', 'سباستيان تشيز كيك', 500, 1, 0),
      (45, 3, 'Despacito', 'ديسباسيتو', 100, 1, 0),
      (46, 3, 'Lotus Molten Cake', 'مولتن كيك لوتس', 50, 1, 0),
      (47, 3, 'Tiramisu Cake', 'تراميسو كيك', 400, 1, 0),
      (48, 3, 'Mango Tiramisu', 'تراميسو مانجو', 97, 1, 0),
      (49, 3, 'Nutella Konafa Cup', 'كوب كنافة نوتيلا', 70, 1, 0),
      (50, 3, 'Pistachio Konafa Cup', 'كوب كنافة مسدق', 95, 1, 0),

      -- Gateau (4)
      (51, 4, 'Chocolate Gateau', 'جاتوه شوكولاتة', 25, 1, 0),
      (52, 4, 'Vanilla Gateau', 'جاتوه فانيليا', 25, 1, 0),
      (53, 4, 'Strawberry Gateau', 'جاتوه فراولة', 25, 1, 0),
      (54, 4, 'Mango Gateau', 'جاتوه مانجو', 25, 1, 0),
      (55, 4, 'Caramel Gateau', 'جاتوه كراميل', 25, 1, 0),
      (56, 4, 'Lotus Gateau', 'جاتوه لوتس', 25, 1, 0),
      (57, 4, 'Oreo Gateau', 'جاتوه أوريو', 25, 1, 0),
      (58, 4, 'Pistachio Gateau', 'جاتوه فستق', 25, 1, 0),
      (59, 4, 'Fruit Gateau', 'جاتوه فواكه', 25, 1, 0),

      -- Eclair (5)
      (60, 5, 'Chocolate Eclair', 'إكلير شوكولاتة', 25, 1, 0),
      (61, 5, 'Vanilla Eclair', 'إكلير فانيليا', 25, 1, 0),
      (62, 5, 'Caramel Eclair', 'إكلير كراميل', 25, 1, 0),
      (63, 5, 'Lotus Eclair', 'إكلير لوتس', 25, 1, 0),

      -- Mille-feuille (6)
      (64, 6, 'Chocolate Mille-feuille', 'ميلفاي شوكولاتة', 25, 1, 0),
      (65, 6, 'Vanilla Mille-feuille', 'ميلفاي فانيليا', 25, 1, 0),
      (66, 6, 'Caramel Mille-feuille', 'ميلفاي كراميل', 25, 1, 0),
      (67, 6, 'Lotus Mille-feuille', 'ميلفاي لوتس', 25, 1, 0),

      -- Pavlova (7)
      (68, 7, 'Blueberry Pavlova', 'بافلوفا بلوبيري', 65, 1, 0),
      (69, 7, 'Strawberry Pavlova', 'بافلوفا فراولة', 65, 1, 0),
      (70, 7, 'Mango Pavlova', 'بافلوفا مانجو', 65, 1, 0),

      -- Pavlova Roll (8)
      (71, 8, 'Blueberry Pavlova Roll', 'بافلوفا رول بلوبيري', 390, 1, 0),
      (72, 8, 'Strawberry Pavlova Roll', 'بافلوفا رول فراولة', 390, 1, 0),
      (73, 8, 'Mango Pavlova Roll', 'بافلوفا رول مانجو', 390, 1, 0);
  `);
}
