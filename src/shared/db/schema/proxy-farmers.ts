import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export interface ProxyContactMethod {
  type: "PHONE" | "EMAIL" | "IN_PERSON" | "PICKUP" | "OTHER";
  value: string;
  note?: string;
}

export interface ProxyProduct {
  name: string;
  category?: string;
  method?: "ECO" | "CONVENTIONAL" | "OTHER";
  description?: string;
}

export const proxyFarmers = pgTable("proxy_farmers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  voivodeship: varchar("voivodeship", { length: 50 }),
  county: varchar("county", { length: 100 }),
  commune: varchar("commune", { length: 100 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  contactMethods: jsonb("contact_methods")
    .$type<ProxyContactMethod[]>()
    .notNull()
    .default([]),
  products: jsonb("products")
    .$type<ProxyProduct[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ProxyFarmer = typeof proxyFarmers.$inferSelect;
export type NewProxyFarmer = typeof proxyFarmers.$inferInsert;
