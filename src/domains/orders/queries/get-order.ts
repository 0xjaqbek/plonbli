import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, farmerPaymentMethods } from "@/shared/db/schema";

export async function getOrder(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      customer: true,
      farmer: true,
      items: {
        with: {
          listing: true,
        },
      },
      statusHistory: {
        orderBy: (h: any, { asc }: any) => [asc(h.createdAt)],
      },
      paymentProofs: true,
      pickupSlot: true,
    },
  });

  if (!order) return null;

  const paymentMethods = await db.query.farmerPaymentMethods.findMany({
    where: eq(farmerPaymentMethods.farmerId, order.farmerId),
  });

  return { ...order, farmerPaymentMethods: paymentMethods };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;
