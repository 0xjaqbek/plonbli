import { eq, and, sql, SQL } from "drizzle-orm";
import { db } from "@/shared/db";
import { proxyFarmers, users, proxyFarmerFollows, reviews } from "@/shared/db/schema";

export async function getProxyFarmer(id: string, currentUserId?: string | null) {
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

  let isFollowing = false;
  if (currentUserId) {
    const follow = await db.query.proxyFarmerFollows.findFirst({
      where: and(
        eq(proxyFarmerFollows.followerId, currentUserId),
        eq(proxyFarmerFollows.proxyFarmerId, id)
      ),
    });
    isFollowing = !!follow;
  }

  return {
    ...pf,
    creator: creator!,
    followerCount,
    averageRating: repStats.averageRating
      ? parseFloat(repStats.averageRating)
      : 0,
    reviewCount: repStats.reviewCount,
    isFollowing,
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

export async function getProxyFarmersForList(
  filters: { voivodeship?: string; county?: string; commune?: string } = {}
) {
  const conditions: SQL[] = [];
  if (filters.voivodeship) conditions.push(eq(proxyFarmers.voivodeship, filters.voivodeship));
  if (filters.county) conditions.push(eq(proxyFarmers.county, filters.county));
  if (filters.commune) conditions.push(eq(proxyFarmers.commune, filters.commune));

  const query = db
    .select({
      id: proxyFarmers.id,
      name: proxyFarmers.name,
      avatar: proxyFarmers.avatar,
      voivodeship: proxyFarmers.voivodeship,
      createdAt: proxyFarmers.createdAt,
      isProxy: sql<boolean>`true`.as("is_proxy"),
    })
    .from(proxyFarmers);

  return conditions.length > 0 ? query.where(and(...conditions)) : query;
}

export async function getProxyFarmersForMap(
  filters: { voivodeship?: string; county?: string; commune?: string } = {}
) {
  const conditions: SQL[] = [];
  if (filters.voivodeship) conditions.push(eq(proxyFarmers.voivodeship, filters.voivodeship));
  if (filters.county) conditions.push(eq(proxyFarmers.county, filters.county));
  if (filters.commune) conditions.push(eq(proxyFarmers.commune, filters.commune));

  const query = db
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

  return conditions.length > 0 ? query.where(and(...conditions)) : query;
}
