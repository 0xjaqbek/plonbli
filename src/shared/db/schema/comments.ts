import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { posts } from "./posts";
import { users } from "./users";

export const comments = pgTable("comments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(table) => [
  index("idx_comments_post_created").on(table.postId, table.createdAt),
]);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
