"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderItems, orderStatusHistory, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { cancelOrderSchema, type CancelOrderInput } from "../schemas/validation";

type CancelResult = { success: true } | { success: false; error?: string; errors?: Record<string, string[]> };

const CUSTOMER_FREE_CANCEL = ["PENDING", "MODIFIED"];
const NON_CANCELLABLE = ["COMPLETED", "CANCELLED"];

export async function cancelOrder(input: CancelOrderInput): Promise<CancelResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { orderId, reason } = parsed.data;

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

  if (NON_CANCELLABLE.includes(order.status)) {
    return { success: false, error: "Nie mozna anulowac zamowienia w tym statusie" };
  }

  if (isCustomer && !CUSTOMER_FREE_CANCEL.includes(order.status)) {
    return { success: false, error: "Anulowanie wymaga zgody rolnika po potwierdzeniu zamowienia" };
  }

  if (isFarmer && !reason) {
    return { success: false, error: "Rolnik musi podac powod anulowania" };
  }

  const needsRestore = ["CONFIRMED", "PAID", "PREPARING", "SHIPPED", "READY_FOR_PICKUP"].includes(order.status);

  await db.transaction(async (tx) => {
    if (needsRestore) {
      const items = await tx.query.orderItems.findMany({
        where: eq(orderItems.orderId, orderId),
      });

      for (const item of items) {
        const listing = await tx.query.listings.findFirst({
          where: eq(listings.id, item.listingId),
        });

        if (listing?.quantityAvailable) {
          const qty = item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
          const restored = Number(listing.quantityAvailable) + qty;
          await tx
            .update(listings)
            .set({ quantityAvailable: String(restored) })
            .where(eq(listings.id, item.listingId));
        }
      }
    }

    await tx
      .update(orders)
      .set({
        status: "CANCELLED",
        cancellationReason: reason ?? null,
        cancelledBy: isFarmer ? "FARMER" : "CUSTOMER",
      })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "CANCELLED",
      note: reason ?? null,
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
