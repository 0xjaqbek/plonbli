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

  // Verify deadline is still in the future
  if (new Date(campaign.deadline).getTime() <= Date.now()) {
    return { error: "Termin zakończenia musi być w przyszłości" };
  }

  await db
    .update(crowdfundingCampaigns)
    .set({
      status: "ACTIVE",
      campaignPubkey: campaignPubkey || null,
    })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  // Notify creator that campaign is live
  void sendNotification(
    session.user.id,
    buildCampaignActivatedNotification(campaign.title, campaignId)
  );

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
