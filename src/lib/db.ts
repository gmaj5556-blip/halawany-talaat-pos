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

let _sqliteDb: any = null;
let _pgPool: Pool | null = null;

export function getDb() {
  if (isCloud) {
    if (!_pgPool) {
      _pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
    }
    return {
      type: 'pg',
      pool: _pgPool,
      prepare: (sql: string) => {
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
      transaction: (fn: any) => fn 
    };
  } else {
    if (!_sqliteDb) {
      // Dynamic import to avoid Vercel build issues
      const Database = require('better-sqlite3');
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
    SELECT 'Baked Goods', 'مخبوزات بالكيلو', '🥐', '#F59E0B', 2
    WHERE NOT EXISTS (SELECT 1 FROM categories WHERE id = 2);

    INSERT INTO products (category_id, name, name_ar, price, cost, track_stock, current_stock, unit)
    SELECT 2, 'معمول سوري عجوة', 'معمول سوري عجوة', 295, 0, 0, 0, 'kg'
    WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'معمول سوري عجوة');
  `);
}
