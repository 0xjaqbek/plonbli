import { or, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";

export async function getFarmersForMap() {
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
    .where(or(eq(users.role, "FARMER"), eq(users.role, "BOTH")));
}

export type FarmerForMap = Awaited<ReturnType<typeof getFarmersForMap>>[number];
