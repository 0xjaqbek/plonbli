"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { pushSubscriptions } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  savePushTokenSchema,
  type SavePushTokenInput,
} from "../schemas/validation";

type DeletePushTokenResult = { success: true } | { success: false; error: string };

export async function deletePushToken(
  input: SavePushTokenInput
): Promise<DeletePushTokenResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = savePushTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidłowy token" };
  }

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.fcmToken, parsed.data.fcmToken)
      )
    );

  return { success: true };
}
