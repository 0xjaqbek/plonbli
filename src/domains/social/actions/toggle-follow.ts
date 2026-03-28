"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { follows } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type ToggleFollowResult =
  | { success: true; following: boolean }
  | { success: false; error: string };

export async function toggleFollow(
  targetUserId: string
): Promise<ToggleFollowResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  if (session.user.id === targetUserId) {
    return { success: false, error: "Nie mozesz obserwowac samego siebie" };
  }

  const existing = await db.query.follows.findFirst({
    where: and(
      eq(follows.followerId, session.user.id),
      eq(follows.followeeId, targetUserId)
    ),
  });

  if (existing) {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, session.user.id),
          eq(follows.followeeId, targetUserId)
        )
      );
    return { success: true, following: false };
  }

  await db.insert(follows).values({
    followerId: session.user.id,
    followeeId: targetUserId,
  });

  return { success: true, following: true };
}
