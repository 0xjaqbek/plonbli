"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingRewardTiers,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { addRewardTierSchema } from "../schemas/validation";
import { generateContentHash, hashToHex } from "../lib/content-hash";
import { revalidatePath } from "next/cache";

export async function addRewardTierAction(campaignId: string, formData: FormData) {
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
  // Handle boolean checkbox
  raw.isProductLinked = raw.isProductLinked === "on" ? "true" : "false";

  const parsed = addRewardTierSchema.safeParse({
    ...raw,
    isProductLinked: raw.isProductLinked === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { title, description, price, maxBackers, isProductLinked, productId } =
    parsed.data;

  const descriptionHash = hashToHex(
    await generateContentHash(description)
  );

  // Get next tier index
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(crowdfundingRewardTiers)
    .where(eq(crowdfundingRewardTiers.campaignId, campaignId));

  await db.insert(crowdfundingRewardTiers).values({
    campaignId,
    tierIndex: count,
    title,
    description,
    descriptionHash,
    price: price.toString(),
    maxBackers: maxBackers ?? 0,
    isProductLinked: isProductLinked ?? false,
    productId: productId || null,
  });

  // Update tier count cache
  await db
    .update(crowdfundingCampaigns)
    .set({ rewardTierCount: count + 1 })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
