"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingContributions,
  crowdfundingRewardTiers,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { contributeSchema } from "../schemas/validation";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildContributionNotification } from "@/domains/notifications/lib/notification-types";

export async function contributeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = contributeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { campaignId, amount, rewardTierId } = parsed.data;

  // Verify campaign is ACTIVE
  const [campaign] = await db
    .select()
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.id, campaignId),
        eq(crowdfundingCampaigns.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!campaign) {
    return { error: "Zbiórka nie jest aktywna" };
  }

  // Cannot back own campaign
  if (campaign.creatorId === session.user.id) {
    return { error: "Nie możesz wspierać własnej zbiórki" };
  }

  // Verify deadline not passed
  if (new Date(campaign.deadline).getTime() <= Date.now()) {
    return { error: "Termin zbiórki upłynął" };
  }

  // If reward tier selected, verify it exists and has capacity
  if (rewardTierId) {
    const [tier] = await db
      .select()
      .from(crowdfundingRewardTiers)
      .where(
        and(
          eq(crowdfundingRewardTiers.id, rewardTierId),
          eq(crowdfundingRewardTiers.campaignId, campaignId)
        )
      )
      .limit(1);

    if (!tier) {
      return { error: "Wybrany próg nagrody nie istnieje" };
    }

    if (tier.maxBackers > 0 && tier.currentBackers >= tier.maxBackers) {
      return { error: "Ten próg nagrody jest już pełny" };
    }

    // Check minimum amount for tier
    if (amount < parseFloat(tier.price)) {
      return { error: `Minimalna kwota dla tego progu to ${tier.price}` };
    }

    // Increment tier backer count
    await db
      .update(crowdfundingRewardTiers)
      .set({ currentBackers: tier.currentBackers + 1 })
      .where(eq(crowdfundingRewardTiers.id, rewardTierId));
  }

  // Record contribution
  await db.insert(crowdfundingContributions).values({
    campaignId,
    backerId: session.user.id,
    rewardTierId: rewardTierId || null,
    amount: amount.toString(),
  });

  // Update campaign cached totals
  const currentRaised = parseFloat(campaign.raisedAmount);
  await db
    .update(crowdfundingCampaigns)
    .set({
      raisedAmount: (currentRaised + amount).toString(),
      backerCount: campaign.backerCount + 1,
    })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  // Notify campaign creator
  void sendNotification(
    campaign.creatorId,
    buildContributionNotification(
      session.user.name ?? "Wspierający",
      amount.toString(),
      campaign.title,
      campaignId
    )
  );

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
