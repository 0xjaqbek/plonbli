import {
  pgTable,
  text,
  timestamp,
  numeric,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { products } from "./products";

export const unitEnum = pgEnum("unit_type", [
  "KG",
  "PIECE",
  "LITER",
  "BUNCH",
]);

export const availabilityEnum = pgEnum("availability_status", [
  "AVAILABLE",
  "SEASONAL",
  "OUT_OF_STOCK",
]);

export type DeliveryOption = {
  type: "PICKUP" | "DELIVERY" | "DROP_POINT";
  address?: string;
  radius?: number;
  minAmount?: number;
  cost?: number;
  hours?: string;
};

export const listings = pgTable("listings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  unit: unitEnum("unit").notNull(),
  quantityAvailable: numeric("quantity_available", {
    precision: 10,
    scale: 2,
  }),
  availability: availabilityEnum("availability")
    .notNull()
    .default("AVAILABLE"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  deliveryOptions: jsonb("delivery_options")
    .$type<DeliveryOption[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
},
(table) => [
  index("idx_listings_product_id").on(table.productId),
  index("idx_listings_availability_created").on(table.availability, table.createdAt),
]);

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
