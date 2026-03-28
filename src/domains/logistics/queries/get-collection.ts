import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  collections,
  collectionItems,
  users,
  listings,
  products,
} from "@/shared/db/schema";

export async function getCollection(collectionId: string) {
  const [collection] = await db
    .select({
      id: collections.id,
      title: collections.title,
      description: collections.description,
      status: collections.status,
      targetAmount: collections.targetAmount,
      pickupAddress: collections.pickupAddress,
      pickupDate: collections.pickupDate,
      groupId: collections.groupId,
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
    .where(eq(collections.id, collectionId))
    .limit(1);

  if (!collection) return null;

  const items = await db
    .select({
      userId: collectionItems.userId,
      quantity: collectionItems.quantity,
      note: collectionItems.note,
      joinedAt: collectionItems.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(collectionItems)
    .innerJoin(users, eq(collectionItems.userId, users.id))
    .where(eq(collectionItems.collectionId, collectionId));

  return { ...collection, items };
}

export type CollectionDetail = NonNullable<
  Awaited<ReturnType<typeof getCollection>>
>;
