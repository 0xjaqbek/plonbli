import { eq, desc, lt, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { messages, users } from "@/shared/db/schema";

const MESSAGES_PER_PAGE = 50;

export async function getMessages(
  conversationId: string,
  cursor?: string
) {
  const conditions = [eq(messages.conversationId, conversationId)];

  if (cursor) {
    conditions.push(lt(messages.createdAt, new Date(cursor)));
  }

  const results = await db
    .select({
      id: messages.id,
      content: messages.content,
      images: messages.images,
      status: messages.status,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(MESSAGES_PER_PAGE + 1);

  const hasMore = results.length > MESSAGES_PER_PAGE;
  const items = hasMore
    ? results.slice(0, MESSAGES_PER_PAGE)
    : results;

  return {
    messages: items.reverse(),
    hasMore,
    nextCursor: hasMore ? items[0].createdAt.toISOString() : null,
  };
}

export type MessageWithSender = Awaited<
  ReturnType<typeof getMessages>
>["messages"][number];
