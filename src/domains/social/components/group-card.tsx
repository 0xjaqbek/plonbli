import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Users } from "lucide-react";
import type { GroupWithDetails } from "../queries/get-groups";

interface GroupCardProps {
  group: GroupWithDetails;
}

export function GroupCard({ group }: GroupCardProps) {
  const t = useTranslations("group");

  return (
    <Link href={`/social/groups/${group.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{group.name}</CardTitle>
            <Badge variant="secondary">
              {group.type === "BUYING_GROUP"
                ? t("typeBuyingGroup")
                : t("typeCommunity")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {group.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>
              {group.memberCount} {t("members")}
            </span>
            {group.isMember && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                {t("members")}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
