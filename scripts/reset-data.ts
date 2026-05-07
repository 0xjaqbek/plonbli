/**
 * reset-data.ts
 *
 * Usuwa WSZYSTKIE dane użytkowników z bazy i storage.
 * Zachowuje: kategorie (dane systemowe).
 *
 * Uruchomienie:
 *   npx tsx scripts/reset-data.ts --confirm
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { sql } from "drizzle-orm";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { createClient } from "@supabase/supabase-js";

// ── Safety check ─────────────────────────────────────────────────────────────

const CONFIRM = process.argv[2];
if (CONFIRM !== "--confirm") {
  console.error(
    "\n⚠️  To uruchomi NIEODWRACALNE usunięcie wszystkich danych!\n" +
      "   Uruchom z flagą --confirm, żeby potwierdzić:\n\n" +
      "   npx tsx --env-file .env.local scripts/reset-data.ts --confirm\n"
  );
  process.exit(1);
}

// ── DB setup ─────────────────────────────────────────────────────────────────

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

// ── Storage setup ─────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BUCKET = "images";

// ── Main ─────────────────────────────────────────────────────────────────────

async function resetData() {
  console.log("\n🗑️  Reset danych aplikacji\n");

  // 1. Baza danych
  console.log("📊 Czyszczenie bazy danych...");
  await db.execute(sql`
    TRUNCATE TABLE
      order_status_history,
      order_items,
      orders,
      cart_items,
      pickup_slots,
      pickup_points,
      collection_items,
      collections,
      crop_logs,
      reviews,
      event_rsvps,
      events,
      proxy_farmer_follows,
      proxy_farmers,
      follows,
      reactions,
      comments,
      posts,
      group_members,
      groups,
      messages,
      conversation_members,
      conversations,
      listings,
      products,
      push_subscriptions,
      notification_preferences,
      invitations,
      verification_tokens,
      sessions,
      auth_accounts,
      users
    RESTART IDENTITY CASCADE
  `);
  console.log("✅ Baza wyczyszczona (kategorie zachowane)\n");

  // 2. Supabase Storage
  console.log("🖼️  Czyszczenie plików w storage...");
  await clearStorageFolder("");
  console.log("✅ Storage wyczyszczony\n");

  console.log("✅ Reset zakończony. Aplikacja gotowa na nowych użytkowników.\n");
  process.exit(0);
}

async function clearStorageFolder(prefix: string) {
  const { data: items, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });

  if (error) {
    console.error(`  Błąd listowania "${prefix}":`, error.message);
    return;
  }
  if (!items || items.length === 0) return;

  const files = items.filter((item) => item.id !== null);
  const folders = items.filter((item) => item.id === null);

  if (files.length > 0) {
    const paths = files.map((f) => (prefix ? `${prefix}/${f.name}` : f.name));
    const { error: delError } = await supabase.storage
      .from(BUCKET)
      .remove(paths);
    if (delError) {
      console.error("  Błąd usuwania plików:", delError.message);
    } else {
      console.log(`  Usunięto ${paths.length} plików z "${prefix || "/"}"`);
    }
  }

  for (const folder of folders) {
    await clearStorageFolder(prefix ? `${prefix}/${folder.name}` : folder.name);
  }
}

resetData().catch((err) => {
  console.error("\n❌ Reset nie powiódł się:", err);
  process.exit(1);
});
