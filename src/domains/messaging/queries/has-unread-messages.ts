import { eq, ne, and, exists } from "drizzle-orm";
import { db } from "@/shared/db";
import { messages } from "@/shared/db/schema/messages";
import { conversationMembers } from "@/shared/db/schema/conversation-members";

export async function hasUnreadMessages(userId: string): Promise<boolean> {
  const result = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        ne(messages.senderId, userId),
        ne(messages.status, "READ"),
        exists(
          db
            .select()
            .from(conversationMembers)
            .where(
              and(
                eq(conversationMembers.conversationId, messages.conversationId),
                eq(conversationMembers.userId, userId)
              )
            )
        )
      )
    )
    .limit(1);

  return result.length > 0;
}
