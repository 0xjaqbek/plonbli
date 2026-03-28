"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { reactions } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type ToggleReactionResult =
  | { success: true; liked: boolean }
  | { success: false; error: string };

export async function toggleReaction(
  postId: string
): Promise<ToggleReactionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const existing = await db.query.reactions.findFirst({
    where: and(
      eq(reactions.postId, postId),
      eq(reactions.userId, session.user.id)
    ),
  });

  if (existing) {
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.postId, postId),
          eq(reactions.userId, session.user.id)
        )
      );
    return { success: true, liked: false };
  }

  await db.insert(reactions).values({
    postId,
    userId: session.user.id,
  });

  return { success: true, liked: true };
}
