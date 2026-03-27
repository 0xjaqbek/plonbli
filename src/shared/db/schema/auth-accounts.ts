import { pgTable, text, varchar, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";

export const authAccounts = pgTable(
  "auth_accounts",
  {
    provider: varchar("provider", { length: 50 }).notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export type AuthAccount = typeof authAccounts.$inferSelect;
