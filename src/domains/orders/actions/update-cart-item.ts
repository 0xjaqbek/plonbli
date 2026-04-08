"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { cartItems } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type UpdateCartResult = { success: true } | { success: false; error: string };

export async function updateCartItem(cartItemId: string, quantity: number): Promise<UpdateCartResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  if (quantity <= 0) {
    return { success: false, error: "Ilosc musi byc wieksza od 0" };
  }

  const item = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.id, cartItemId), eq(cartItems.userId, session.user.id)),
  });

  if (!item) {
    return { success: false, error: "Nie znaleziono pozycji" };
  }

  await db
    .update(cartItems)
    .set({ quantity: String(quantity) })
    .where(eq(cartItems.id, cartItemId));

  return { success: true };
}
