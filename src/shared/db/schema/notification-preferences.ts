import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  messages: boolean("messages").notNull().default(true),
  social: boolean("social").notNull().default(true),
  marketplace: boolean("marketplace").notNull().default(true),
  crowdfunding: boolean("crowdfunding").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
