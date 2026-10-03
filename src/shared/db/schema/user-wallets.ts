import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export const userWallets = pgTable(
  "user_wallets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publicKey: text("public_key").notNull(),
    // Legacy columns retained for migration compatibility. New code is
    // strictly non-custodial and never writes private key material here.
    encryptedSecretKey: text("encrypted_secret_key"),
    isCustodial: boolean("is_custodial").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_user_wallets_user").on(table.userId),
    uniqueIndex("idx_user_wallets_pubkey").on(table.publicKey),
  ]
);

export type UserWallet = typeof userWallets.$inferSelect;
export type NewUserWallet = typeof userWallets.$inferInsert;
