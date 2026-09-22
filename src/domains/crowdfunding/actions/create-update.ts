"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { crowdfundingUpdates, crowdfundingCampaigns } from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  campaignId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
});

export async function createUpdateAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = schema.safeParse({
    campaignId: formData.get("campaignId"),
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Verify user owns the campaign
  const campaign = await db
    .select({ id: crowdfundingCampaigns.id })
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.id, parsed.data.campaignId),
        eq(crowdfundingCampaigns.creatorId, session.user.id)
      )
    )
    .limit(1);

  if (campaign.length === 0) {
    return { error: "Campaign not found or not authorized" };
  }

  await db.insert(crowdfundingUpdates).values({
    campaignId: parsed.data.campaignId,
    authorId: session.user.id,
    title: parsed.data.title,
    content: parsed.data.content,
  });

  revalidatePath(`/crowdfunding/${parsed.data.campaignId}`);
  return { success: true };
}
