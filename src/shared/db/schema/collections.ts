import {
  pgTable,
  text,
  varchar,
  timestamp,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { groups } from "./groups";
import { listings } from "./listings";

export const collectionStatusEnum = pgEnum("collection_status", [
  "COLLECTING",
  "ORDERED",
  "IN_DELIVERY",
  "RECEIVED",
  "CANCELLED",
]);

export const collections = pgTable("collections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  coordinatorId: text("coordinator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  status: collectionStatusEnum("status").notNull().default("COLLECTING"),
  targetAmount: numeric("target_amount", { precision: 10, scale: 2 }),
  pickupAddress: varchar("pickup_address", { length: 300 }),
  pickupDate: timestamp("pickup_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
