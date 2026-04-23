import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'pos.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initializeSchema(_db);
  }
  return _db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    -- Users & Auth
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      pin TEXT UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'cashier', -- admin, cashier, manager
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Cash Drawers / Safes
    CREATE TABLE IF NOT EXISTS cash_drawers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    -- Business Periods (daily business day)
    CREATE TABLE IF NOT EXISTS periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', -- open, closed
      opened_by INTEGER REFERENCES users(id),
      closed_by INTEGER REFERENCES users(id),
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      total_sales REAL NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    -- Employee Shifts
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL REFERENCES periods(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      cash_drawer_id INTEGER REFERENCES cash_drawers(id),
      status TEXT NOT NULL DEFAULT 'open', -- open, closed
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

    -- Ingredients (raw materials)
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'g', -- g, ml, piece
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    -- Recipe (product -> ingredients mapping)
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
      quantity REAL NOT NULL, -- amount used per product unit
      UNIQUE(product_id, ingredient_id)
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      period_id INTEGER REFERENCES periods(id),
      shift_id INTEGER REFERENCES shifts(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'paid', -- pending, paid, cancelled, refunded
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
      method TEXT NOT NULL, -- cash, card, instapay, vodafone, delivery
      amount REAL NOT NULL,
      received_amount REAL,
      change_amount REAL DEFAULT 0,
      reference TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Stock Entries (daily receiving)
    CREATE TABLE IF NOT EXISTS stock_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      ingredient_id INTEGER REFERENCES ingredients(id),
      period_id INTEGER REFERENCES periods(id),
      quantity REAL NOT NULL,
      unit_cost REAL DEFAULT 0,
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Inventory Adjustments (Over/Short)
    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      ingredient_id INTEGER REFERENCES ingredients(id),
      period_id INTEGER REFERENCES periods(id),
      shift_id INTEGER REFERENCES shifts(id),
      system_quantity REAL NOT NULL,
      actual_quantity REAL NOT NULL,
      difference REAL NOT NULL, -- actual - system (negative = short, positive = over)
      type TEXT NOT NULL, -- over, short, exact
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Shift Reports
    CREATE TABLE IF NOT EXISTS shift_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER UNIQUE NOT NULL REFERENCES shifts(id),
      total_sales REAL NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0,
      cash_sales REAL NOT NULL DEFAULT 0,
      card_sales REAL NOT NULL DEFAULT 0,
      instapay_sales REAL NOT NULL DEFAULT 0,
      vodafone_sales REAL NOT NULL DEFAULT 0,
      delivery_sales REAL NOT NULL DEFAULT 0,
      opening_cash REAL NOT NULL DEFAULT 0,
      expected_cash REAL NOT NULL DEFAULT 0,
      actual_cash REAL NOT NULL DEFAULT 0,
      actual_card REAL NOT NULL DEFAULT 0,
      actual_wallet REAL NOT NULL DEFAULT 0,
      cash_difference REAL NOT NULL DEFAULT 0, -- actual - expected
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Seed default data
    INSERT OR IGNORE INTO users (id, name, username, pin, password_hash, role) VALUES 
      (1, 'Admin', 'admin', '1234', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
      (2, 'Reda (Morning)', 'reda', '0000', NULL, 'cashier'),
      (3, 'Abdelrahman (Night)', 'abdelrahman', '00000', NULL, 'cashier');

    INSERT OR IGNORE INTO cash_drawers (id, name, description) VALUES 
      (1, 'Safe #1', 'Main Cash Drawer'),
      (2, 'Safe #2', 'Secondary Cash Drawer');

    INSERT OR IGNORE INTO categories (id, name, name_ar, icon, color, sort_order) VALUES 
      (1, 'Drinks', 'مشروبات', '🥤', '#06B6D4', 1),
      (2, 'Baked Goods', 'مخبوزات بالكيلو', '🥐', '#F59E0B', 2),
      (3, 'Sweets', 'حلويات', '🍰', '#EC4899', 3),
      (4, 'Gateau', 'جاتوه', '🧁', '#8B5CF6', 4),
      (5, 'Eclair', 'إكلير', '🥖', '#92400E', 5),
      (6, 'Mille-feuille', 'ميلفاي', '🥮', '#D97706', 6),
      (7, 'Pavlova', 'بافلوفا', '🍨', '#10B981', 7),
      (8, 'Pavlova Roll', 'بافلوفا رول', '🍥', '#14B8A6', 8);

    INSERT OR IGNORE INTO products (id, category_id, name, name_ar, price, track_stock, current_stock) VALUES 
      -- Drinks (1)
      (1, 1, 'Mirinda Orange', 'ميرندا برتقال كانز', 30, 0, 0),
      (2, 1, 'Mirinda Apple', 'ميرندا تفاح كانز', 30, 0, 0),
      (3, 1, 'Fayrouz Apple', 'فيروز تفاح', 35, 0, 0),
      (4, 1, 'Fayrouz Pineapple', 'فيروز أناناس', 35, 0, 0),
      (5, 1, 'Birell', 'بيريل كانز', 35, 0, 0),
      (6, 1, 'Red Bull', 'ريد بول', 65, 0, 0),
      (7, 1, 'Small Water', 'مياه صغيرة', 12, 0, 0),
      (8, 1, 'Tea', 'شاي', 25, 0, 0),
      (9, 1, 'Flavored Tea', 'شاي نكهات', 25, 0, 0),
      (10, 1, 'Turkish Coffee', 'قهوة تركي سادة', 30, 0, 0),
      (11, 1, 'Double Turkish Coffee', 'قهوة تركي دبل', 28, 0, 0),
      (12, 1, 'Large Water', 'مياه كبيرة', 35, 0, 0),
      (13, 1, 'Pepsi', 'بيبسي كانز', 16, 0, 0),
      (14, 1, 'Diet Pepsi', 'بيبسي دايت كانز', 30, 0, 0),
      (15, 1, '7up', 'سفن أب كانز', 30, 0, 0),
      (16, 1, 'Diet 7up', 'سفن أب دايت كانز', 30, 0, 0),

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
