import {
  pgTable,
  text,
  varchar,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { categories } from "./categories";

export const farmingMethodEnum = pgEnum("farming_method", [
  "ECO",
  "CONVENTIONAL",
  "OTHER",
]);

export const products = pgTable("products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  farmerId: text("farmer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  images: text("images").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  method: farmingMethodEnum("method").notNull().default("CONVENTIONAL"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
},
(table) => [
  index("idx_products_farmer_id").on(table.farmerId),
  index("idx_products_category_id").on(table.categoryId),
]);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
