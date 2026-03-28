"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ConversationItem } from "./conversation-item";
import { NewConversationDialog } from "./new-conversation-dialog";
import type { ConversationWithDetails } from "../queries/get-conversations";

interface ConversationListProps {
  initialConversations: ConversationWithDetails[];
  currentUserId: string;
  activeConversationId?: string;
  users: { id: string; name: string; avatar: string | null }[];
}

export function ConversationList({
  initialConversations,
  currentUserId,
  activeConversationId,
  users,
}: ConversationListProps) {
  const t = useTranslations("messaging");
  const [conversationsList, setConversationsList] = useState(
    initialConversations
  );

  // Poll for conversation updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversationsList(data.conversations);
        }
      } catch {
        // Polling failure is non-critical
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold">{t("conversations")}</h2>
        <NewConversationDialog users={users} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversationsList.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 px-4">
            {t("noConversations")}
          </p>
        ) : (
          <div className="p-2 space-y-1">
            {conversationsList.map((item) => (
              <ConversationItem
                key={item.conversation.id}
                item={item}
                currentUserId={currentUserId}
                isActive={
                  item.conversation.id === activeConversationId
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
