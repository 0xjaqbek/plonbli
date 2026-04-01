import { eq, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { proxyFarmers, users, proxyFarmerFollows, reviews } from "@/shared/db/schema";

export async function getProxyFarmer(id: string) {
  const pf = await db.query.proxyFarmers.findFirst({
    where: eq(proxyFarmers.id, id),
  });

  if (!pf) return null;

  const creator = await db.query.users.findFirst({
    where: eq(users.id, pf.creatorId),
    columns: { id: true, name: true, avatar: true },
  });

  const [{ count: followerCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(proxyFarmerFollows)
    .where(eq(proxyFarmerFollows.proxyFarmerId, id));

  const [repStats] = await db
    .select({
      averageRating: sql<string | null>`avg(${reviews.overall})`,
      reviewCount: sql<number>`cast(count(*) as int)`,
    })
    .from(reviews)
    .where(eq(reviews.proxyFarmerId, id));

  return {
    ...pf,
    creator: creator!,
    followerCount,
    averageRating: repStats.averageRating
      ? parseFloat(repStats.averageRating)
      : 0,
    reviewCount: repStats.reviewCount,
  };
}

export type ProxyFarmerDetail = NonNullable<
  Awaited<ReturnType<typeof getProxyFarmer>>
>;

export async function getProxyFarmersByCreator(creatorId: string) {
  return db
    .select({
      id: proxyFarmers.id,
      name: proxyFarmers.name,
      avatar: proxyFarmers.avatar,
      voivodeship: proxyFarmers.voivodeship,
      createdAt: proxyFarmers.createdAt,
    })
    .from(proxyFarmers)
    .where(eq(proxyFarmers.creatorId, creatorId));
}

export async function getProxyFarmerCount(creatorId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(proxyFarmers)
    .where(eq(proxyFarmers.creatorId, creatorId));
  return count;
}

export async function getProxyFarmersForList() {
  return db
    .select({
      id: proxyFarmers.id,
      name: proxyFarmers.name,
      avatar: proxyFarmers.avatar,
      voivodeship: proxyFarmers.voivodeship,
      createdAt: proxyFarmers.createdAt,
      isProxy: sql<boolean>`true`.as("is_proxy"),
    })
    .from(proxyFarmers);
}

export async function getProxyFarmersForMap() {
  return db
    .select({
      id: proxyFarmers.id,
      name: proxyFarmers.name,
      avatar: proxyFarmers.avatar,
      latitude: proxyFarmers.latitude,
      longitude: proxyFarmers.longitude,
      voivodeship: proxyFarmers.voivodeship,
      county: proxyFarmers.county,
      commune: proxyFarmers.commune,
      isProxy: sql<boolean>`true`.as("is_proxy"),
    })
    .from(proxyFarmers);
}
