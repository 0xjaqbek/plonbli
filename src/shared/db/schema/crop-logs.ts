import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
  smallint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { products } from "./products";
import { crowdfundingCampaigns } from "./crowdfunding-campaigns";

export const cropLogTypeEnum = pgEnum("crop_log_type", [
  "PLANTING",
  "GROWING",
  "TREATMENT",
  "HARVEST",
  "OTHER",
]);

export const cropLogs = pgTable("crop_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  farmerId: text("farmer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  campaignId: text("campaign_id").references(() => crowdfundingCampaigns.id, {
    onDelete: "set null",
  }),
  type: cropLogTypeEnum("type").notNull(),
  description: text("description").notNull(),
  images: text("images").array().notNull().default([]),
  imageHashes: text("image_hashes").array().notNull().default([]),
  data: jsonb("data").$type<{
    crop?: string;
    area?: string;
    quantity?: string;
    method?: string;
  }>(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  previousHash: varchar("previous_hash", { length: 64 }),
  hashVersion: smallint("hash_version").notNull().default(2),
  farmerWalletAddress: text("farmer_wallet_address"),
  anchorTransactionSignature: text("anchor_transaction_signature"),
  anchoredAt: timestamp("anchored_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("idx_crop_logs_campaign").on(table.campaignId),
  uniqueIndex("idx_crop_logs_farmer_previous_hash").on(
    table.farmerId,
    table.previousHash
  ),
]);

export type CropLog = typeof cropLogs.$inferSelect;
export type NewCropLog = typeof cropLogs.$inferInsert;
