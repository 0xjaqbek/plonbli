"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderItems, orderStatusHistory } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { modifyOrderSchema, type ModifyOrderInput } from "../schemas/validation";

type ModifyOrderResult = { success: true } | { success: false; error?: string; errors?: Record<string, string[]> };

export async function modifyOrder(input: ModifyOrderInput): Promise<ModifyOrderResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = modifyOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { orderId, items, shippingCost, paymentRequired, farmerNote } = parsed.data;

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
    return { success: false, error: "Zamowienie nie moze byc zmodyfikowane w tym statusie" };
  }

  await db.transaction(async (tx) => {
    if (items?.length) {
      for (const item of items) {
        await tx
          .update(orderItems)
          .set({
            modifiedQuantity: item.modifiedQuantity !== undefined ? String(item.modifiedQuantity) : null,
            modifiedPricePerUnit: item.modifiedPricePerUnit !== undefined ? String(item.modifiedPricePerUnit) : null,
          })
          .where(eq(orderItems.id, item.orderItemId));
      }
    }

    const allItems = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    let newTotal = 0;
    for (const item of allItems) {
      const qty = item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
      const price = item.modifiedPricePerUnit ? Number(item.modifiedPricePerUnit) : Number(item.pricePerUnit);
      newTotal += qty * price;
    }

    if (shippingCost !== undefined) {
      newTotal += shippingCost;
    } else if (order.shippingCost) {
      newTotal += Number(order.shippingCost);
    }

    await tx
      .update(orders)
      .set({
        status: "MODIFIED",
        shippingCost: shippingCost !== undefined ? String(shippingCost) : order.shippingCost,
        paymentRequired: paymentRequired as "PREPAID" | "ON_PICKUP",
        farmerNote: farmerNote ?? order.farmerNote,
        totalAmount: String(newTotal),
      })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "MODIFIED",
      note: farmerNote,
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
