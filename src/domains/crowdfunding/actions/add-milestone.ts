"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingMilestones,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { addMilestoneSchema } from "../schemas/validation";
import { generateContentHash, hashToHex } from "../lib/content-hash";
import { revalidatePath } from "next/cache";

export async function addMilestoneAction(campaignId: string, formData: FormData) {
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

  const raw = Object.fromEntries(formData.entries());
  const parsed = addMilestoneSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { title, description, targetAmount } = parsed.data;

  const descriptionHash = hashToHex(
    await generateContentHash(description)
  );

  // Get next milestone index
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(crowdfundingMilestones)
    .where(eq(crowdfundingMilestones.campaignId, campaignId));

  await db.insert(crowdfundingMilestones).values({
    campaignId,
    milestoneIndex: count,
    title,
    description,
    descriptionHash,
    targetAmount: targetAmount.toString(),
  });

  // Update milestone count cache
  await db
    .update(crowdfundingCampaigns)
    .set({ milestoneCount: count + 1 })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
