import { pgTable, text, timestamp, pgEnum, varchar } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export const groupTypeEnum = pgEnum("group_type", [
  "BUYING_GROUP",
  "COMMUNITY",
]);

export const joinPolicyEnum = pgEnum("join_policy", [
  "OPEN",
  "INVITE_ONLY",
]);

export const groups = pgTable("groups", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull().default(""),
  avatar: text("avatar"),
  type: groupTypeEnum("type").notNull(),
  joinPolicy: joinPolicyEnum("join_policy").notNull().default("OPEN"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  voivodeship: varchar("voivodeship", { length: 50 }),
  commune: varchar("commune", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
