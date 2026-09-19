"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingMilestones,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteMilestoneAction(milestoneId: string, campaignId: string) {
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

  await db
    .delete(crowdfundingMilestones)
    .where(
      and(
        eq(crowdfundingMilestones.id, milestoneId),
        eq(crowdfundingMilestones.campaignId, campaignId)
      )
    );

  // Update milestone count cache
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(crowdfundingMilestones)
    .where(eq(crowdfundingMilestones.campaignId, campaignId));

  await db
    .update(crowdfundingCampaigns)
    .set({ milestoneCount: count })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
