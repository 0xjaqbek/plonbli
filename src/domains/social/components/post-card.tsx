"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Heart, MessageCircle, Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Textarea } from "@/shared/ui/textarea";
import { toggleReaction } from "../actions/toggle-reaction";
import { deletePost } from "../actions/delete-post";
import { updatePost } from "../actions/update-post";
import type { FeedPost } from "../queries/get-feed";

interface PostCardProps {
  post: FeedPost;
  currentUserId: string;
  onDeleted?: () => void;
}

export function PostCard({ post, currentUserId, onDeleted }: PostCardProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const isOwner = post.author.id === currentUserId;

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
      if (result.success) {
        if (onDeleted) onDeleted();
        router.refresh();
      }
    });
  }

  function handleEdit() {
    setEditContent(post.content);
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditContent(post.content);
  }

  function handleSaveEdit() {
    if (!editContent.trim()) return;
    startTransition(async () => {
      const result = await updatePost({
        postId: post.id,
        content: editContent.trim(),
      });
      if (result.success) {
        setEditing(false);
        router.refresh();
      }
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

        {isOwner && !editing && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
              disabled={isPending}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-1" />
              {t("cancelEdit")}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isPending || !editContent.trim()}
            >
              <Check className="h-4 w-4 mr-1" />
              {t("saveEdit")}
            </Button>
          </div>
        </div>
      ) : (
        <Link href={`/social/posts/${post.id}`}>
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        </Link>
      )}

      {post.images && post.images.length > 0 && (
        <div className={cn(
          "grid gap-1 rounded-md overflow-hidden",
          post.images.length === 1 && "grid-cols-1",
          post.images.length === 2 && "grid-cols-2",
          post.images.length >= 3 && "grid-cols-2 sm:grid-cols-3"
        )}>
          {post.images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-full aspect-square object-cover"
            />
          ))}
        </div>
      )}

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
