import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { cartItems, listings, products, users } from "@/shared/db/schema";

export async function getCart(userId: string) {
  const items = await db
    .select({
      cartItem: cartItems,
      listing: listings,
      product: products,
      farmer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(cartItems)
    .innerJoin(listings, eq(cartItems.listingId, listings.id))
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(users, eq(products.farmerId, users.id))
    .where(eq(cartItems.userId, userId));

  const grouped = new Map<string, {
    farmer: { id: string; name: string | null; avatar: string | null };
    items: typeof items;
    total: number;
  }>();

  for (const item of items) {
    const farmerId = item.farmer.id;
    if (!grouped.has(farmerId)) {
      grouped.set(farmerId, {
        farmer: item.farmer,
        items: [],
        total: 0,
      });
    }
    const group = grouped.get(farmerId)!;
    group.items.push(item);
    group.total += Number(item.cartItem.quantity) * Number(item.listing.price);
  }

  return Array.from(grouped.values());
}

export type CartGroup = Awaited<ReturnType<typeof getCart>>[number];
