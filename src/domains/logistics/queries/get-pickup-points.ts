import { eq, and, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { pickupPoints, users } from "@/shared/db/schema";

export async function getPickupPoints(options?: { creatorId?: string }) {
  const conditions = [eq(pickupPoints.isActive, true)];

  if (options?.creatorId) {
    conditions.push(eq(pickupPoints.createdBy, options.creatorId));
  }

  return db
    .select({
      id: pickupPoints.id,
      name: pickupPoints.name,
      description: pickupPoints.description,
      address: pickupPoints.address,
      latitude: pickupPoints.latitude,
      longitude: pickupPoints.longitude,
      hours: pickupPoints.hours,
      isActive: pickupPoints.isActive,
      createdAt: pickupPoints.createdAt,
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(pickupPoints)
    .innerJoin(users, eq(pickupPoints.createdBy, users.id))
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(pickupPoints.createdAt));
}

export type PickupPointWithCreator = Awaited<
  ReturnType<typeof getPickupPoints>
>[number];
