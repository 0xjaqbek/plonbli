"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { cartItems, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { addToCartSchema, type AddToCartInput } from "../schemas/validation";

type AddToCartResult =
  | { success: true; cartItemId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function addToCart(input: AddToCartInput): Promise<AddToCartResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { listingId, quantity } = parsed.data;

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });

  if (!listing || listing.availability === "OUT_OF_STOCK") {
    return { success: false, error: "Oferta nie istnieje" };
  }

  const existing = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.userId, session.user.id), eq(cartItems.listingId, listingId)),
  });

  if (existing) {
    const newQuantity = Number(existing.quantity) + quantity;
    await db
      .update(cartItems)
      .set({ quantity: String(newQuantity) })
      .where(eq(cartItems.id, existing.id));
    return { success: true, cartItemId: existing.id };
  }

  const [item] = await db
    .insert(cartItems)
    .values({
      userId: session.user.id,
      listingId,
      quantity: String(quantity),
    })
    .returning({ id: cartItems.id });

  return { success: true, cartItemId: item.id };
}
