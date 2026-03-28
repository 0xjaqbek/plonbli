import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getGroup } from "@/domains/social/queries/get-group";
import { GroupHeader } from "@/domains/social/components/group-header";
import { PostForm } from "@/domains/social/components/post-form";
import { FeedList } from "@/domains/social/components/feed-list";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("group");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const group = await getGroup(id, session.user.id);

  if (!group) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <GroupHeader group={group} currentUserId={session.user.id} />

      {group.isMember && (
        <>
          <h2 className="font-medium">{t("groupBoard")}</h2>
          <PostForm groupId={id} />
          <FeedList
            posts={group.posts}
            currentUserId={session.user.id}
          />
        </>
      )}
    </div>
  );
}
