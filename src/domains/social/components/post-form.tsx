"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { createPost } from "../actions/create-post";

interface PostFormProps {
  groupId?: string;
}

export function PostForm({ groupId }: PostFormProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!content.trim()) return;

    startTransition(async () => {
      const result = await createPost({
        content: content.trim(),
        visibility: groupId ? "GROUP" : "PUBLIC",
        groupId,
      });

      if (result.success) {
        setContent("");
        router.refresh();
      }
    });
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("writePost")}
        rows={3}
      />
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isPending || !content.trim()}
          size="sm"
        >
          {t("publish")}
        </Button>
      </div>
    </div>
  );
}
