import * as SQLite from "expo-sqlite";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync("cold_drink_store.db");
  await initDatabase(dbInstance);
  return dbInstance;
}

async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Enable foreign keys constraint
  await db.execAsync("PRAGMA foreign_keys = ON;");

  // 1. SKU Table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sku (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      size TEXT,
      price REAL NOT NULL,
      image_path TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 2. Shop Table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS shop (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 3. Invoice Table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS invoice (
      id TEXT PRIMARY KEY NOT NULL,
      display_number INTEGER,
      shop_id TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      total_amount REAL NOT NULL,
      total_boxes INTEGER NOT NULL,
      cash_amount REAL NOT NULL DEFAULT 0,
      paytm_amount REAL NOT NULL DEFAULT 0,
      udhaar_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      printed INTEGER NOT NULL DEFAULT 0,
      device_id TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (shop_id) REFERENCES shop (id)
    );
  `);

  // 4. Invoice Item Table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS invoice_item (
      id TEXT PRIMARY KEY NOT NULL,
      invoice_id TEXT NOT NULL,
      sku_id TEXT NOT NULL,
      boxes INTEGER NOT NULL,
      amount REAL NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoice (id) ON DELETE CASCADE,
      FOREIGN KEY (sku_id) REFERENCES sku (id)
    );
  `);

  // 5. Stock Ledger Table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stock_ledger (
      id TEXT PRIMARY KEY NOT NULL,
      sku_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      entry_type TEXT NOT NULL,
      invoice_id TEXT,
      created_at TEXT NOT NULL,
      device_id TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (sku_id) REFERENCES sku (id),
      FOREIGN KEY (invoice_id) REFERENCES invoice (id) ON DELETE CASCADE
    );
  `);

  // Indexes for smooth and fast offline execution
  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_local_stock_ledger ON stock_ledger (sku_id, entry_date);",
  );
  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_local_invoice_date ON invoice (invoice_date);",
  );
  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_local_invoice_item ON invoice_item (invoice_id);",
  );
}
