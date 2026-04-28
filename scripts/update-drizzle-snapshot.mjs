/**
 * Updates Drizzle meta snapshot after manual DAC7 migration.
 * Run once after writing drizzle/0008_dac7_noticeboard.sql
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const metaDir = join(root, "drizzle", "meta");

// Load last snapshot
const snap = JSON.parse(readFileSync(join(metaDir, "0007_snapshot.json"), "utf-8"));

// 1. Remove payment tables
delete snap.tables["public.payment_proofs"];
delete snap.tables["public.farmer_payment_methods"];

// 2. Remove financial columns from orders
const ordersTable = snap.tables["public.orders"];
if (ordersTable) {
  delete ordersTable.columns["shipping_cost"];
  delete ordersTable.columns["payment_method"];
  delete ordersTable.columns["payment_required"];
  delete ordersTable.columns["total_amount"];
  // Remove any foreign keys or indexes referencing dropped columns
  for (const [key, fk] of Object.entries(ordersTable.foreignKeys || {})) {
    if (fk.columnsFrom?.some(c => ["shipping_cost","payment_method","payment_required","total_amount"].includes(c))) {
      delete ordersTable.foreignKeys[key];
    }
  }
}

// 3. Remove financial columns from order_items
const itemsTable = snap.tables["public.order_items"];
if (itemsTable) {
  delete itemsTable.columns["price_per_unit"];
  delete itemsTable.columns["total_price"];
  delete itemsTable.columns["modified_price_per_unit"];
}

// 4. Remove payment enum types
const enumsToRemove = ["payment_method", "payment_required", "payment_proof_type", "farmer_payment_type"];
for (const enumName of enumsToRemove) {
  const key = `public.${enumName}`;
  if (snap.enums?.[key]) delete snap.enums[key];
}

// Write new snapshot as 0008
snap.id = crypto.randomUUID();
snap.prevId = JSON.parse(readFileSync(join(metaDir, "0007_snapshot.json"), "utf-8")).id;

writeFileSync(join(metaDir, "0008_snapshot.json"), JSON.stringify(snap, null, 2));

// Update journal
const journal = JSON.parse(readFileSync(join(metaDir, "_journal.json"), "utf-8"));
journal.entries.push({
  idx: 8,
  version: "7",
  when: Date.now(),
  tag: "0008_dac7_noticeboard",
  breakpoints: true,
});
writeFileSync(join(metaDir, "_journal.json"), JSON.stringify(journal, null, 2));

console.log("✓ Drizzle snapshot 0008 written");
console.log("✓ _journal.json updated");
console.log("Now run: npm run db:migrate");
