"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type MarkSeenResult = { success: true } | { success: false; error: string };

export async function markOrderSeen(orderId: string): Promise<MarkSeenResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  const isCustomer = order.customerId === session.user.id;
  const isFarmer = order.farmerId === session.user.id;

  if (!isCustomer && !isFarmer) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (isCustomer) {
    await db
      .update(orders)
      .set({ customerHasSeen: true })
      .where(eq(orders.id, orderId));
  }

  if (isFarmer) {
    await db
      .update(orders)
      .set({ farmerHasSeen: true })
      .where(eq(orders.id, orderId));
  }

  return { success: true };
}
