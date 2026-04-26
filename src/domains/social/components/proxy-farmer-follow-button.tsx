"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { toggleProxyFarmerFollow } from "../actions/toggle-proxy-farmer-follow";

interface ProxyFarmerFollowButtonProps {
  proxyFarmerId: string;
  isFollowing: boolean;
}

export function ProxyFarmerFollowButton({
  proxyFarmerId,
  isFollowing,
}: ProxyFarmerFollowButtonProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleProxyFarmerFollow(proxyFarmerId);
      router.refresh();
    });
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      onClick={handleToggle}
      isLoading={isPending}
      size="sm"
    >
      {isFollowing ? t("unfollow") : t("follow")}
    </Button>
  );
}
