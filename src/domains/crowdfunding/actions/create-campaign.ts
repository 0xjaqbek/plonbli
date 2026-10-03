"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { crowdfundingCampaigns } from "@/shared/db/schema";
import { createCampaignSchema } from "../schemas/validation";
import { hashToHex } from "../lib/content-hash";
import { generateCampaignContentHash } from "../lib/campaign-content";
import { redirect } from "next/navigation";

export async function createCampaignAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const raw = Object.fromEntries(formData.entries());
  // Parse images from JSON string if provided
  if (typeof raw.images === "string" && raw.images.startsWith("[")) {
    raw.images = JSON.parse(raw.images as string);
  }

  const parsed = createCampaignSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { title, description, images, category, groupId, fundingModel, currencyMint, goalAmount, deadline } = parsed.data;

  // Server-side deadline re-validation
  if (new Date(deadline).getTime() <= Date.now()) {
    return { error: "Termin musi być w przyszłości" };
  }

  // Generate content hash for on-chain bridge (includes all metadata)
  const normalizedDeadline = new Date(deadline).toISOString();
  const contentHash = await generateCampaignContentHash({
    title,
    description,
    images: images || [],
    category,
    fundingModel,
    currencyMint,
    goalAmount: goalAmount.toString(),
    deadline: normalizedDeadline,
  });
  const contentHashHex = hashToHex(contentHash);

  const [campaign] = await db
    .insert(crowdfundingCampaigns)
    .values({
      creatorId: session.user.id,
      groupId: groupId || null,
      title,
      description,
      images: images || [],
      category,
      currencyMint,
      fundingModel,
      goalAmount: goalAmount.toString(),
      deadline: new Date(normalizedDeadline),
      contentHash: contentHashHex,
    })
    .returning();

  redirect(`/crowdfunding/${campaign.id}`);
}
