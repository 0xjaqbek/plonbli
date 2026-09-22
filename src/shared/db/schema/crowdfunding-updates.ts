import {
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { crowdfundingCampaigns } from "./crowdfunding-campaigns";
import { users } from "./users";

export const crowdfundingUpdates = pgTable(
  "crowdfunding_updates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => crowdfundingCampaigns.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    content: text("content").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_cf_updates_campaign").on(table.campaignId),
  ]
);

export type CrowdfundingUpdate = typeof crowdfundingUpdates.$inferSelect;
export type NewCrowdfundingUpdate = typeof crowdfundingUpdates.$inferInsert;
