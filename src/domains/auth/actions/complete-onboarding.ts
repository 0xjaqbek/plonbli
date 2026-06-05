"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { auth, unstable_update } from "@/domains/auth/lib/auth";
import { PROFILE_TYPES } from "../schemas/validation";

const onboardingSchema = z.object({
  profileType: z.enum(PROFILE_TYPES),
  acceptAge: z.literal(true),
});

type CompleteOnboardingResult =
  | { success: true }
  | { success: false; error: string };

export async function completeOnboarding(input: {
  profileType: string;
  acceptAge: boolean;
}): Promise<CompleteOnboardingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane formularza" };
  }

  const now = new Date();
  await db
    .update(users)
    .set({ profileType: parsed.data.profileType, ageConfirmedAt: now })
    .where(eq(users.id, session.user.id));

  await unstable_update({});

  return { success: true };
}
