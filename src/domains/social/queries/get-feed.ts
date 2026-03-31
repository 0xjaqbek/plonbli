import { eq, desc, or, inArray, sql, and } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  posts,
  users,
  groups,
  follows,
  groupMembers,
  reactions,
  comments,
} from "@/shared/db/schema";
import { resolveSharedEntity, type SharedEntityData } from "./resolve-shared-entity";

const POSTS_PER_PAGE = 20;

export async function getFeed(userId: string, page = 1) {
  // Get IDs of users we follow
  const followedUsers = await db
    .select({ id: follows.followeeId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const followedIds = followedUsers.map((f) => f.id);

  // Get IDs of groups we're in
  const myGroups = await db
    .select({ id: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const groupIds = myGroups.map((g) => g.id);

  // Build feed conditions: own posts + followed users' public/followers posts + group posts
  const conditions = [];

  // Own posts
  conditions.push(eq(posts.authorId, userId));

  // Followed users' posts (PUBLIC or FOLLOWERS visibility)
  if (followedIds.length > 0) {
    conditions.push(
      and(
        inArray(posts.authorId, followedIds),
        or(
          eq(posts.visibility, "PUBLIC"),
          eq(posts.visibility, "FOLLOWERS")
        )
      )!
    );
  }

  // Group posts
  if (groupIds.length > 0) {
    conditions.push(
      and(
        inArray(posts.groupId, groupIds),
        eq(posts.visibility, "GROUP")
      )!
    );
  }

  // Also include all PUBLIC posts (global feed)
  conditions.push(eq(posts.visibility, "PUBLIC"));

  const offset = (page - 1) * POSTS_PER_PAGE;

  const feedPosts = await db
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
    .where(or(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(POSTS_PER_PAGE)
    .offset(offset);

  // Get reaction counts and comment counts for each post
  const enriched = await Promise.all(
    feedPosts.map(async (post) => {
      const [{ count: reactionCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(reactions)
        .where(eq(reactions.postId, post.id));

      const [{ count: commentCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(comments)
        .where(eq(comments.postId, post.id));

      // Check if current user liked this post
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

export type FeedPost = Awaited<ReturnType<typeof getFeed>>[number];
