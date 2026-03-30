"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { posts } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { z } from "zod";

const updatePostSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1, "Tresc jest wymagana").max(5000),
});

type UpdatePostResult =
  | { success: true }
  | { success: false; error: string };

export async function updatePost(
  input: z.input<typeof updatePostSchema>
): Promise<UpdatePostResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane" };
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, parsed.data.postId),
  });

  if (!post) {
    return { success: false, error: "Post nie istnieje" };
  }

  if (post.authorId !== session.user.id) {
    return { success: false, error: "Mozesz edytowac tylko swoje posty" };
  }

  await db
    .update(posts)
    .set({ content: parsed.data.content })
    .where(eq(posts.id, parsed.data.postId));

  return { success: true };
}
