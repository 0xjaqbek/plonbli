"use client";

import { useTranslations } from "next-intl";
import { PostCard } from "./post-card";
import type { FeedPost } from "../queries/get-feed";

interface FeedListProps {
  posts: FeedPost[];
  currentUserId: string;
}

export function FeedList({ posts, currentUserId }: FeedListProps) {
  const t = useTranslations("social");

  if (posts.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        {t("noPosts")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
