"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { reactions, posts } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildReactionNotification } from "@/domains/notifications/lib/notification-types";

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

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (post && post.authorId !== session.user.id) {
    void sendNotification(
      post.authorId,
      buildReactionNotification(session.user.name ?? "Ktoś", postId)
    );
  }

  return { success: true, liked: true };
}
