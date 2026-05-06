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
      reactionCount: sql<number>`cast(count(distinct ${reactions.userId}) as int)`,
      commentCount: sql<number>`cast(count(distinct ${comments.id}) as int)`,
      liked: sql<boolean>`bool_or(${reactions.userId} = ${userId})`,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(groups, eq(posts.groupId, groups.id))
    .leftJoin(reactions, eq(reactions.postId, posts.id))
    .leftJoin(comments, eq(comments.postId, posts.id))
    .where(or(...conditions))
    .groupBy(posts.id, users.id, groups.id)
    .orderBy(desc(posts.createdAt))
    .limit(POSTS_PER_PAGE)
    .offset(offset);

  // Resolve shared entities (only for posts that have them — typically rare)
  const enriched = await Promise.all(
    feedPosts.map(async (post) => {
      let sharedEntity: SharedEntityData | null = null;
      if (post.sharedEntityType && post.sharedEntityId) {
        sharedEntity = await resolveSharedEntity(
          post.sharedEntityType,
          post.sharedEntityId
        );
      }
      return { ...post, sharedEntity };
    })
  );

  return enriched;
}

export type FeedPost = Awaited<ReturnType<typeof getFeed>>[number];
