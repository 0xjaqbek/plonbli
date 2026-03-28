"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { posts, groupMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createPostSchema,
  type CreatePostInput,
} from "../schemas/validation";

type CreatePostResult =
  | { success: true; postId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createPost(
  input: CreatePostInput
): Promise<CreatePostResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { content, images, groupId, type, visibility } = parsed.data;

  // If posting to a group, verify membership
  if (groupId) {
    const membership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return { success: false, error: "Nie jestes czlonkiem tej grupy" };
    }
  }

  const [post] = await db
    .insert(posts)
    .values({
      authorId: session.user.id,
      groupId: groupId ?? null,
      content,
      images,
      type,
      visibility: groupId ? "GROUP" : visibility,
    })
    .returning({ id: posts.id });

  return { success: true, postId: post.id };
}
