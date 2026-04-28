"use server";

import { and, eq } from "drizzle-orm";
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

  const { orderId, items, farmerNote } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zapytanie nie istnieje" };
  }

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "PENDING") {
    return { success: false, error: "Zapytanie nie moze byc zmodyfikowane w tym statusie" };
  }

  await db.transaction(async (tx) => {
    if (items?.length) {
      for (const item of items) {
        await tx
          .update(orderItems)
          .set({
            modifiedQuantity: item.modifiedQuantity !== undefined ? String(item.modifiedQuantity) : null,
          })
          .where(and(eq(orderItems.id, item.orderItemId), eq(orderItems.orderId, orderId)));
      }
    }

    await tx
      .update(orders)
      .set({
        status: "MODIFIED",
        farmerNote: farmerNote ?? order.farmerNote,
        customerHasSeen: false,
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
