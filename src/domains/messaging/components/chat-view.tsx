"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Send } from "lucide-react";
import { sendMessage } from "../actions/send-message";
import { markAsRead } from "../actions/mark-as-read";
import { MessageBubble } from "./message-bubble";
import type { MessageWithSender } from "../queries/get-messages";

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageWithSender[];
}

export function ChatView({
  conversationId,
  currentUserId,
  initialMessages,
}: ChatViewProps) {
  const t = useTranslations("messaging");
  const [messageList, setMessageList] =
    useState<MessageWithSender[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark messages as read on mount
  useEffect(() => {
    markAsRead(conversationId);
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList.length]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const lastMsg = messageList[messageList.length - 1];
        const after = lastMsg
          ? new Date(lastMsg.createdAt).toISOString()
          : "";
        const res = await fetch(
          `/api/messages/${conversationId}?after=${after}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length > 0) {
            setMessageList((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMsgs = data.messages.filter(
                (m: MessageWithSender) => !existingIds.has(m.id)
              );
              return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
            });
            markAsRead(conversationId);
          }
        }
      } catch {
        // Polling failure is non-critical
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId, messageList]);

  function handleSend() {
    const content = input.trim();
    if (!content) return;

    setInput("");

    // Optimistic update
    const optimisticMessage: MessageWithSender = {
      id: `temp-${Date.now()}`,
      content,
      images: [],
      status: "SENT",
      createdAt: new Date(),
      sender: {
        id: currentUserId,
        name: "",
        avatar: null,
      },
    };
    setMessageList((prev) => [...prev, optimisticMessage]);

    startTransition(async () => {
      const result = await sendMessage({
        conversationId,
        content,
      });

      if (result.success) {
        // Replace temp ID with real message ID so polling dedup works correctly
        setMessageList((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id ? { ...m, id: result.messageId } : m
          )
        );
      } else {
        setMessageList((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id)
        );
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 min-h-0 p-4">
        {messageList.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t("noMessages")}
          </p>
        ) : (
          <div className="space-y-3">
            {messageList.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender.id === currentUserId}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            disabled={isPending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isPending || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
