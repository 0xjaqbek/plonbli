"use server";

import { eq, and, ne } from "drizzle-orm";
import { db } from "@/shared/db";
import { messages, conversationMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

export async function markAsRead(
  conversationId: string
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false };
  }

  // Verify membership
  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return { success: false };
  }

  // Mark all messages in this conversation as READ (except own messages)
  await db
    .update(messages)
    .set({ status: "READ" })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, session.user.id),
        ne(messages.status, "READ")
      )
    );

  return { success: true };
}
