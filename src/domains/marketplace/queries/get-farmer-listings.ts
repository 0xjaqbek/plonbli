import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  listings,
  products,
  categories,
  users,
} from "@/shared/db/schema";

export async function getFarmerListings(farmerId: string) {
  return db
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
    .where(eq(products.farmerId, farmerId))
    .orderBy(desc(listings.createdAt));
}

export async function getFarmer(farmerId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, farmerId),
  });
}
