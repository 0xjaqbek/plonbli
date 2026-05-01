import { eq, or } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  users,
  orders,
  posts,
  reviews,
  listings,
  products,
} from "@/shared/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const [user, userOrders, userPosts, reviewsGiven, reviewsReceived, userListings] =
    await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          role: true,
          voivodeship: true,
          county: true,
          commune: true,
          postalCode: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.query.orders.findMany({
        where: or(
          eq(orders.customerId, userId),
          eq(orders.farmerId, userId)
        ),
      }),
      db.query.posts.findMany({
        where: eq(posts.authorId, userId),
      }),
      db.query.reviews.findMany({
        where: eq(reviews.reviewerId, userId),
      }),
      db.query.reviews.findMany({
        where: eq(reviews.targetId, userId),
      }),
      db
        .select({ listing: listings })
        .from(listings)
        .innerJoin(products, eq(listings.productId, products.id))
        .where(eq(products.farmerId, userId)),
    ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: user,
    orders: userOrders,
    posts: userPosts,
    reviewsGiven,
    reviewsReceived,
    listings: userListings.map((row) => row.listing),
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="plonbli-dane.json"',
    },
  });
}
