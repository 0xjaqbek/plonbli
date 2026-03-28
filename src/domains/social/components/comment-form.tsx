"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Send } from "lucide-react";
import { addComment } from "../actions/add-comment";

interface CommentFormProps {
  postId: string;
}

export function CommentForm({ postId }: CommentFormProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!content.trim()) return;

    startTransition(async () => {
      const result = await addComment({
        postId,
        content: content.trim(),
      });

      if (result.success) {
        setContent("");
        router.refresh();
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("addComment")}
        disabled={isPending}
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={isPending || !content.trim()}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
