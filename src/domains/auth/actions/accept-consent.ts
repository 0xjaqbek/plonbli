"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

export async function acceptConsent(): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  const now = new Date();
  await db
    .update(users)
    .set({ termsAcceptedAt: now, privacyAcceptedAt: now })
    .where(eq(users.id, session.user.id));

  return { success: true };
}
