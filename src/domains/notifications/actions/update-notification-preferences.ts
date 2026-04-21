"use server";

import { db } from "@/shared/db";
import { notificationPreferences } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  updatePreferencesSchema,
  type UpdatePreferencesInput,
} from "../schemas/validation";

type UpdatePrefsResult = { success: true } | { success: false; error: string };

export async function updateNotificationPreferences(
  input: UpdatePreferencesInput
): Promise<UpdatePrefsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = updatePreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidłowe dane" };
  }

  await db
    .insert(notificationPreferences)
    .values({ userId: session.user.id, ...parsed.data })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: parsed.data,
    });

  return { success: true };
}
