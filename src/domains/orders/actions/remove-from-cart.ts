"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { cartItems } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type RemoveCartResult = { success: true } | { success: false; error: string };

export async function removeFromCart(cartItemId: string): Promise<RemoveCartResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const item = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.id, cartItemId), eq(cartItems.userId, session.user.id)),
  });

  if (!item) {
    return { success: false, error: "Nie znaleziono pozycji" };
  }

  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));

  return { success: true };
}
