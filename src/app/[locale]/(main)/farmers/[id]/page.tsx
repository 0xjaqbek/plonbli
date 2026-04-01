import { notFound } from "next/navigation";
import { eq, sql, and, count, countDistinct } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  listings,
  products,
  users,
  categories,
  follows,
  cropLogs,
  reviews,
} from "@/shared/db/schema";
import { FarmerProfileView } from "@/domains/marketplace/components/farmer-profile-view";

export default async function FarmerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const farmer = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!farmer || (farmer.role !== "FARMER" && farmer.role !== "BOTH")) {
    notFound();
  }

  const [
    farmerListings,
    [{ count: followerCount }],
    [{ count: cropLogCount }],
    [reputationStats],
    farmingMethods,
    farmerCategories,
    isFollowingResult,
  ] = await Promise.all([
    // Listings with products and categories
    db
      .select({
        listing: listings,
        product: products,
        farmer: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
          voivodeship: users.voivodeship,
        },
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(listings)
      .innerJoin(products, eq(listings.productId, products.id))
      .innerJoin(users, eq(products.farmerId, users.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.farmerId, id)),

    // Follower count
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(follows)
      .where(eq(follows.followeeId, id)),

    // Crop log count
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(cropLogs)
      .where(eq(cropLogs.farmerId, id)),

    // Reputation stats
    db
      .select({
        averageRating: sql<string | null>`avg(${reviews.overall})`,
        reviewCount: count(),
      })
      .from(reviews)
      .where(eq(reviews.targetId, id)),

    // Distinct farming methods
    db
      .selectDistinct({ method: products.method })
      .from(products)
      .where(eq(products.farmerId, id)),

    // Distinct categories
    db
      .selectDistinct({
        id: categories.id,
        name: categories.name,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.farmerId, id)),

    // Is current user following this farmer
    session?.user?.id && session.user.id !== id
      ? db.query.follows.findFirst({
          where: and(
            eq(follows.followerId, session.user.id),
            eq(follows.followeeId, id)
          ),
        })
      : Promise.resolve(null),
  ]);

  const profileData = {
    farmer,
    listings: farmerListings,
    followerCount,
    cropLogCount,
    averageRating: reputationStats.averageRating
      ? parseFloat(reputationStats.averageRating)
      : 0,
    reviewCount: reputationStats.reviewCount,
    farmingMethods: farmingMethods.map((m) => m.method),
    categories: farmerCategories,
    isFollowing: !!isFollowingResult,
    currentUserId: session?.user?.id ?? null,
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <FarmerProfileView {...profileData} />
    </div>
  );
}
