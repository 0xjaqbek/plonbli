"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  conversations,
  conversationMembers,
  orders,
  listings,
} from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createConversationSchema,
  type CreateConversationInput,
} from "../schemas/validation";

type CreateConversationResult =
  | { success: true; conversationId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createConversation(
  input: CreateConversationInput
): Promise<CreateConversationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createConversationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { type, name, participantIds, orderId, listingId } = parsed.data;
  const currentUserId = session.user.id;

  // Access control for orderId
  if (orderId) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (
      !order ||
      (order.customerId !== currentUserId && order.farmerId !== currentUserId)
    ) {
      return { success: false, error: "Brak dostępu" };
    }
  }

  // Access control for listingId
  if (listingId) {
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });
    if (!listing) {
      return { success: false, error: "Ogłoszenie nie istnieje" };
    }
  }

  // For DIRECT conversations, check if one already exists with the same context
  if (type === "DIRECT") {
    const otherUserId = participantIds[0];

    const myMemberships = await db.query.conversationMembers.findMany({
      where: eq(conversationMembers.userId, currentUserId),
    });

    for (const membership of myMemberships) {
      const otherMembership = await db.query.conversationMembers.findMany({
        where: and(
          eq(conversationMembers.conversationId, membership.conversationId),
          eq(conversationMembers.userId, otherUserId)
        ),
      });

      if (otherMembership.length > 0) {
        const contextCondition = orderId
          ? eq(conversations.orderId, orderId)
          : listingId
            ? eq(conversations.listingId, listingId)
            : and(isNull(conversations.orderId), isNull(conversations.listingId));

        const conv = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.id, membership.conversationId),
            eq(conversations.type, "DIRECT"),
            contextCondition
          ),
        });

        if (conv) {
          return { success: true, conversationId: conv.id };
        }
      }
    }
  }

  // Create new conversation
  const [conversation] = await db
    .insert(conversations)
    .values({
      type,
      name: name ?? null,
      orderId: orderId ?? null,
      listingId: listingId ?? null,
    })
    .returning({ id: conversations.id });

  // Add all members (including current user)
  const allMemberIds = [currentUserId, ...participantIds];
  await db.insert(conversationMembers).values(
    allMemberIds.map((userId, index) => ({
      conversationId: conversation.id,
      userId,
      role: index === 0 ? ("ADMIN" as const) : ("MEMBER" as const),
    }))
  );

  return { success: true, conversationId: conversation.id };
}
