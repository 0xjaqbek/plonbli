"use client";

import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import type { MessageWithSender } from "../queries/get-messages";

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const initials = message.sender.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[80%]",
        isOwn ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {!isOwn && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={message.sender.avatar ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}
      <div>
        {!isOwn && (
          <p className="text-xs text-muted-foreground mb-1">
            {message.sender.name}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        <p
          className={cn(
            "text-[10px] text-muted-foreground mt-1",
            isOwn ? "text-right" : ""
          )}
        >
          {new Date(message.createdAt).toLocaleTimeString("pl-PL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
