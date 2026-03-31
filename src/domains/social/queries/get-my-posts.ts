import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  posts,
  users,
  groups,
  reactions,
  comments,
} from "@/shared/db/schema";
import { resolveSharedEntity, type SharedEntityData } from "./resolve-shared-entity";

export async function getMyPosts(userId: string) {
  const myPosts = await db
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
    .where(eq(posts.authorId, userId))
    .orderBy(desc(posts.createdAt));

  const enriched = await Promise.all(
    myPosts.map(async (post) => {
      const [{ count: reactionCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(reactions)
        .where(eq(reactions.postId, post.id));

      const [{ count: commentCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(comments)
        .where(eq(comments.postId, post.id));

      const userReaction = await db.query.reactions.findFirst({
        where: and(
          eq(reactions.postId, post.id),
          eq(reactions.userId, userId)
        ),
      });

      let sharedEntity: SharedEntityData | null = null;
      if (post.sharedEntityType && post.sharedEntityId) {
        sharedEntity = await resolveSharedEntity(
          post.sharedEntityType,
          post.sharedEntityId
        );
      }

      return {
        ...post,
        reactionCount,
        commentCount,
        liked: !!userReaction,
        sharedEntity,
      };
    })
  );

  return enriched;
}
