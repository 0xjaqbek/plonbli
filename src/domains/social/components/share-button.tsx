"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface ShareButtonProps {
  entityType: "FARMER" | "EVENT" | "CROP_LOG" | "PRODUCT" | "PROXY_FARMER";
  entityId: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
}

export function ShareButton({
  entityType,
  entityId,
  variant = "outline",
  size = "sm",
}: ShareButtonProps) {
  const t = useTranslations("social");
  const router = useRouter();

  function handleShare() {
    router.push(`/social?shareType=${entityType}&shareId=${entityId}`);
  }

  return (
    <Button variant={variant} size={size} onClick={handleShare} className="gap-1.5">
      <Share2 className="h-4 w-4" />
      {size !== "icon" && t("share")}
    </Button>
  );
}
