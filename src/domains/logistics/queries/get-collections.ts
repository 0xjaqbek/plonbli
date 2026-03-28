import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  collections,
  collectionItems,
  users,
  listings,
  products,
} from "@/shared/db/schema";

export async function getCollectionsByGroup(groupId: string) {
  const allCollections = await db
    .select({
      id: collections.id,
      title: collections.title,
      description: collections.description,
      status: collections.status,
      targetAmount: collections.targetAmount,
      pickupAddress: collections.pickupAddress,
      pickupDate: collections.pickupDate,
      createdAt: collections.createdAt,
      coordinator: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      listing: {
        id: listings.id,
        price: listings.price,
        unit: listings.unit,
      },
      productName: products.name,
    })
    .from(collections)
    .innerJoin(users, eq(collections.coordinatorId, users.id))
    .innerJoin(listings, eq(collections.listingId, listings.id))
    .innerJoin(products, eq(listings.productId, products.id))
    .where(eq(collections.groupId, groupId))
    .orderBy(desc(collections.createdAt));

  const enriched = await Promise.all(
    allCollections.map(async (col) => {
      const [{ count, totalQty }] = await db
        .select({
          count: sql<number>`cast(count(*) as int)`,
          totalQty: sql<string>`coalesce(sum(cast(${collectionItems.quantity} as numeric)), 0)`,
        })
        .from(collectionItems)
        .where(eq(collectionItems.collectionId, col.id));

      return {
        ...col,
        participantCount: count,
        totalQuantity: totalQty,
      };
    })
  );

  return enriched;
}

export type CollectionWithDetails = Awaited<
  ReturnType<typeof getCollectionsByGroup>
>[number];
