import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { reviews, users, products } from "@/shared/db/schema";

export async function getReviewsByTarget(targetId: string) {
  return db
    .select({
      id: reviews.id,
      overall: reviews.overall,
      dimensions: reviews.dimensions,
      comment: reviews.comment,
      contentHash: reviews.contentHash,
      createdAt: reviews.createdAt,
      reviewer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      product: {
        id: products.id,
        name: products.name,
      },
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .leftJoin(products, eq(reviews.productId, products.id))
    .where(eq(reviews.targetId, targetId))
    .orderBy(desc(reviews.createdAt));
}

export async function getReviewsByProxyFarmer(proxyFarmerId: string) {
  return db
    .select({
      id: reviews.id,
      overall: reviews.overall,
      dimensions: reviews.dimensions,
      comment: reviews.comment,
      contentHash: reviews.contentHash,
      createdAt: reviews.createdAt,
      reviewer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      product: {
        id: products.id,
        name: products.name,
      },
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .leftJoin(products, eq(reviews.productId, products.id))
    .where(eq(reviews.proxyFarmerId, proxyFarmerId))
    .orderBy(desc(reviews.createdAt));
}

export type UserReview = Awaited<
  ReturnType<typeof getReviewsByTarget>
>[number];
