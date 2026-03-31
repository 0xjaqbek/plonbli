"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { ImageUpload } from "@/shared/ui/image-upload";
import { createPost } from "../actions/create-post";
import { getSharedEntity } from "../actions/get-shared-entity";
import { SharedEntityPreview } from "./shared-entity-preview";
import type { SharedEntityData } from "../queries/resolve-shared-entity";

interface PostFormProps {
  groupId?: string;
  shareType?: string;
  shareId?: string;
}

export function PostForm({ groupId, shareType, shareId }: PostFormProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [sharedEntity, setSharedEntity] = useState<SharedEntityData | null>(
    null
  );
  const [attachedShare, setAttachedShare] = useState<{
    type: string;
    id: string;
  } | null>(shareType && shareId ? { type: shareType, id: shareId } : null);

  useEffect(() => {
    if (attachedShare) {
      getSharedEntity(attachedShare.type, attachedShare.id).then(
        setSharedEntity
      );
    } else {
      setSharedEntity(null);
    }
  }, [attachedShare]);

  function handleRemoveShare() {
    setAttachedShare(null);
    setSharedEntity(null);
  }

  function handleSubmit() {
    if (!content.trim()) return;

    startTransition(async () => {
      const result = await createPost({
        content: content.trim(),
        images,
        visibility: groupId ? "GROUP" : "PUBLIC",
        groupId,
        sharedEntityType: attachedShare?.type as
          | "FARMER"
          | "EVENT"
          | "CROP_LOG"
          | "PRODUCT"
          | undefined,
        sharedEntityId: attachedShare?.id,
      });

      if (result.success) {
        setContent("");
        setImages([]);
        setAttachedShare(null);
        setSharedEntity(null);
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

      {sharedEntity && (
        <div className="relative">
          <SharedEntityPreview entity={sharedEntity} />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 bg-background/80"
            onClick={handleRemoveShare}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <ImageUpload
        folder="posts"
        maxFiles={5}
        value={images}
        onChange={setImages}
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
