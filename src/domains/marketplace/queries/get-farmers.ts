import { or, eq, and, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import type { SearchFarmersInput } from "../schemas/validation";

export async function getFarmers(filters: SearchFarmersInput = {}) {
  const roleCondition = or(eq(users.role, "FARMER"), eq(users.role, "BOTH"))!;
  const conditions = [roleCondition];

  if (filters.voivodeship) {
    conditions.push(eq(users.voivodeship, filters.voivodeship));
  }
  if (filters.county) {
    conditions.push(eq(users.county, filters.county));
  }
  if (filters.commune) {
    conditions.push(eq(users.commune, filters.commune));
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      voivodeship: users.voivodeship,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt));
}

export type FarmerItem = Awaited<ReturnType<typeof getFarmers>>[number];
