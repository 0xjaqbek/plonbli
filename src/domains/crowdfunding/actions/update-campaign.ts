"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { crowdfundingCampaigns } from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { updateCampaignSchema } from "../schemas/validation";
import { generateContentHash, hashToHex } from "../lib/content-hash";
import { revalidatePath } from "next/cache";

/**
 * Updates campaign content (title, description, images).
 * Only allowed when campaign is in SETUP status.
 */
export async function updateCampaignAction(
  campaignId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

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
  if (typeof raw.images === "string" && raw.images.startsWith("[")) {
    raw.images = JSON.parse(raw.images as string);
  }

  const parsed = updateCampaignSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const updates: Record<string, unknown> = {};

  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.description) updates.description = parsed.data.description;
  if (parsed.data.images) updates.images = parsed.data.images;

  // Regenerate content hash if title or description changed
  const newTitle = parsed.data.title ?? campaign.title;
  const newDescription = parsed.data.description ?? campaign.description;
  if (parsed.data.title || parsed.data.description) {
    const contentHash = await generateContentHash(`${newTitle}\n${newDescription}`);
    updates.contentHash = hashToHex(contentHash);
  }

  if (Object.keys(updates).length === 0) {
    return { error: "Brak zmian do zapisania" };
  }

  await db
    .update(crowdfundingCampaigns)
    .set(updates)
    .where(eq(crowdfundingCampaigns.id, campaignId));

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
