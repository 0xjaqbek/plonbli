import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { posts } from "./posts";
import { users } from "./users";

export const reactions = pgTable(
  "reactions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
  ]
);

export type Reaction = typeof reactions.$inferSelect;
