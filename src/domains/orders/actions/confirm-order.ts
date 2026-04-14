"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderItems, orderStatusHistory, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type ConfirmOrderResult = { success: true } | { success: false; error: string };

export async function confirmOrder(orderId: string): Promise<ConfirmOrderResult> {
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

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "PENDING") {
    return { success: false, error: "Zamowienie nie moze byc potwierdzone w tym statusie" };
  }

  await db.transaction(async (tx) => {
    const items = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    for (const item of items) {
      const listing = await tx.query.listings.findFirst({
        where: eq(listings.id, item.listingId),
      });

      if (listing?.quantityAvailable) {
        const qty = item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
        const newAvailable = Number(listing.quantityAvailable) - qty;
        await tx
          .update(listings)
          .set({ quantityAvailable: String(Math.max(0, newAvailable)) })
          .where(eq(listings.id, item.listingId));
      }
    }

    await tx
      .update(orders)
      .set({ status: "CONFIRMED", customerHasSeen: false })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "CONFIRMED",
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
