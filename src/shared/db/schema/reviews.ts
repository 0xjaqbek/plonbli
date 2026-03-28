import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { products } from "./products";

export const reviews = pgTable("reviews", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetId: text("target_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  overall: integer("overall").notNull(),
  dimensions: jsonb("dimensions").$type<{
    quality?: number;
    communication?: number;
    punctuality?: number;
    accuracy?: number;
  }>(),
  comment: text("comment"),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  previousHash: varchar("previous_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
