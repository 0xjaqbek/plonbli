import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  varchar,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { groups } from "./groups";

export const eventTypeEnum = pgEnum("event_type", [
  "MARKET",
  "OPEN_DAY",
  "MEETUP",
  "OTHER",
]);

export const recurrenceEnum = pgEnum("recurrence", [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
]);

export const events = pgTable("events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => groups.id, {
    onDelete: "cascade",
  }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  type: eventTypeEnum("type").notNull(),
  location: varchar("location", { length: 300 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  recurrence: recurrenceEnum("recurrence"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
