"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderStatusHistory } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type CompleteResult = { success: true } | { success: false; error: string };

export async function completeOrder(orderId: string): Promise<CompleteResult> {
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

  const completableStatuses = ["SHIPPED", "READY_FOR_PICKUP"];
  if (!completableStatuses.includes(order.status)) {
    return { success: false, error: "Nie mozna potwierdzic odbioru w tym statusie" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: "COMPLETED" })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "COMPLETED",
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
