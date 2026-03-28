import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { reviews } from "@/shared/db/schema";
import type {
  ReviewEntry,
  ReviewRecord,
  ReviewRepository,
} from "../types";

export async function computeReviewHash(input: {
  reviewerId: string;
  targetId: string;
  dimensions?: Record<string, number | undefined>;
  timestamp: string;
}): Promise<string> {
  const payload = JSON.stringify({
    reviewerId: input.reviewerId,
    targetId: input.targetId,
    dimensions: input.dimensions,
    timestamp: input.timestamp,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class PostgresReviewRepository implements ReviewRepository {
  async create(entry: ReviewEntry): Promise<ReviewRecord> {
    const [lastReview] = await db
      .select({ contentHash: reviews.contentHash })
      .from(reviews)
      .where(eq(reviews.reviewerId, entry.reviewerId))
      .orderBy(desc(reviews.createdAt))
      .limit(1);

    const previousHash = lastReview?.contentHash ?? null;
    const now = new Date();

    const contentHash = await computeReviewHash({
      reviewerId: entry.reviewerId,
      targetId: entry.targetId,
      dimensions: entry.dimensions,
      timestamp: now.toISOString(),
    });

    const [record] = await db
      .insert(reviews)
      .values({
        reviewerId: entry.reviewerId,
        targetId: entry.targetId,
        productId: entry.productId,
        overall: entry.overall,
        dimensions: entry.dimensions,
        comment: entry.comment,
        contentHash,
        previousHash,
        createdAt: now,
      })
      .returning();

    return {
      id: record.id,
      reviewerId: record.reviewerId,
      targetId: record.targetId,
      productId: record.productId ?? undefined,
      overall: record.overall,
      dimensions: record.dimensions ?? undefined,
      comment: record.comment ?? undefined,
      contentHash: record.contentHash,
      previousHash: record.previousHash,
      createdAt: record.createdAt,
    };
  }

  async getByTarget(targetId: string): Promise<ReviewRecord[]> {
    const records = await db
      .select()
      .from(reviews)
      .where(eq(reviews.targetId, targetId))
      .orderBy(desc(reviews.createdAt));

    return records.map((r) => ({
      id: r.id,
      reviewerId: r.reviewerId,
      targetId: r.targetId,
      productId: r.productId ?? undefined,
      overall: r.overall,
      dimensions: r.dimensions ?? undefined,
      comment: r.comment ?? undefined,
      contentHash: r.contentHash,
      previousHash: r.previousHash,
      createdAt: r.createdAt,
    }));
  }

  async getByReviewer(reviewerId: string): Promise<ReviewRecord[]> {
    const records = await db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewerId, reviewerId))
      .orderBy(desc(reviews.createdAt));

    return records.map((r) => ({
      id: r.id,
      reviewerId: r.reviewerId,
      targetId: r.targetId,
      productId: r.productId ?? undefined,
      overall: r.overall,
      dimensions: r.dimensions ?? undefined,
      comment: r.comment ?? undefined,
      contentHash: r.contentHash,
      previousHash: r.previousHash,
      createdAt: r.createdAt,
    }));
  }

  async verify(entryId: string): Promise<boolean> {
    const [record] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, entryId))
      .limit(1);

    if (!record) return false;

    const recomputedHash = await computeReviewHash({
      reviewerId: record.reviewerId,
      targetId: record.targetId,
      dimensions: record.dimensions ?? undefined,
      timestamp: record.createdAt.toISOString(),
    });

    return recomputedHash === record.contentHash;
  }
}
