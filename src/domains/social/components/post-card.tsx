"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { toggleReaction } from "../actions/toggle-reaction";
import { deletePost } from "../actions/delete-post";
import type { FeedPost } from "../queries/get-feed";

interface PostCardProps {
  post: FeedPost;
  currentUserId: string;
  onDeleted?: () => void;
}

export function PostCard({ post, currentUserId, onDeleted }: PostCardProps) {
  const t = useTranslations("social");
  const [isPending, startTransition] = useTransition();

  const initials = post.author.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleLike() {
    startTransition(async () => {
      await toggleReaction(post.id);
    });
  }

  function handleDelete() {
    if (!confirm(t("confirmDelete"))) return;
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (result.success && onDeleted) onDeleted();
    });
  }

  function formatTime(date: Date) {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return `${Math.max(1, Math.floor(diff / (1000 * 60)))} min`;
    if (hours < 24) return `${hours}h`;
    return new Date(date).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Link
          href={`/social/users/${post.author.id}`}
          className="flex items-center gap-3"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.avatar ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{post.author.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(post.createdAt)}
              </span>
              {post.groupName && (
                <Badge variant="outline" className="text-[10px]">
                  {post.groupName}
                </Badge>
              )}
            </div>
          </div>
        </Link>

        {post.author.id === currentUserId && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Link href={`/social/posts/${post.id}`}>
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      </Link>

      <div className="flex items-center gap-4 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1", post.liked && "text-red-500")}
          onClick={handleLike}
          disabled={isPending}
        >
          <Heart
            className={cn("h-4 w-4", post.liked && "fill-current")}
          />
          <span className="text-xs">{post.reactionCount}</span>
        </Button>

        <Button variant="ghost" size="sm" className="gap-1" asChild>
          <Link href={`/social/posts/${post.id}`}>
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{post.commentCount}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
