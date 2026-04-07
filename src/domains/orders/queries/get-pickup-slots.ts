import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import { pickupSlots } from "@/shared/db/schema";

export async function getGlobalPickupSlots(farmerId: string) {
  return db.query.pickupSlots.findMany({
    where: and(
      eq(pickupSlots.farmerId, farmerId),
      isNull(pickupSlots.orderId),
      eq(pickupSlots.isActive, true),
    ),
  });
}

export async function getOrderPickupSlots(orderId: string) {
  return db.query.pickupSlots.findMany({
    where: and(
      eq(pickupSlots.orderId, orderId),
      eq(pickupSlots.isActive, true),
    ),
  });
}
