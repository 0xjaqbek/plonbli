import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getFeed } from "@/domains/social/queries/get-feed";
import { PostForm } from "@/domains/social/components/post-form";
import { FeedList } from "@/domains/social/components/feed-list";

interface SocialFeedPageProps {
  searchParams: Promise<{ shareType?: string; shareId?: string }>;
}

export default async function SocialFeedPage({
  searchParams,
}: SocialFeedPageProps) {
  const t = await getTranslations("social");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { shareType, shareId } = await searchParams;
  const posts = await getFeed(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("feed")}</h1>
      <PostForm shareType={shareType} shareId={shareId} />
      <FeedList posts={posts} currentUserId={session.user.id} />
    </div>
  );
}
