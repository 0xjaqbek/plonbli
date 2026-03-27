import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  varchar,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const userRoleEnum = pgEnum("user_role", [
  "FARMER",
  "CONSUMER",
  "BOTH",
]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 255 }).notNull(),
  avatar: text("avatar"),
  role: userRoleEnum("role").notNull().default("CONSUMER"),
  voivodeship: varchar("voivodeship", { length: 50 }),
  county: varchar("county", { length: 100 }),
  commune: varchar("commune", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
