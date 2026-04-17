"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { products, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { supabaseAdmin, STORAGE_BUCKET } from "@/shared/lib/supabase";
import {
  createListingSchema,
  type CreateListingInput,
} from "../schemas/validation";

type UpdateListingResult =
  | { success: true }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function updateListing(
  listingId: string,
  input: CreateListingInput
): Promise<UpdateListingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
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

  const {
    name,
    description,
    categoryId,
    method,
    tags,
    images,
    price,
    unit,
    quantityAvailable,
    availability,
    validUntil,
    deliveryOptions,
  } = parsed.data;

  // Delete removed images from storage (fire-and-forget)
  const removedImages = listing.product.images.filter(
    (url) => !images.includes(url)
  );
  if (removedImages.length > 0) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const paths = removedImages.map((url) =>
      url.replace(
        `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/`,
        ""
      )
    );
    supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(paths)
      .catch((err) =>
        console.error("Failed to delete images from storage:", err)
      );
  }

  await db
    .update(products)
    .set({ name, description, categoryId, method, tags, images })
    .where(eq(products.id, listing.productId));

  await db
    .update(listings)
    .set({
      price: String(price),
      unit,
      quantityAvailable: quantityAvailable ? String(quantityAvailable) : null,
      availability,
      validUntil: validUntil ? new Date(validUntil) : null,
      deliveryOptions,
    })
    .where(eq(listings.id, listingId));

  return { success: true };
}
