import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { orders } from "./orders";
import { listings } from "./listings";

export const conversationTypeEnum = pgEnum("conversation_type", [
  "DIRECT",
  "GROUP",
  "CHANNEL",
]);

export const conversations = pgTable("conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  type: conversationTypeEnum("type").notNull(),
  name: text("name"),
  groupId: text("group_id"),
  orderId: text("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  listingId: text("listing_id").references(() => listings.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
