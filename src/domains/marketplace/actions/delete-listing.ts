"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { products, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type DeleteListingResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteListing(
  listingId: string
): Promise<DeleteListingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
    with: { product: true },
  });

  if (!listing) {
    return { success: false, error: "Oferta nie istnieje" };
  }

  if (listing.product.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  // Delete product cascades to listing
  await db.delete(products).where(eq(products.id, listing.productId));

  return { success: true };
}
