"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderItems, orderStatusHistory, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type AcceptModificationResult = { success: true } | { success: false; error: string };

export async function acceptModification(orderId: string): Promise<AcceptModificationResult> {
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

  if (order.customerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "MODIFIED") {
    return { success: false, error: "Zamowienie nie jest w statusie do akceptacji" };
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
      .set({ status: "CONFIRMED" })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "CONFIRMED",
      note: "Klient zaakceptowal modyfikacje",
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
