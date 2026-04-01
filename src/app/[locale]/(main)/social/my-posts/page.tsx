import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getMyPosts } from "@/domains/social/queries/get-my-posts";
import { FeedList } from "@/domains/social/components/feed-list";

export default async function MyPostsPage() {
  const t = await getTranslations("social");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const posts = await getMyPosts(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("myPosts")}</h1>
      <FeedList posts={posts} currentUserId={session.user.id} />
    </div>
  );
}
