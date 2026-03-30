"use server";

import { eq, and, isNull, isNotNull, or } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { geocodeLocation } from "../geocode";

/**
 * Geocode farmers that have commune/county/voivodeship but no lat/lng.
 * Saves results to DB so it only runs once per farmer.
 * Called server-side on map page load.
 */
export async function geocodeFarmersWithoutCoords() {
  const farmersToGeocode = await db
    .select({
      id: users.id,
      commune: users.commune,
      county: users.county,
      voivodeship: users.voivodeship,
    })
    .from(users)
    .where(
      and(
        or(eq(users.role, "FARMER"), eq(users.role, "BOTH")),
        isNull(users.latitude),
        or(
          isNotNull(users.commune),
          isNotNull(users.county),
          isNotNull(users.voivodeship)
        )
      )
    );

  for (const farmer of farmersToGeocode) {
    const result = await geocodeLocation({
      commune: farmer.commune,
      county: farmer.county,
      voivodeship: farmer.voivodeship,
    });

    if (result) {
      await db
        .update(users)
        .set({ latitude: result.latitude, longitude: result.longitude })
        .where(eq(users.id, farmer.id));
    }
  }
}
