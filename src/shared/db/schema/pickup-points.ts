import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export const pickupPoints = pgTable("pickup_points", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  address: varchar("address", { length: 300 }).notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  hours: varchar("hours", { length: 200 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PickupPoint = typeof pickupPoints.$inferSelect;
export type NewPickupPoint = typeof pickupPoints.$inferInsert;
