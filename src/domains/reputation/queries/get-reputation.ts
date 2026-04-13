import { eq, avg, count, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { reviews } from "@/shared/db/schema";
import type { ReputationStats } from "../types";

function parseDimensionAvg(value: string | null): number | null {
  return value !== null ? parseFloat(value) : null;
}

export async function getReputation(userId: string): Promise<ReputationStats> {
  const [stats] = await db
    .select({
      averageRating: avg(reviews.overall),
      reviewCount: count(),
      qualityAvg: sql<string | null>`AVG((${reviews.dimensions}->>'quality')::numeric)`,
      communicationAvg: sql<string | null>`AVG((${reviews.dimensions}->>'communication')::numeric)`,
      punctualityAvg: sql<string | null>`AVG((${reviews.dimensions}->>'punctuality')::numeric)`,
      accuracyAvg: sql<string | null>`AVG((${reviews.dimensions}->>'accuracy')::numeric)`,
    })
    .from(reviews)
    .where(eq(reviews.targetId, userId));

  return {
    averageRating: stats.averageRating ? parseFloat(stats.averageRating) : 0,
    reviewCount: stats.reviewCount,
    dimensionAverages: {
      quality: parseDimensionAvg(stats.qualityAvg),
      communication: parseDimensionAvg(stats.communicationAvg),
      punctuality: parseDimensionAvg(stats.punctualityAvg),
      accuracy: parseDimensionAvg(stats.accuracyAvg),
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
      qualityAvg: sql<string | null>`AVG((${reviews.dimensions}->>'quality')::numeric)`,
      communicationAvg: sql<string | null>`AVG((${reviews.dimensions}->>'communication')::numeric)`,
      punctualityAvg: sql<string | null>`AVG((${reviews.dimensions}->>'punctuality')::numeric)`,
      accuracyAvg: sql<string | null>`AVG((${reviews.dimensions}->>'accuracy')::numeric)`,
    })
    .from(reviews)
    .where(eq(reviews.proxyFarmerId, proxyFarmerId));

  return {
    averageRating: stats.averageRating ? parseFloat(stats.averageRating) : 0,
    reviewCount: stats.reviewCount,
    dimensionAverages: {
      quality: parseDimensionAvg(stats.qualityAvg),
      communication: parseDimensionAvg(stats.communicationAvg),
      punctuality: parseDimensionAvg(stats.punctualityAvg),
      accuracy: parseDimensionAvg(stats.accuracyAvg),
    },
  };
}
