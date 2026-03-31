import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  groups,
  groupMembers,
  users,
  posts,
  reactions,
  comments,
} from "@/shared/db/schema";
import { resolveSharedEntity, type SharedEntityData } from "./resolve-shared-entity";

export async function getGroup(groupId: string, currentUserId?: string) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });

  if (!group) return null;

  // Get creator
  const creator = await db.query.users.findFirst({
    where: eq(users.id, group.createdBy),
  });

  // Get members
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  // Get group posts
  const groupPosts = await db
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
      sharedEntityType: posts.sharedEntityType,
      sharedEntityId: posts.sharedEntityId,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.groupId, groupId))
    .orderBy(desc(posts.createdAt))
    .limit(50);

  // Enrich posts with counts
  const enrichedPosts = await Promise.all(
    groupPosts.map(async (post) => {
      const [{ count: reactionCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(reactions)
        .where(eq(reactions.postId, post.id));

      const [{ count: commentCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(comments)
        .where(eq(comments.postId, post.id));

      let liked = false;
      if (currentUserId) {
        const userReaction = await db.query.reactions.findFirst({
          where: and(
            eq(reactions.postId, post.id),
            eq(reactions.userId, currentUserId)
          ),
        });
        liked = !!userReaction;
      }

      let sharedEntity: SharedEntityData | null = null;
      if (post.sharedEntityType && post.sharedEntityId) {
        sharedEntity = await resolveSharedEntity(post.sharedEntityType, post.sharedEntityId);
      }

      return { ...post, reactionCount, commentCount, liked, groupId: null, groupName: null, sharedEntity };
    })
  );

  const isMember = members.some((m) => m.id === currentUserId);

  return {
    ...group,
    creator: creator
      ? { id: creator.id, name: creator.name, avatar: creator.avatar }
      : null,
    members,
    memberCount: members.length,
    posts: enrichedPosts,
    isMember,
  };
}

export type GroupDetail = NonNullable<Awaited<ReturnType<typeof getGroup>>>;
