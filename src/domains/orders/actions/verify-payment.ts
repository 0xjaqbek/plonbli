"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderStatusHistory, paymentProofs } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type VerifyPaymentResult = { success: true } | { success: false; error: string };

export async function verifyPayment(orderId: string, proofId: string): Promise<VerifyPaymentResult> {
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

  if (order.status !== "CONFIRMED") {
    return { success: false, error: "Nie mozna potwierdzic platnosci w tym statusie" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(paymentProofs)
      .set({ verified: true })
      .where(and(eq(paymentProofs.id, proofId), eq(paymentProofs.orderId, orderId)));

    await tx
      .update(orders)
      .set({ status: "PAID" })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "PAID",
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
