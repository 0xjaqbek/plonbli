import { pgTable, text, numeric, timestamp, pgEnum, boolean, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { listings } from "./listings";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "MODIFIED",
  "CONFIRMED",
  "PAID", // kept in DB enum (Postgres cannot remove enum values); never set by application code
  "PREPARING",
  "SHIPPED",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
]);

export const deliveryMethodEnum = pgEnum("delivery_method", [
  "PICKUP",
  "DELIVERY",
  "DROP_POINT",
]);

export const cancelledByEnum = pgEnum("cancelled_by", [
  "CUSTOMER",
  "FARMER",
]);

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderNumber: text("order_number").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => users.id),
  farmerId: text("farmer_id").notNull().references(() => users.id),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  deliveryMethod: deliveryMethodEnum("delivery_method").notNull(),
  deliveryAddress: text("delivery_address"),
  pickupSlotId: text("pickup_slot_id"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  customerNote: text("customer_note"),
  farmerNote: text("farmer_note"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: cancelledByEnum("cancelled_by"),
  customerHasSeen: boolean("customer_has_seen").notNull().default(true),
  farmerHasSeen: boolean("farmer_has_seen").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
},
(table) => [
  index("idx_orders_customer_created").on(table.customerId, table.createdAt),
  index("idx_orders_farmer_created").on(table.farmerId, table.createdAt),
  index("idx_orders_status").on(table.status),
]);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  listingId: text("listing_id").notNull().references(() => listings.id),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  modifiedQuantity: numeric("modified_quantity", { precision: 10, scale: 2 }),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export const orderStatusHistory = pgTable("order_status_history", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull(),
  note: text("note"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistory = typeof orderStatusHistory.$inferInsert;
