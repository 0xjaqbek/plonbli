"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/shared/db";
import { listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

const availabilitySchema = z.enum(["AVAILABLE", "SEASONAL", "OUT_OF_STOCK"]);

type UpdateAvailabilityResult =
  | { success: true }
  | { success: false; error: string };

export async function updateAvailability(
  listingId: string,
  availability: string
): Promise<UpdateAvailabilityResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = availabilitySchema.safeParse(availability);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowa wartosc dostepnosci" };
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
    with: { product: true },
  });

  if (!listing) {
    return { success: false, error: "Oferta nie istnieje" };
  }

  if (listing.product.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  await db
    .update(listings)
    .set({ availability: parsed.data })
    .where(eq(listings.id, listingId));

  return { success: true };
}
