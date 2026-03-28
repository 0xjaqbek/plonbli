import {
  pgTable,
  text,
  timestamp,
  numeric,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { collections } from "./collections";

export const collectionItems = pgTable(
  "collection_items",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    note: text("note"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.userId] }),
  ]
);

export type CollectionItem = typeof collectionItems.$inferSelect;
export type NewCollectionItem = typeof collectionItems.$inferInsert;
