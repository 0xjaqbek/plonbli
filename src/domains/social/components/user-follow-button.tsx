"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { toggleFollow } from "../actions/toggle-follow";

interface UserFollowButtonProps {
  targetUserId: string;
  isFollowing: boolean;
}

export function UserFollowButton({
  targetUserId,
  isFollowing,
}: UserFollowButtonProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleFollow(targetUserId);
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
