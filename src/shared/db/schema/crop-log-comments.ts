import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { cropLogs } from "./crop-logs";
import { users } from "./users";

export const cropLogComments = pgTable(
  "crop_log_comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    cropLogId: text("crop_log_id")
      .notNull()
      .references(() => cropLogs.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_crop_log_comments_entry_created").on(
      table.cropLogId,
      table.createdAt
    ),
  ]
);

export type CropLogComment = typeof cropLogComments.$inferSelect;
