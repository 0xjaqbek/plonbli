"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingMilestones,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildCampaignActivatedNotification } from "@/domains/notifications/lib/notification-types";

export async function activateCampaignAction(
  campaignId: string,
  campaignPubkey?: string,
  transactionSignature?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Verify ownership and SETUP status
  const [campaign] = await db
    .select()
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.id, campaignId),
        eq(crowdfundingCampaigns.creatorId, session.user.id),
        eq(crowdfundingCampaigns.status, "SETUP")
      )
    )
    .limit(1);

  if (!campaign) {
    return { error: "Nie znaleziono zbiórki lub brak uprawnień" };
  }

  // Require at least 1 milestone
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(crowdfundingMilestones)
    .where(eq(crowdfundingMilestones.campaignId, campaignId));

  if (count === 0) {
    return { error: "Dodaj co najmniej jeden kamień milowy przed aktywacją" };
  }

  // Server-side deadline check (don't trust client)
  if (new Date(campaign.deadline).getTime() <= Date.now()) {
    return { error: "Termin zakończenia musi być w przyszłości" };
  }

  // Validate milestone targets don't exceed goal
  const [{ total }] = await db
    .select({
      total: sql<string>`coalesce(sum(cast(${crowdfundingMilestones.targetAmount} as numeric)), 0)::text`,
    })
    .from(crowdfundingMilestones)
    .where(eq(crowdfundingMilestones.campaignId, campaignId));

  if (parseFloat(total) > parseFloat(campaign.goalAmount)) {
    return { error: "Suma celów kamieni milowych przekracza cel zbiórki" };
  }

  await db
    .update(crowdfundingCampaigns)
    .set({
      status: "ACTIVE",
      campaignPubkey: campaignPubkey || null,
    })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  // Notify creator that campaign is live
  sendNotification(
    session.user.id,
    buildCampaignActivatedNotification(campaign.title, campaignId)
  ).catch((err) => console.error("[activate] notification failed:", err));

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
