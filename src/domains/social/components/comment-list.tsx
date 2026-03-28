"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import Link from "next/link";
import type { PostComment } from "../queries/get-post";

interface CommentListProps {
  comments: PostComment[];
}

export function CommentList({ comments }: CommentListProps) {
  const t = useTranslations("social");

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("noComments")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const initials = comment.author.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <div key={comment.id} className="flex gap-3">
            <Link href={`/social/users/${comment.author.id}`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.author.avatar ?? undefined} />
                <AvatarFallback className="text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="bg-muted rounded-lg px-3 py-2">
                <p className="text-xs font-medium">
                  {comment.author.name}
                </p>
                <p className="text-sm">{comment.content}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                {new Date(comment.createdAt).toLocaleString("pl-PL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
