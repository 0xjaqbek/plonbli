"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingContributions,
  crowdfundingRewardTiers,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Claims a refund for a contribution to a FAILED campaign.
 * Only the backer who contributed can claim their own refund.
 */
export async function claimRefundAction(contributionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Get contribution with campaign status
  const [contribution] = await db
    .select()
    .from(crowdfundingContributions)
    .where(
      and(
        eq(crowdfundingContributions.id, contributionId),
        eq(crowdfundingContributions.backerId, session.user.id)
      )
    )
    .limit(1);

  if (!contribution) {
    return { error: "Wpłata nie została znaleziona" };
  }

  if (contribution.refunded) {
    return { error: "Zwrot został już zrealizowany" };
  }

  // Verify campaign is FAILED
  const [campaign] = await db
    .select()
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.id, contribution.campaignId),
        eq(crowdfundingCampaigns.status, "FAILED")
      )
    )
    .limit(1);

  if (!campaign) {
    return { error: "Zwroty dostępne tylko dla nieudanych zbiórek" };
  }

  // Mark as refunded
  await db
    .update(crowdfundingContributions)
    .set({ refunded: true })
    .where(eq(crowdfundingContributions.id, contributionId));

  // Free up reward tier slot if one was claimed
  if (contribution.rewardTierId) {
    await db
      .update(crowdfundingRewardTiers)
      .set({
        currentBackers: sql`greatest(${crowdfundingRewardTiers.currentBackers} - 1, 0)`,
      })
      .where(eq(crowdfundingRewardTiers.id, contribution.rewardTierId));
  }

  revalidatePath(`/crowdfunding/${contribution.campaignId}`);
  return { success: true, amount: contribution.amount };
}
