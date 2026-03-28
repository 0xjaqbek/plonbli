import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { products } from "./products";

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
  type: cropLogTypeEnum("type").notNull(),
  description: text("description").notNull(),
  images: text("images").array().notNull().default([]),
  data: jsonb("data").$type<{
    crop?: string;
    area?: string;
    quantity?: string;
    method?: string;
  }>(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  previousHash: varchar("previous_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CropLog = typeof cropLogs.$inferSelect;
export type NewCropLog = typeof cropLogs.$inferInsert;
