import { pgTable, text, integer, date, time, boolean, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { orders } from "./orders";

export const pickupSlots = pgTable("pickup_slots", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  farmerId: text("farmer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week"),
  specificDate: date("specific_date"),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PickupSlot = typeof pickupSlots.$inferSelect;
export type NewPickupSlot = typeof pickupSlots.$inferInsert;
