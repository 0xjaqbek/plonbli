import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  posts,
  users,
  groups,
  comments,
  reactions,
} from "@/shared/db/schema";
import { resolveSharedEntity } from "./resolve-shared-entity";

export async function getPost(postId: string, currentUserId?: string) {
  const [post] = await db
    .select({
      id: posts.id,
      content: posts.content,
      images: posts.images,
      type: posts.type,
      visibility: posts.visibility,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      groupId: posts.groupId,
      groupName: groups.name,
      sharedEntityType: posts.sharedEntityType,
      sharedEntityId: posts.sharedEntityId,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(groups, eq(posts.groupId, groups.id))
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) return null;

  // Get comments
  const postComments = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));

  // Get reaction count
  const [{ count: reactionCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(reactions)
    .where(eq(reactions.postId, postId));

  // Check if current user liked
  let liked = false;
  if (currentUserId) {
    const userReaction = await db.query.reactions.findFirst({
      where: and(
        eq(reactions.postId, postId),
        eq(reactions.userId, currentUserId)
      ),
    });
    liked = !!userReaction;
  }

  const sharedEntity =
    post.sharedEntityType && post.sharedEntityId
      ? await resolveSharedEntity(post.sharedEntityType, post.sharedEntityId)
      : null;

  return {
    ...post,
    comments: postComments,
    reactionCount,
    commentCount: postComments.length,
    liked,
    sharedEntity,
  };
}

export type PostDetail = NonNullable<Awaited<ReturnType<typeof getPost>>>;
export type PostComment = PostDetail["comments"][number];
