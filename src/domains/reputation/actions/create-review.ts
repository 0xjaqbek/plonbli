"use server";

import { auth } from "@/domains/auth/lib/auth";
import {
  createReviewSchema,
  type CreateReviewInput,
} from "../schemas/validation";
import { PostgresReviewRepository } from "../repository/postgres";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingContributions,
  orders,
  reviews,
} from "@/shared/db/schema";

type CreateReviewResult =
  | { success: true; reviewId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createReview(
  input: CreateReviewInput
): Promise<CreateReviewResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (parsed.data.targetId && parsed.data.targetId === session.user.id) {
    return { success: false, error: "Nie mozesz ocenic siebie" };
  }

  if (!parsed.data.targetId && !parsed.data.proxyFarmerId) {
    return { success: false, error: "Brak celu opinii" };
  }

  if (parsed.data.proxyFarmerId) {
    return {
      success: false,
      error: "Opinia wymaga potwierdzonego zakupu lub wsparcia kampanii",
    };
  }

  const targetId = parsed.data.targetId!;
  const [completedOrder] = await db
    .select({ id: orders.id })
    .from(orders)
    .leftJoin(reviews, eq(reviews.verificationEvidenceId, orders.id))
    .where(
      and(
        eq(orders.customerId, session.user.id),
        eq(orders.farmerId, targetId),
        eq(orders.status, "COMPLETED"),
        isNull(reviews.id)
      )
    )
    .limit(1);

  let verificationSource: "ORDER" | "CAMPAIGN";
  let verificationEvidenceId: string;
  if (completedOrder) {
    verificationSource = "ORDER";
    verificationEvidenceId = completedOrder.id;
  } else {
    const [backing] = await db
      .select({ id: crowdfundingContributions.id })
      .from(crowdfundingContributions)
      .innerJoin(
        crowdfundingCampaigns,
        eq(crowdfundingCampaigns.id, crowdfundingContributions.campaignId)
      )
      .leftJoin(
        reviews,
        eq(reviews.verificationEvidenceId, crowdfundingContributions.id)
      )
      .where(
        and(
          eq(crowdfundingContributions.backerId, session.user.id),
          eq(crowdfundingContributions.refunded, false),
          eq(crowdfundingCampaigns.creatorId, targetId),
          or(
            eq(crowdfundingCampaigns.status, "SUCCESSFUL"),
            eq(crowdfundingCampaigns.status, "FINALIZED")
          ),
          isNull(reviews.id)
        )
      )
      .limit(1);
    if (!backing) {
      return {
        success: false,
        error: "Opinia wymaga potwierdzonego zakupu lub wsparcia kampanii",
      };
    }
    verificationSource = "CAMPAIGN";
    verificationEvidenceId = backing.id;
  }

  const repo = new PostgresReviewRepository();
  const record = await repo.create({
    reviewerId: session.user.id,
    targetId: parsed.data.targetId ?? null,
    proxyFarmerId: parsed.data.proxyFarmerId ?? null,
    productId: parsed.data.productId,
    overall: parsed.data.overall,
    dimensions: parsed.data.dimensions,
    comment: parsed.data.comment,
    verificationSource,
    verificationEvidenceId,
  });

  return { success: true, reviewId: record.id };
}
