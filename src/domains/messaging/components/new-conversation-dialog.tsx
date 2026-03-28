"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Plus } from "lucide-react";
import { createConversation } from "../actions/create-conversation";

interface UserSearchResult {
  id: string;
  name: string;
  avatar: string | null;
}

interface NewConversationDialogProps {
  users: UserSearchResult[];
}

export function NewConversationDialog({
  users: allUsers,
}: NewConversationDialogProps) {
  const t = useTranslations("messaging");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = allUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelectUser(userId: string) {
    startTransition(async () => {
      const result = await createConversation({
        type: "DIRECT",
        participantIds: [userId],
      });

      if (result.success) {
        setOpen(false);
        router.push(`/messages/${result.conversationId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t("newConversation")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("startConversation")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder={t("searchUsers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("searchUsers")}
              </p>
            ) : (
              filtered.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <span className="text-sm">{user.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
