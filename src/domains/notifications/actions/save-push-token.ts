"use server";

import { db } from "@/shared/db";
import { pushSubscriptions, notificationPreferences } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  savePushTokenSchema,
  type SavePushTokenInput,
} from "../schemas/validation";

type SavePushTokenResult = { success: true } | { success: false; error: string };

export async function savePushToken(
  input: SavePushTokenInput
): Promise<SavePushTokenResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = savePushTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidłowy token" };
  }

  await db
    .insert(pushSubscriptions)
    .values({ userId: session.user.id, fcmToken: parsed.data.fcmToken })
    .onConflictDoNothing();

  await db
    .insert(notificationPreferences)
    .values({ userId: session.user.id })
    .onConflictDoNothing();

  return { success: true };
}
