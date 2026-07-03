import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { getDB } from "../local/sqlite";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase environment variables are missing! Check your .env file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export async function syncDatabaseWithCloud(): Promise<void> {
  console.log("Starting sync engine cycle...");
  const db = await getDB();

  try {
    // ============================================================
    // PART 1: DOWNLOAD (Supabase -> Local SQLite)
    // ============================================================

    // 1. SKUs
    const { data: cloudSkus, error: skuErr } = await supabase
      .from("sku")
      .select("*");
    if (skuErr) throw skuErr;

    if (cloudSkus) {
      for (const item of cloudSkus) {
        await db.runAsync(
          `INSERT INTO sku (id, name, brand, size, price, image_path, active, created_at, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
           ON CONFLICT(id) DO UPDATE SET
             name=excluded.name, brand=excluded.brand, size=excluded.size,
             price=excluded.price, active=excluded.active, synced=1
           WHERE synced = 1`, // Don't clobber a local unsynced edit that hasn't uploaded yet
          [
            item.id,
            item.name,
            item.brand,
            item.size,
            item.price,
            item.image_path,
            item.active ? 1 : 0,
            item.created_at,
          ],
        );
      }
    }

    // 2. Shops
    const { data: cloudShops, error: shopErr } = await supabase
      .from("shop")
      .select("*");
    if (shopErr) throw shopErr;

    if (cloudShops) {
      for (const s of cloudShops) {
        await db.runAsync(
          `INSERT INTO shop (id, name, phone, created_at, synced)
           VALUES (?, ?, ?, ?, 1)
           ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, synced=1`,
          [s.id, s.name, s.phone, s.created_at],
        );
      }
    }

    // 3. Stock ledger — pull last 30 days, ALL entry types (load/sale/cancel_reversal)
    // so both admin and driver phones have a complete picture, not just admin's loads.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffStr = thirtyDaysAgo.toISOString().split("T")[0];

    const { data: cloudLedger, error: ledgerErr } = await supabase
      .from("stock_ledger")
      .select("*")
      .gte("entry_date", cutoffStr);
    if (ledgerErr) throw ledgerErr;

    if (cloudLedger) {
      for (const entry of cloudLedger) {
        await db.runAsync(
          `INSERT INTO stock_ledger (id, sku_id, entry_date, quantity, entry_type, invoice_id, created_at, device_id, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
           ON CONFLICT(id) DO NOTHING`,
          [
            entry.id,
            entry.sku_id,
            entry.entry_date,
            entry.quantity,
            entry.entry_type,
            entry.invoice_id,
            entry.created_at,
            entry.device_id,
          ],
        );
      }
    }

    // ============================================================
    // PART 2: UPLOAD (Local SQLite -> Supabase)
    // ============================================================

    // 1. Upload any locally-created/edited shops
    const unsyncedShops = await db.getAllAsync<{
      id: string;
      name: string;
      phone: string | null;
      created_at: string;
    }>("SELECT * FROM shop WHERE synced = 0");

    for (const shop of unsyncedShops) {
      const { error } = await supabase.from("shop").upsert({
        id: shop.id,
        name: shop.name,
        phone: shop.phone,
        created_at: shop.created_at,
      });
      if (error) throw error;

      await db.runAsync("UPDATE shop SET synced = 1 WHERE id = ?", [shop.id]);
    }

    // 2. Upload any locally-edited SKUs (price/active changes from admin)
    const unsyncedSkus = await db.getAllAsync<{
      id: string;
      name: string;
      brand: string | null;
      size: string | null;
      price: number;
      image_path: string | null;
      active: number;
      created_at: string;
    }>("SELECT * FROM sku WHERE synced = 0");

    for (const sku of unsyncedSkus) {
      const { error } = await supabase.from("sku").upsert({
        id: sku.id,
        name: sku.name,
        brand: sku.brand,
        size: sku.size,
        price: sku.price,
        image_path: sku.image_path,
        active: sku.active === 1,
        created_at: sku.created_at,
      });
      if (error) throw error;

      await db.runAsync("UPDATE sku SET synced = 1 WHERE id = ?", [sku.id]);
    }

    // 3. Upload unsynced invoices + their items
    const unsyncedInvoices = await db.getAllAsync<{
      id: string;
      shop_id: string;
      invoice_date: string;
      total_amount: number;
      total_boxes: number;
      cash_amount: number;
      paytm_amount: number;
      udhaar_amount: number;
      status: string;
      printed: number;
      device_id: string;
      created_at: string;
    }>("SELECT * FROM invoice WHERE synced = 0");

    for (const inv of unsyncedInvoices) {
      const invItems = await db.getAllAsync<{
        id: string;
        sku_id: string;
        boxes: number;
        amount: number;
      }>("SELECT * FROM invoice_item WHERE invoice_id = ?", [inv.id]);

      const { error: invPushErr } = await supabase.from("invoice").upsert({
        id: inv.id,
        shop_id: inv.shop_id,
        invoice_date: inv.invoice_date,
        created_at: inv.created_at,
        total_amount: inv.total_amount,
        total_boxes: inv.total_boxes,
        cash_amount: inv.cash_amount,
        paytm_amount: inv.paytm_amount,
        udhaar_amount: inv.udhaar_amount,
        status: inv.status,
        printed: inv.printed === 1,
        device_id: inv.device_id,
      });
      if (invPushErr) throw invPushErr;

      for (const item of invItems) {
        const { error } = await supabase.from("invoice_item").upsert({
          id: item.id,
          invoice_id: inv.id,
          sku_id: item.sku_id,
          boxes: item.boxes,
          amount: item.amount,
        });
        if (error) throw error;
      }

      await db.runAsync("UPDATE invoice SET synced = 1 WHERE id = ?", [inv.id]);
      await db.runAsync(
        "UPDATE invoice_item SET synced = 1 WHERE invoice_id = ?",
        [inv.id],
      );
    }

    // 4. Upload ALL unsynced stock ledger entries (load, sale, cancel_reversal)
    const unsyncedLedger = await db.getAllAsync<{
      id: string;
      sku_id: string;
      entry_date: string;
      quantity: number;
      entry_type: string;
      invoice_id: string | null;
      created_at: string;
      device_id: string;
    }>("SELECT * FROM stock_ledger WHERE synced = 0");

    for (const leg of unsyncedLedger) {
      const { error: legPushErr } = await supabase.from("stock_ledger").upsert({
        id: leg.id,
        sku_id: leg.sku_id,
        entry_date: leg.entry_date,
        quantity: leg.quantity,
        entry_type: leg.entry_type,
        invoice_id: leg.invoice_id,
        created_at: leg.created_at,
        device_id: leg.device_id,
      });
      if (legPushErr) throw legPushErr;

      await db.runAsync("UPDATE stock_ledger SET synced = 1 WHERE id = ?", [
        leg.id,
      ]);
    }

    console.log("Sync round completed successfully!");
  } catch (err) {
    console.error("Cloud Sync Engine Exception:", err);
  }
}
