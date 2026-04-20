import { eq, desc, and, ne, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  conversations,
  conversationMembers,
  messages,
  users,
} from "@/shared/db/schema";

export type ConversationContext =
  | { type: "ORDER"; label: string }
  | { type: "LISTING"; label: string }
  | null;

export async function getConversations(userId: string) {
  // Get all conversations the user is a member of
  const memberships = await db
    .select({
      conversationId: conversationMembers.conversationId,
      muted: conversationMembers.muted,
    })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  if (memberships.length === 0) return [];

  const mutedMap = new Map(
    memberships.map((m) => [m.conversationId, m.muted])
  );

  const results = [];

  for (const membership of memberships) {
    const convId = membership.conversationId;

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, convId),
      with: {
        order: { columns: { orderNumber: true } },
        listing: {
          columns: { price: true },
          with: {
            product: { columns: { name: true } },
          },
        },
      },
    });

    if (!conv) continue;

    // Get last message
    const [lastMessage] = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        senderName: users.name,
        createdAt: messages.createdAt,
        status: messages.status,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, convId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    // Get unread count
    const [{ count: unreadCount }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, convId),
          ne(messages.senderId, userId),
          ne(messages.status, "READ")
        )
      );

    // Get other members
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      })
      .from(conversationMembers)
      .innerJoin(users, eq(conversationMembers.userId, users.id))
      .where(
        and(
          eq(conversationMembers.conversationId, convId),
          ne(conversationMembers.userId, userId)
        )
      );

    // Build context
    let context: ConversationContext = null;
    if (conv.order) {
      context = { type: "ORDER", label: `#${conv.order.orderNumber}` };
    } else if (conv.listing) {
      context = { type: "LISTING", label: conv.listing.product.name };
    }

    const { order: _order, listing: _listing, ...conversationBase } = conv;

    results.push({
      conversation: conversationBase,
      lastMessage: lastMessage ?? null,
      unreadCount,
      muted: mutedMap.get(convId) ?? false,
      otherMembers: members,
      context,
    });
  }

  // Sort by last message time (most recent first)
  results.sort((a, b) => {
    const aTime =
      a.lastMessage?.createdAt?.getTime() ??
      a.conversation.createdAt.getTime();
    const bTime =
      b.lastMessage?.createdAt?.getTime() ??
      b.conversation.createdAt.getTime();
    return bTime - aTime;
  });

  return results;
}

export type ConversationWithDetails = Awaited<
  ReturnType<typeof getConversations>
>[number];
