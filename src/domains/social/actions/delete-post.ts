"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { posts } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type DeletePostResult =
  | { success: true }
  | { success: false; error: string };

export async function deletePost(
  postId: string
): Promise<DeletePostResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    return { success: false, error: "Post nie istnieje" };
  }

  if (post.authorId !== session.user.id) {
    return { success: false, error: "Mozesz usuwac tylko swoje posty" };
  }

  await db.delete(posts).where(eq(posts.id, postId));

  return { success: true };
}
