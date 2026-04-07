import { eq, desc, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, users } from "@/shared/db/schema";

const ITEMS_PER_PAGE = 10;

export async function getFarmerOrders(
  farmerId: string,
  filters?: { status?: string; page?: number }
) {
  const conditions = [eq(orders.farmerId, farmerId)];

  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status as any));
  }

  const page = filters?.page ?? 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const results = await db
    .select({
      order: orders,
      customer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(orders)
    .innerJoin(users, eq(orders.customerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(ITEMS_PER_PAGE)
    .offset(offset);

  return results;
}

export type FarmerOrderItem = Awaited<ReturnType<typeof getFarmerOrders>>[number];
