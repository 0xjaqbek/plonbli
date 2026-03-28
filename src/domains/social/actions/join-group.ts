"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { groups, groupMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type JoinGroupResult =
  | { success: true; joined: boolean }
  | { success: false; error: string };

export async function joinGroup(
  groupId: string
): Promise<JoinGroupResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });

  if (!group) {
    return { success: false, error: "Grupa nie istnieje" };
  }

  const existing = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, session.user.id)
    ),
  });

  if (existing) {
    // Leave group (but not if admin/creator)
    if (existing.role === "ADMIN") {
      return { success: false, error: "Admin nie moze opuscic grupy" };
    }
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, session.user.id)
        )
      );
    return { success: true, joined: false };
  }

  if (group.joinPolicy === "INVITE_ONLY") {
    return { success: false, error: "Grupa wymaga zaproszenia" };
  }

  await db.insert(groupMembers).values({
    groupId,
    userId: session.user.id,
    role: "MEMBER",
  });

  return { success: true, joined: true };
}
