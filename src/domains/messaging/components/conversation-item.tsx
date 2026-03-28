"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import type { ConversationWithDetails } from "../queries/get-conversations";

interface ConversationItemProps {
  item: ConversationWithDetails;
  currentUserId: string;
  isActive?: boolean;
}

export function ConversationItem({
  item,
  currentUserId,
  isActive,
}: ConversationItemProps) {
  const t = useTranslations("messaging");
  const { conversation, lastMessage, unreadCount, otherMembers } = item;

  const displayName =
    conversation.type === "DIRECT"
      ? otherMembers[0]?.name ?? t("directConversation")
      : conversation.name ?? t("groupConversation");

  const avatar =
    conversation.type === "DIRECT" ? otherMembers[0]?.avatar : null;

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const lastMessagePreview = lastMessage
    ? lastMessage.senderId === currentUserId
      ? `${t("you")}: ${lastMessage.content}`
      : lastMessage.content
    : null;

  function formatTime(date: Date) {
    const now = new Date();
    const msgDate = new Date(date);
    const diffMs = now.getTime() - msgDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return msgDate.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return t("yesterday");
    return msgDate.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <Link href={`/messages/${conversation.id}`}>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors",
          isActive && "bg-muted",
          unreadCount > 0 && "font-medium"
        )}
      >
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={avatar ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {lastMessage && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatTime(lastMessage.createdAt)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="truncate text-xs text-muted-foreground">
              {lastMessagePreview ?? t("noMessages")}
            </p>
            {unreadCount > 0 && (
              <span className="shrink-0 flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
