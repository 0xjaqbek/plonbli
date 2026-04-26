"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Users, MapPin } from "lucide-react";
import { joinGroup } from "../actions/join-group";
import { trackEvent, EVENTS } from "@/domains/analytics";
import type { GroupDetail } from "../queries/get-group";

interface GroupHeaderProps {
  group: GroupDetail;
  currentUserId: string;
}

export function GroupHeader({ group, currentUserId }: GroupHeaderProps) {
  const t = useTranslations("group");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isCreator = group.creator?.id === currentUserId;

  function handleJoinLeave() {
    startTransition(async () => {
      await joinGroup(group.id);
      if (!group.isMember) {
        trackEvent(EVENTS.GROUP_JOINED, { groupId: group.id });
      }
      router.refresh();
    });
  }

  return (
    <div className="border rounded-lg p-6 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">
              {group.type === "BUYING_GROUP"
                ? t("typeBuyingGroup")
                : t("typeCommunity")}
            </Badge>
            <Badge variant="outline">
              {group.joinPolicy === "OPEN"
                ? t("policyOpen")
                : t("policyInviteOnly")}
            </Badge>
          </div>
        </div>

        {!isCreator && (
          <Button
            variant={group.isMember ? "outline" : "default"}
            onClick={handleJoinLeave}
            isLoading={isPending}
          >
            {group.isMember ? t("leave") : t("join")}
          </Button>
        )}
      </div>

      {group.description && (
        <p className="text-muted-foreground">{group.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {group.memberCount} {t("members")}
        </span>
        {group.voivodeship && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {group.voivodeship}
          </span>
        )}
      </div>
    </div>
  );
}
