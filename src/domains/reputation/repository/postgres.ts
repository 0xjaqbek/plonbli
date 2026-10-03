import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { reviews } from "@/shared/db/schema";
import type { ReviewEntry, ReviewRecord, ReviewRepository } from "../types";

async function sha256(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function computeLegacyReviewHash(input: {
  reviewerId: string;
  targetId: string | null;
  dimensions?: Record<string, number | undefined>;
  timestamp: string;
}): Promise<string> {
  return sha256(
    JSON.stringify({
      reviewerId: input.reviewerId,
      targetId: input.targetId,
      dimensions: input.dimensions,
      timestamp: input.timestamp,
    })
  );
}

export async function computeReviewHash(input: ReviewEntry & {
  previousHash: string | null;
  timestamp: string;
}): Promise<string> {
  return sha256(
    JSON.stringify({
      version: 2,
      reviewerId: input.reviewerId,
      targetId: input.targetId,
      proxyFarmerId: input.proxyFarmerId ?? null,
      productId: input.productId ?? null,
      overall: input.overall,
      dimensions: input.dimensions ?? null,
      comment: input.comment ?? null,
      verificationSource: input.verificationSource,
      verificationEvidenceId: input.verificationEvidenceId,
      previousHash: input.previousHash,
      timestamp: input.timestamp,
    })
  );
}

function mapReview(record: typeof reviews.$inferSelect): ReviewRecord {
  return {
    id: record.id,
    reviewerId: record.reviewerId,
    targetId: record.targetId,
    proxyFarmerId: record.proxyFarmerId,
    productId: record.productId ?? undefined,
    overall: record.overall,
    dimensions: record.dimensions ?? undefined,
    comment: record.comment ?? undefined,
    verificationSource: record.verificationSource,
    verificationEvidenceId: record.verificationEvidenceId ?? "",
    contentHash: record.contentHash,
    previousHash: record.previousHash,
    hashVersion: record.hashVersion,
    createdAt: record.createdAt,
  };
}

export class PostgresReviewRepository implements ReviewRepository {
  async create(entry: ReviewEntry): Promise<ReviewRecord> {
    return db.transaction(async (tx) => {
      // Serialize each reviewer's append-only chain so concurrent submissions
      // cannot receive the same previous hash.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${entry.reviewerId}))`
      );
      const [lastReview] = await tx
        .select({ contentHash: reviews.contentHash })
        .from(reviews)
        .where(eq(reviews.reviewerId, entry.reviewerId))
        .orderBy(desc(reviews.createdAt))
        .limit(1);

      const previousHash = lastReview?.contentHash ?? null;
      const now = new Date();
      const contentHash = await computeReviewHash({
        ...entry,
        previousHash,
        timestamp: now.toISOString(),
      });
      const [record] = await tx
        .insert(reviews)
        .values({
          ...entry,
          proxyFarmerId: entry.proxyFarmerId ?? null,
          productId: entry.productId,
          comment: entry.comment,
          contentHash,
          previousHash,
          hashVersion: 2,
          createdAt: now,
        })
        .returning();

      return mapReview(record);
    });
  }

  async getByTarget(targetId: string): Promise<ReviewRecord[]> {
    const records = await db
      .select()
      .from(reviews)
      .where(eq(reviews.targetId, targetId))
      .orderBy(desc(reviews.createdAt));
    return records.map(mapReview);
  }

  async getByReviewer(reviewerId: string): Promise<ReviewRecord[]> {
    const records = await db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewerId, reviewerId))
      .orderBy(desc(reviews.createdAt));
    return records.map(mapReview);
  }

  async verify(entryId: string): Promise<boolean> {
    const [record] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, entryId))
      .limit(1);
    if (!record) return false;

    const recomputedHash =
      record.hashVersion === 1
        ? await computeLegacyReviewHash({
            reviewerId: record.reviewerId,
            targetId: record.targetId,
            dimensions: record.dimensions ?? undefined,
            timestamp: record.createdAt.toISOString(),
          })
        : await computeReviewHash({
            reviewerId: record.reviewerId,
            targetId: record.targetId,
            proxyFarmerId: record.proxyFarmerId,
            productId: record.productId ?? undefined,
            overall: record.overall,
            dimensions: record.dimensions ?? undefined,
            comment: record.comment ?? undefined,
            verificationSource: record.verificationSource,
            verificationEvidenceId: record.verificationEvidenceId ?? "",
            previousHash: record.previousHash,
            timestamp: record.createdAt.toISOString(),
          });
    return recomputedHash === record.contentHash;
  }
}
