"use server";

import { eq, and, ne } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  messages,
  conversations,
  conversationMembers,
} from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  sendMessageSchema,
  type SendMessageInput,
} from "../schemas/validation";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildMessageNotification } from "@/domains/notifications/lib/notification-types";

type SendMessageResult =
  | { success: true; messageId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { conversationId, content, images } = parsed.data;

  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return { success: false, error: "Nie jestes czlonkiem tej rozmowy" };
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId: session.user.id,
      content,
      images,
    })
    .returning({ id: messages.id, createdAt: messages.createdAt });

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // Notify other members (fire-and-forget)
  const otherMembers = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        ne(conversationMembers.userId, session.user.id)
      )
    );

  for (const { userId } of otherMembers) {
    void sendNotification(
      userId,
      buildMessageNotification(session.user.name ?? "Ktoś", content, conversationId)
    );
  }

  return { success: true, messageId: message.id };
}
