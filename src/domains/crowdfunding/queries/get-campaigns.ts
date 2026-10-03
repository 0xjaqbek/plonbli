import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  users,
  type CrowdfundingCampaign,
} from "@/shared/db/schema";
import { desc, eq, and, or } from "drizzle-orm";

const CAMPAIGN_STATUSES: readonly CrowdfundingCampaign["status"][] = [
  "SETUP",
  "ACTIVE",
  "SUCCESSFUL",
  "FAILED",
  "FINALIZED",
];

const CAMPAIGN_CATEGORIES: readonly CrowdfundingCampaign["category"][] = [
  "FARMER_INVESTMENT",
  "GROUP_PRE_ORDER",
  "COMMUNITY_PROJECT",
];

function isCampaignStatus(value: string): value is CrowdfundingCampaign["status"] {
  return CAMPAIGN_STATUSES.some((status) => status === value);
}

function isCampaignCategory(value: string): value is CrowdfundingCampaign["category"] {
  return CAMPAIGN_CATEGORIES.some((category) => category === value);
}

export async function getCampaigns(filters?: {
  status?: string;
  category?: string;
  creatorId?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (filters?.status && isCampaignStatus(filters.status)) {
    conditions.push(eq(crowdfundingCampaigns.status, filters.status));
  }
  if (filters?.category && isCampaignCategory(filters.category)) {
    conditions.push(eq(crowdfundingCampaigns.category, filters.category));
  }
  if (filters?.creatorId) {
    conditions.push(eq(crowdfundingCampaigns.creatorId, filters.creatorId));
  }

  // Default: show ACTIVE and SUCCESSFUL campaigns
  if (!filters?.status && !filters?.creatorId) {
    conditions.push(
      or(
        eq(crowdfundingCampaigns.status, "ACTIVE"),
        eq(crowdfundingCampaigns.status, "SUCCESSFUL")
      )
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  return db
    .select({
      id: crowdfundingCampaigns.id,
      title: crowdfundingCampaigns.title,
      description: crowdfundingCampaigns.description,
      images: crowdfundingCampaigns.images,
      category: crowdfundingCampaigns.category,
      fundingModel: crowdfundingCampaigns.fundingModel,
      goalAmount: crowdfundingCampaigns.goalAmount,
      raisedAmount: crowdfundingCampaigns.raisedAmount,
      backerCount: crowdfundingCampaigns.backerCount,
      deadline: crowdfundingCampaigns.deadline,
      status: crowdfundingCampaigns.status,
      currencyMint: crowdfundingCampaigns.currencyMint,
      createdAt: crowdfundingCampaigns.createdAt,
      creatorName: users.name,
      creatorAvatar: users.avatar,
    })
    .from(crowdfundingCampaigns)
    .innerJoin(users, eq(crowdfundingCampaigns.creatorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(crowdfundingCampaigns.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getCampaignById(id: string) {
  const results = await db
    .select()
    .from(crowdfundingCampaigns)
    .where(eq(crowdfundingCampaigns.id, id))
    .limit(1);

  return results[0] ?? null;
}
