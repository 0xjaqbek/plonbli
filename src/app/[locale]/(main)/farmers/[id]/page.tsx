import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  listings,
  products,
  users,
  categories,
} from "@/shared/db/schema";
import { FarmerProfileView } from "@/domains/marketplace/components/farmer-profile-view";

export default async function FarmerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const farmer = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!farmer || (farmer.role !== "FARMER" && farmer.role !== "BOTH")) {
    notFound();
  }

  const farmerListings = await db
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
    .where(eq(products.farmerId, id));

  return (
    <div className="max-w-5xl mx-auto p-4">
      <FarmerProfileView farmer={farmer} listings={farmerListings} />
    </div>
  );
}
