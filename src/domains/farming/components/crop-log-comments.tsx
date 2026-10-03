"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addCropLogCommentAction } from "../actions/add-crop-log-comment";
import type { CropLogCommentView } from "../queries/get-crop-log-comments";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

export function CropLogComments({
  cropLogId,
  comments,
  canComment,
}: {
  cropLogId: string;
  comments: CropLogCommentView[];
  canComment: boolean;
}) {
  const t = useTranslations("farming");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const result = await addCropLogCommentAction(cropLogId, content);
      if (result.error) setError(result.error);
      else {
        setContent("");
        router.refresh();
      }
    } catch {
      setError(t("entryCommentError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-sm font-medium">{t("entryComments")}</p>
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">{comment.author.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleDateString("pl-PL")}
          </span>
          <p className="mt-1 whitespace-pre-wrap">{comment.content}</p>
        </div>
      ))}
      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("noEntryComments")}</p>
      )}
      {canComment && (
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            placeholder={t("entryCommentPlaceholder")}
            aria-label={t("entryCommentPlaceholder")}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            size="sm"
            disabled={pending || content.trim().length === 0}
            onClick={submit}
          >
            {pending ? t("entryCommentSending") : t("entryCommentSend")}
          </Button>
        </div>
      )}
    </div>
  );
}
