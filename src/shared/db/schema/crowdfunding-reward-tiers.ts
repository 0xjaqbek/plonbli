import {
  pgTable,
  text,
  timestamp,
  smallint,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { crowdfundingCampaigns } from "./crowdfunding-campaigns";
import { products } from "./products";

export const crowdfundingRewardTiers = pgTable(
  "crowdfunding_reward_tiers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => crowdfundingCampaigns.id, { onDelete: "cascade" }),
    tierIndex: smallint("tier_index").notNull(),

    // Content
    title: text("title").notNull(),
    description: text("description").notNull(),
    descriptionHash: text("description_hash"),

    // On-chain bridge
    rewardTierPubkey: text("reward_tier_pubkey").unique(),
    createTransactionSignature: text("create_transaction_signature"),

    // Pricing & capacity
    price: text("price").notNull(),
    maxBackers: integer("max_backers").notNull().default(0),
    currentBackers: integer("current_backers").notNull().default(0),

    // Product linkage
    isProductLinked: boolean("is_product_linked").notNull().default(false),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_cf_reward_tiers_campaign").on(table.campaignId),
  ]
);

export type CrowdfundingRewardTier =
  typeof crowdfundingRewardTiers.$inferSelect;
export type NewCrowdfundingRewardTier =
  typeof crowdfundingRewardTiers.$inferInsert;
