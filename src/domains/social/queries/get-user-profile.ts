import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  users,
  posts,
  follows,
  reactions,
  comments,
} from "@/shared/db/schema";

export async function getUserProfile(
  userId: string,
  currentUserId?: string
) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return null;

  // Get follower/following counts
  const [{ count: followerCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(follows)
    .where(eq(follows.followeeId, userId));

  const [{ count: followingCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(follows)
    .where(eq(follows.followerId, userId));

  // Check if current user follows this user
  let isFollowing = false;
  if (currentUserId && currentUserId !== userId) {
    const follow = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, currentUserId),
        eq(follows.followeeId, userId)
      ),
    });
    isFollowing = !!follow;
  }

  // Get user's public posts
  const userPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      images: posts.images,
      type: posts.type,
      visibility: posts.visibility,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(
      and(eq(posts.authorId, userId), eq(posts.visibility, "PUBLIC"))
    )
    .orderBy(desc(posts.createdAt))
    .limit(20);

  const enrichedPosts = await Promise.all(
    userPosts.map(async (post) => {
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

      return {
        ...post,
        reactionCount,
        commentCount,
        liked,
        author: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
        },
        groupId: null,
        groupName: null,
      };
    })
  );

  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    voivodeship: user.voivodeship,
    commune: user.commune,
    createdAt: user.createdAt,
    followerCount,
    followingCount,
    isFollowing,
    posts: enrichedPosts,
  };
}

export type UserProfile = NonNullable<
  Awaited<ReturnType<typeof getUserProfile>>
>;
