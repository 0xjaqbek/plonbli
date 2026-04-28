import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders } from "@/shared/db/schema";

export async function getOrder(orderId: string) {
  return db.query.orders.findFirst({
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
      pickupSlot: true,
    },
  });
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;
