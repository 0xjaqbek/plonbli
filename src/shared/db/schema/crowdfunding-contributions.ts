import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { crowdfundingCampaigns } from "./crowdfunding-campaigns";
import { crowdfundingRewardTiers } from "./crowdfunding-reward-tiers";
import { users } from "./users";

export const contributionSourceEnum = pgEnum("contribution_source", [
  "APP",
  "ACTION",
  "SYNC",
]);

export const crowdfundingContributions = pgTable(
  "crowdfunding_contributions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => crowdfundingCampaigns.id, { onDelete: "cascade" }),
    backerId: text("backer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rewardTierId: text("reward_tier_id").references(
      () => crowdfundingRewardTiers.id,
      { onDelete: "set null" }
    ),

    // Financial
    amount: text("amount").notNull(),

    // On-chain bridge
    walletAddress: text("wallet_address"),
    contributionPubkey: text("contribution_pubkey"),
    transactionSignature: text("transaction_signature"),
    refundTransactionSignature: text("refund_transaction_signature"),
    source: contributionSourceEnum("source").notNull().default("APP"),

    refunded: boolean("refunded").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_cf_contributions_campaign").on(table.campaignId),
    index("idx_cf_contributions_backer").on(table.backerId),
    index("idx_cf_contributions_wallet").on(table.walletAddress),
    uniqueIndex("idx_cf_contributions_pubkey").on(table.contributionPubkey),
  ]
);

export type CrowdfundingContribution =
  typeof crowdfundingContributions.$inferSelect;
export type NewCrowdfundingContribution =
  typeof crowdfundingContributions.$inferInsert;
