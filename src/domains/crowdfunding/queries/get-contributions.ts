import { db } from "@/shared/db";
import {
  crowdfundingContributions,
  crowdfundingCampaigns,
  crowdfundingRewardTiers,
} from "@/shared/db/schema";
import { users } from "@/shared/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Get all contributions for a specific campaign.
 */
export async function getContributionsByCampaign(campaignId: string) {
  return db
    .select({
      id: crowdfundingContributions.id,
      amount: crowdfundingContributions.amount,
      rewardTierId: crowdfundingContributions.rewardTierId,
      refunded: crowdfundingContributions.refunded,
      createdAt: crowdfundingContributions.createdAt,
      backerName: users.name,
      backerAvatar: users.avatar,
    })
    .from(crowdfundingContributions)
    .innerJoin(users, eq(crowdfundingContributions.backerId, users.id))
    .where(eq(crowdfundingContributions.campaignId, campaignId))
    .orderBy(desc(crowdfundingContributions.createdAt));
}

/**
 * Get all campaigns backed by a specific user, with contribution details.
 */
export async function getBackedCampaigns(userId: string) {
  return db
    .select({
      contribution: {
        id: crowdfundingContributions.id,
        amount: crowdfundingContributions.amount,
        refunded: crowdfundingContributions.refunded,
        createdAt: crowdfundingContributions.createdAt,
      },
      campaign: {
        id: crowdfundingCampaigns.id,
        title: crowdfundingCampaigns.title,
        images: crowdfundingCampaigns.images,
        status: crowdfundingCampaigns.status,
        goalAmount: crowdfundingCampaigns.goalAmount,
        raisedAmount: crowdfundingCampaigns.raisedAmount,
        deadline: crowdfundingCampaigns.deadline,
      },
      rewardTier: {
        title: crowdfundingRewardTiers.title,
        price: crowdfundingRewardTiers.price,
      },
    })
    .from(crowdfundingContributions)
    .innerJoin(
      crowdfundingCampaigns,
      eq(crowdfundingContributions.campaignId, crowdfundingCampaigns.id)
    )
    .leftJoin(
      crowdfundingRewardTiers,
      eq(crowdfundingContributions.rewardTierId, crowdfundingRewardTiers.id)
    )
    .where(eq(crowdfundingContributions.backerId, userId))
    .orderBy(desc(crowdfundingContributions.createdAt));
}
