import { pgTable, text, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { proxyFarmers } from "./proxy-farmers";

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: text("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followeeId] }),
    index("idx_follows_followee_id").on(table.followeeId),
  ]
);

export const proxyFarmerFollows = pgTable(
  "proxy_farmer_follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    proxyFarmerId: text("proxy_farmer_id")
      .notNull()
      .references(() => proxyFarmers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.proxyFarmerId] }),
  ]
);

export type Follow = typeof follows.$inferSelect;
export type ProxyFarmerFollow = typeof proxyFarmerFollows.$inferSelect;
