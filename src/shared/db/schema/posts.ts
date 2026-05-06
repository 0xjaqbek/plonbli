import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { groups } from "./groups";

export const postTypeEnum = pgEnum("post_type", ["POST", "ANNOUNCEMENT"]);
export const postVisibilityEnum = pgEnum("post_visibility", [
  "PUBLIC",
  "GROUP",
  "FOLLOWERS",
]);
export const sharedEntityTypeEnum = pgEnum("shared_entity_type", [
  "FARMER",
  "EVENT",
  "CROP_LOG",
  "PRODUCT",
  "PROXY_FARMER",
]);

export const posts = pgTable("posts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => groups.id, {
    onDelete: "cascade",
  }),
  content: text("content").notNull(),
  images: text("images").array().notNull().default([]),
  type: postTypeEnum("type").notNull().default("POST"),
  visibility: postVisibilityEnum("visibility").notNull().default("PUBLIC"),
  sharedEntityType: sharedEntityTypeEnum("shared_entity_type"),
  sharedEntityId: text("shared_entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(table) => [
  index("idx_posts_author_created").on(table.authorId, table.createdAt),
  index("idx_posts_group_created").on(table.groupId, table.createdAt),
  index("idx_posts_visibility_created").on(table.visibility, table.createdAt),
]);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
