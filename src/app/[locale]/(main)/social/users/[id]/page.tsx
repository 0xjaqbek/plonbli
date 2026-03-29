import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { auth } from "@/domains/auth/lib/auth";
import { getUserProfile } from "@/domains/social/queries/get-user-profile";
import { UserFollowButton } from "@/domains/social/components/user-follow-button";
import { FeedList } from "@/domains/social/components/feed-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("social");
  const tRep = await getTranslations("reputation");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const profile = await getUserProfile(id, session.user.id);

  if (!profile) {
    notFound();
  }

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const isOwnProfile = session.user.id === id;

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar ?? undefined} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
            <span>
              <strong>{profile.followerCount}</strong> {t("followers")}
            </span>
            <span>
              <strong>{profile.followingCount}</strong> {t("following")}
            </span>
          </div>
        </div>
        {!isOwnProfile && (
          <UserFollowButton
            targetUserId={id}
            isFollowing={profile.isFollowing}
          />
        )}
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/social/users/${id}/reviews`}>
            <Star className="h-4 w-4 mr-1" />
            {tRep("reviews")}
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="font-medium mb-3">{t("posts")}</h2>
        <FeedList posts={profile.posts} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
