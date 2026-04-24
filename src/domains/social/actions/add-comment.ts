"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { comments, posts } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  addCommentSchema,
  type AddCommentInput,
} from "../schemas/validation";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildCommentNotification } from "@/domains/notifications/lib/notification-types";

type AddCommentResult =
  | { success: true; commentId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function addComment(
  input: AddCommentInput
): Promise<AddCommentResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { postId, content } = parsed.data;

  const [comment] = await db
    .insert(comments)
    .values({
      postId,
      authorId: session.user.id,
      content,
    })
    .returning({ id: comments.id });

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (post && post.authorId !== session.user.id) {
    void sendNotification(
      post.authorId,
      buildCommentNotification(session.user.name ?? "Ktoś", postId)
    );
  }

  return { success: true, commentId: comment.id };
}
