"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { compressImage } from "@/shared/lib/compress-image";
import { getUploadUrl } from "@/shared/actions/get-upload-url";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ImageUploadProps {
  folder: string;
  maxFiles: number;
  value: string[];
  onChange: (urls: string[]) => void;
  onUploaded?: (assets: UploadedImage[]) => void;
  onRemove?: (url: string) => void;
}

export type UploadedImage = {
  url: string;
  sha256: string;
};

async function hashBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function ImageUpload({
  folder,
  maxFiles,
  value,
  onChange,
  onUploaded,
  onRemove,
}: ImageUploadProps) {
  const t = useTranslations("images");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAdd = value.length < maxFiles;

  const uploadFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert(t("invalidType"));
        return null;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(t("tooLarge"));
        return null;
      }

      setProgress(10);

      // Compress
      const compressed = await compressImage(file);
      const sha256 = await hashBlob(compressed);
      setProgress(40);

      // Get signed URL
      const result = await getUploadUrl(folder, compressed.type);
      if (!result.success) {
        alert(result.error);
        return null;
      }
      setProgress(50);

      // Upload directly to Supabase
      const response = await fetch(result.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": compressed.type },
        body: compressed,
      });

      if (!response.ok) {
        alert(t("uploadFailed"));
        return null;
      }

      setProgress(100);
      return { url: result.publicUrl, sha256 } satisfies UploadedImage;
    },
    [folder, t]
  );

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const remaining = maxFiles - value.length;
    const toUpload = fileArray.slice(0, remaining);

    if (toUpload.length === 0) return;

    setUploading(true);
    const uploadedAssets: UploadedImage[] = [];

    for (const file of toUpload) {
      const asset = await uploadFile(file);
      if (asset) uploadedAssets.push(asset);
    }

    if (uploadedAssets.length > 0) {
      onChange([...value, ...uploadedAssets.map((asset) => asset.url)]);
      onUploaded?.(uploadedAssets);
    }

    setUploading(false);
    setProgress(0);
  }

  function handleRemove(index: number) {
    onRemove?.(value[index]);
    onChange(value.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (canAdd && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-2">
      {/* Thumbnails */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative group h-20 w-20">
              <img
                src={url}
                alt=""
                className="h-20 w-20 rounded-md object-cover border"
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canAdd && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            "hover:border-primary hover:bg-accent/50",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple={maxFiles > 1}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
              <p className="text-xs">{t("dropOrClick")}</p>
              <p className="text-[10px]">
                {t("maxSize")} &middot;{" "}
                {value.length}/{maxFiles}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
