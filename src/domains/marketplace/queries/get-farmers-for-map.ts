import { or, eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import type { SearchFarmersInput } from "../schemas/validation";

export async function getFarmersForMap(filters: SearchFarmersInput = {}) {
  const roleCondition = or(eq(users.role, "FARMER"), eq(users.role, "BOTH"))!;
  const conditions = [roleCondition];

  if (filters.voivodeship) conditions.push(eq(users.voivodeship, filters.voivodeship));
  if (filters.county) conditions.push(eq(users.county, filters.county));
  if (filters.commune) conditions.push(eq(users.commune, filters.commune));

  return db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      latitude: users.latitude,
      longitude: users.longitude,
      voivodeship: users.voivodeship,
      county: users.county,
      commune: users.commune,
    })
    .from(users)
    .where(and(...conditions));
}

export type FarmerForMap = Awaited<ReturnType<typeof getFarmersForMap>>[number];
