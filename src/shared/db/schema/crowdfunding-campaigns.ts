import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  smallint,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { groups } from "./groups";

export const campaignCategoryEnum = pgEnum("campaign_category", [
  "FARMER_INVESTMENT",
  "GROUP_PRE_ORDER",
  "COMMUNITY_PROJECT",
]);

export const campaignFundingModelEnum = pgEnum("campaign_funding_model", [
  "ALL_OR_NOTHING",
  "KEEP_WHAT_YOU_RAISE",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "SETUP",
  "ACTIVE",
  "SUCCESSFUL",
  "FAILED",
  "FINALIZED",
]);

export const crowdfundingCampaigns = pgTable(
  "crowdfunding_campaigns",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => groups.id, {
      onDelete: "set null",
    }),

    // Content
    title: text("title").notNull(),
    description: text("description").notNull(),
    images: text("images").array().notNull().default([]),
    category: campaignCategoryEnum("category").notNull(),

    // On-chain bridge
    campaignPubkey: text("campaign_pubkey").unique(),
    currencyMint: text("currency_mint").notNull(),
    fundingModel: campaignFundingModelEnum("funding_model").notNull(),
    goalAmount: text("goal_amount").notNull(),
    deadline: timestamp("deadline", { withTimezone: true }).notNull(),
    status: campaignStatusEnum("status").notNull().default("SETUP"),
    contentHash: text("content_hash"),

    // Cached from on-chain (synced periodically)
    raisedAmount: text("raised_amount").notNull().default("0"),
    backerCount: integer("backer_count").notNull().default(0),
    milestoneCount: smallint("milestone_count").notNull().default(0),
    rewardTierCount: smallint("reward_tier_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_cf_campaigns_creator").on(table.creatorId),
    index("idx_cf_campaigns_group").on(table.groupId),
    index("idx_cf_campaigns_status").on(table.status),
    index("idx_cf_campaigns_pubkey").on(table.campaignPubkey),
    index("idx_cf_campaigns_deadline").on(table.deadline),
  ]
);

export type CrowdfundingCampaign = typeof crowdfundingCampaigns.$inferSelect;
export type NewCrowdfundingCampaign = typeof crowdfundingCampaigns.$inferInsert;
