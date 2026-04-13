import { or, and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders } from "@/shared/db/schema";

export async function hasUnseenOrderChanges(userId: string): Promise<boolean> {
  const result = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      or(
        and(eq(orders.customerId, userId), eq(orders.customerHasSeen, false)),
        and(eq(orders.farmerId, userId), eq(orders.farmerHasSeen, false))
      )
    )
    .limit(1);

  return result.length > 0;
}
