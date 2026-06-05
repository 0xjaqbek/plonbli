"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { auth } from "../lib/auth";
import { profileSchema, type ProfileInput } from "../schemas/validation";

type UpdateProfileResult =
  | { success: true }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function updateProfile(
  input: ProfileInput
): Promise<UpdateProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const {
    name,
    avatar,
    bio,
    role,
    profileType,
    voivodeship,
    county,
    commune,
    postalCode,
    latitude,
    longitude,
  } = parsed.data;

  await db
    .update(users)
    .set({
      name,
      avatar: avatar ?? null,
      bio: bio ?? null,
      role,
      profileType: profileType ?? null,
      voivodeship: voivodeship ?? null,
      county: county ?? null,
      commune: commune ?? null,
      postalCode: postalCode ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .where(eq(users.id, session.user.id));

  return { success: true };
}
