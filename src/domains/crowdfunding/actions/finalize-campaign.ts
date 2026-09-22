"use server";

import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
} from "@/shared/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildCampaignActivatedNotification } from "@/domains/notifications/lib/notification-types";

/**
 * Finalizes campaigns that have passed their deadline.
 * Can be called by anyone (cron job or manual trigger).
 * Determines SUCCESSFUL vs FAILED based on funding model and goal.
 */
export async function finalizeCampaignAction(campaignId: string) {
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

  if (new Date(campaign.deadline).getTime() > Date.now()) {
    return { error: "Termin zbiórki jeszcze nie upłynął" };
  }

  const raised = parseFloat(campaign.raisedAmount);
  const goal = parseFloat(campaign.goalAmount);
  const goalMet = raised >= goal;

  let newStatus: "SUCCESSFUL" | "FAILED";
  if (goalMet) {
    newStatus = "SUCCESSFUL";
  } else if (campaign.fundingModel === "KEEP_WHAT_YOU_RAISE") {
    newStatus = "SUCCESSFUL";
  } else {
    // ALL_OR_NOTHING and goal not met
    newStatus = "FAILED";
  }

  await db
    .update(crowdfundingCampaigns)
    .set({ status: newStatus })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  // Notify creator of result
  sendNotification(
    campaign.creatorId,
    buildCampaignActivatedNotification(
      `${campaign.title} — ${newStatus === "SUCCESSFUL" ? "Sukces!" : "Cel nie został osiągnięty"}`,
      campaignId
    )
  ).catch((err) => console.error("[finalize] notification failed:", err));

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true, status: newStatus };
}

/**
 * Batch finalization — finds all expired ACTIVE campaigns and finalizes them.
 * Intended for cron job usage.
 */
export async function finalizeExpiredCampaigns() {
  const expired = await db
    .select({ id: crowdfundingCampaigns.id })
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.status, "ACTIVE"),
        lte(crowdfundingCampaigns.deadline, new Date())
      )
    );

  const results = await Promise.allSettled(
    expired.map((c) => finalizeCampaignAction(c.id))
  );

  return {
    total: expired.length,
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}
