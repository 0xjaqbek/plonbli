"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderStatusHistory } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { updateOrderStatusSchema, shippingInfoSchema, type UpdateOrderStatusInput, type ShippingInfoInput } from "../schemas/validation";

type StatusResult = { success: true } | { success: false; error?: string; errors?: Record<string, string[]> };

const validTransitions: Record<string, string[]> = {
  PAID: ["PREPARING", "READY_FOR_PICKUP"],
  CONFIRMED: ["PREPARING", "READY_FOR_PICKUP"],
  PREPARING: ["SHIPPED", "READY_FOR_PICKUP"],
};

export async function updateOrderStatus(input: UpdateOrderStatusInput): Promise<StatusResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { orderId, status, note } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  const allowed = validTransitions[order.status] ?? [];
  if (!allowed.includes(status)) {
    return { success: false, error: `Nie mozna zmienic statusu z ${order.status} na ${status}` };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: status as any })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: status as any,
      note: note ?? null,
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}

export async function markAsShipped(input: ShippingInfoInput): Promise<StatusResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = shippingInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { orderId, trackingNumber, trackingUrl } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "PREPARING") {
    return { success: false, error: "Zamowienie nie jest w przygotowaniu" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "SHIPPED",
        trackingNumber,
        trackingUrl: trackingUrl ?? null,
      })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "SHIPPED",
      note: `Numer przesylki: ${trackingNumber}`,
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
