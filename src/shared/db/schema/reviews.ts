import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  smallint,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { products } from "./products";
import { proxyFarmers } from "./proxy-farmers";

export const reviewVerificationSourceEnum = pgEnum(
  "review_verification_source",
  ["UNVERIFIED", "ORDER", "CAMPAIGN"]
);

export const reviews = pgTable("reviews", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetId: text("target_id")
    .references(() => users.id, { onDelete: "cascade" }),
  proxyFarmerId: text("proxy_farmer_id")
    .references(() => proxyFarmers.id, { onDelete: "cascade" }),
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
  hashVersion: smallint("hash_version").notNull().default(2),
  verificationSource: reviewVerificationSourceEnum("verification_source")
    .notNull()
    .default("UNVERIFIED"),
  verificationEvidenceId: text("verification_evidence_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("idx_reviews_verification_evidence").on(
    table.verificationEvidenceId
  ),
]);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
