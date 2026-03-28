"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { products, listings, users } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createListingSchema,
  type CreateListingInput,
} from "../schemas/validation";

type CreateListingResult =
  | { success: true; listingId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createListing(
  input: CreateListingInput
): Promise<CreateListingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || (user.role !== "FARMER" && user.role !== "BOTH")) {
    return {
      success: false,
      error: "Tylko rolnicy moga dodawac oferty",
    };
  }

  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
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

  const [product] = await db
    .insert(products)
    .values({
      farmerId: session.user.id,
      name,
      description,
      categoryId,
      method,
      tags,
      images,
    })
    .returning({ id: products.id });

  const [listing] = await db
    .insert(listings)
    .values({
      productId: product.id,
      price: String(price),
      unit,
      quantityAvailable: quantityAvailable
        ? String(quantityAvailable)
        : null,
      availability,
      validUntil: validUntil ? new Date(validUntil) : null,
      deliveryOptions,
    })
    .returning({ id: listings.id });

  return { success: true, listingId: listing.id };
}
