import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  varchar,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const userRoleEnum = pgEnum("user_role", [
  "FARMER",
  "CONSUMER",
  "BOTH",
]);

export const profileTypeEnum = pgEnum("profile_type", [
  "PRIVATE",
  "SMALL_FARM",
  "MEDIUM_FARM",
  "LARGE_FARM",
]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 255 }).notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  role: userRoleEnum("role").notNull().default("CONSUMER"),
  profileType: profileTypeEnum("profile_type"),
  ageConfirmedAt: timestamp("age_confirmed_at", { withTimezone: true }),
  voivodeship: varchar("voivodeship", { length: 50 }),
  county: varchar("county", { length: 100 }),
  commune: varchar("commune", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  invitedById: text("invited_by_id").references(
    (): AnyPgColumn => users.id,
    { onDelete: "set null" }
  ),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
},
(table) => [
  index("idx_users_role").on(table.role),
  index("idx_users_voivodeship").on(table.voivodeship),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
