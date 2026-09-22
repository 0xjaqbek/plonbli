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
  const contributionPubkey = raw.contributionPubkey as string | undefined;
  const transactionSignature = raw.transactionSignature as string | undefined;

  // Verify campaign is ACTIVE and deadline not passed (server-side check)
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

  if (campaign.creatorId === session.user.id) {
    return { error: "Nie możesz wspierać własnej zbiórki" };
  }

  if (new Date(campaign.deadline).getTime() <= Date.now()) {
    return { error: "Termin zbiórki upłynął" };
  }

  // If reward tier selected, validate and atomically claim slot
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

    if (amount < parseFloat(tier.price)) {
      return { error: `Minimalna kwota dla tego progu to ${tier.price}` };
    }

    // Atomic capacity check + increment to prevent race conditions
    if (tier.maxBackers > 0) {
      const result = await db
        .update(crowdfundingRewardTiers)
        .set({
          currentBackers: sql`${crowdfundingRewardTiers.currentBackers} + 1`,
        })
        .where(
          and(
            eq(crowdfundingRewardTiers.id, rewardTierId),
            sql`${crowdfundingRewardTiers.currentBackers} < ${crowdfundingRewardTiers.maxBackers}`
          )
        )
        .returning({ id: crowdfundingRewardTiers.id });

      if (result.length === 0) {
        return { error: "Ten próg nagrody jest już pełny" };
      }
    } else {
      // Unlimited tier — just increment
      await db
        .update(crowdfundingRewardTiers)
        .set({
          currentBackers: sql`${crowdfundingRewardTiers.currentBackers} + 1`,
        })
        .where(eq(crowdfundingRewardTiers.id, rewardTierId));
    }
  }

  // Record contribution with on-chain reference
  await db.insert(crowdfundingContributions).values({
    campaignId,
    backerId: session.user.id,
    rewardTierId: rewardTierId || null,
    amount: amount.toString(),
    contributionPubkey: contributionPubkey || null,
    transactionSignature: transactionSignature || null,
  });

  // Atomic update of campaign totals to prevent race conditions
  await db
    .update(crowdfundingCampaigns)
    .set({
      raisedAmount: sql`(cast(${crowdfundingCampaigns.raisedAmount} as numeric) + ${amount})::text`,
      backerCount: sql`${crowdfundingCampaigns.backerCount} + 1`,
    })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  // Notify campaign creator (fire-and-forget with error logging)
  sendNotification(
    campaign.creatorId,
    buildContributionNotification(
      session.user.name ?? "Wspierający",
      amount.toString(),
      campaign.title,
      campaignId
    )
  ).catch((err) => console.error("[contribute] notification failed:", err));

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
