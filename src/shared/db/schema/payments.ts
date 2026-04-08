import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { orders } from "./orders";

export const paymentProofTypeEnum = pgEnum("payment_proof_type", [
  "SCREENSHOT",
  "BANK_TRANSFER",
  "BLOCKCHAIN_LINK",
]);

export const farmerPaymentTypeEnum = pgEnum("farmer_payment_type", [
  "BLIK",
  "TRANSFER",
  "CRYPTO",
]);

export const paymentProofs = pgTable("payment_proofs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: paymentProofTypeEnum("type").notNull(),
  imageUrl: text("image_url"),
  transactionUrl: text("transaction_url"),
  description: text("description"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentProof = typeof paymentProofs.$inferSelect;
export type NewPaymentProof = typeof paymentProofs.$inferInsert;

export const farmerPaymentMethods = pgTable("farmer_payment_methods", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  farmerId: text("farmer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: farmerPaymentTypeEnum("type").notNull(),
  label: text("label").notNull(),
  details: text("details").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type FarmerPaymentMethod = typeof farmerPaymentMethods.$inferSelect;
export type NewFarmerPaymentMethod = typeof farmerPaymentMethods.$inferInsert;
