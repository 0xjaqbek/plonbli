import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getGroups } from "@/domains/social/queries/get-groups";
import { GroupCard } from "@/domains/social/components/group-card";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function GroupsPage() {
  const t = await getTranslations("group");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const groups = await getGroups(session.user.id);
  const myGroups = groups.filter((g) => g.isMember);
  const otherGroups = groups.filter((g) => !g.isMember);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t("groups")}</h1>
        <Button asChild>
          <Link href="/social/groups/create">
            <Plus className="h-4 w-4 mr-2" />
            {t("createGroup")}
          </Link>
        </Button>
      </div>

      {myGroups.length > 0 && (
        <section>
          <h2 className="font-medium mb-3">{t("myGroups")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-medium mb-3">{t("allGroups")}</h2>
        {otherGroups.length === 0 && myGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t("noGroups")}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
