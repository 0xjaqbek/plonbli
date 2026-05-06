import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { conversations } from "./conversations";
import { users } from "./users";

export const messageStatusEnum = pgEnum("message_status", [
  "SENT",
  "DELIVERED",
  "READ",
]);

export const messages = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  images: text("images").array().notNull().default([]),
  status: messageStatusEnum("status").notNull().default("SENT"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(table) => [
  index("idx_messages_conversation_created").on(table.conversationId, table.createdAt),
]);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
