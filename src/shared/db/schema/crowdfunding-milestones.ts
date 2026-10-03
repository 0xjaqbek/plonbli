import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  smallint,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { crowdfundingCampaigns } from "./crowdfunding-campaigns";

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "PENDING",
  "APPROVED",
  "RELEASED",
]);

export const crowdfundingMilestones = pgTable(
  "crowdfunding_milestones",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => crowdfundingCampaigns.id, { onDelete: "cascade" }),
    milestoneIndex: smallint("milestone_index").notNull(),

    // Content
    title: text("title").notNull(),
    description: text("description").notNull(),
    descriptionHash: text("description_hash"),

    // On-chain bridge
    milestonePubkey: text("milestone_pubkey").unique(),
    createTransactionSignature: text("create_transaction_signature"),
    approvalTransactionSignature: text("approval_transaction_signature"),
    releaseTransactionSignature: text("release_transaction_signature"),

    // Financial
    targetAmount: text("target_amount").notNull(),
    status: milestoneStatusEnum("status").notNull().default("PENDING"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_cf_milestones_campaign").on(table.campaignId),
  ]
);

export type CrowdfundingMilestone = typeof crowdfundingMilestones.$inferSelect;
export type NewCrowdfundingMilestone =
  typeof crowdfundingMilestones.$inferInsert;
