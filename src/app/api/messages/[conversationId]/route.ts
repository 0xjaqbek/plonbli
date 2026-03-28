import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/shared/db";
import { messages, users, conversationMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const after = request.nextUrl.searchParams.get("after");

  // Verify membership
  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conditions = [eq(messages.conversationId, conversationId)];
  if (after) {
    conditions.push(gt(messages.createdAt, new Date(after)));
  }

  const newMessages = await db
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
    .orderBy(messages.createdAt);

  return NextResponse.json({ messages: newMessages });
}
