import { eq, avg, count } from "drizzle-orm";
import { db } from "@/shared/db";
import { reviews } from "@/shared/db/schema";
import type { ReputationStats } from "../types";

export async function getReputation(userId: string): Promise<ReputationStats> {
  const [stats] = await db
    .select({
      averageRating: avg(reviews.overall),
      reviewCount: count(),
    })
    .from(reviews)
    .where(eq(reviews.targetId, userId));

  return {
    averageRating: stats.averageRating ? parseFloat(stats.averageRating) : 0,
    reviewCount: stats.reviewCount,
    dimensionAverages: {
      quality: null,
      communication: null,
      punctuality: null,
      accuracy: null,
    },
  };
}

export async function getProxyFarmerReputation(
  proxyFarmerId: string
): Promise<ReputationStats> {
  const [stats] = await db
    .select({
      averageRating: avg(reviews.overall),
      reviewCount: count(),
    })
    .from(reviews)
    .where(eq(reviews.proxyFarmerId, proxyFarmerId));

  return {
    averageRating: stats.averageRating ? parseFloat(stats.averageRating) : 0,
    reviewCount: stats.reviewCount,
    dimensionAverages: {
      quality: null,
      communication: null,
      punctuality: null,
      accuracy: null,
    },
  };
}
