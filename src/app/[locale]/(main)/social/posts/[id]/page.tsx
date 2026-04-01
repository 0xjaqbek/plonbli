import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getPost } from "@/domains/social/queries/get-post";
import { PostCard } from "@/domains/social/components/post-card";
import { CommentList } from "@/domains/social/components/comment-list";
import { CommentForm } from "@/domains/social/components/comment-form";
import { Button } from "@/shared/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("social");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const post = await getPost(id, session.user.id);

  if (!post) {
    notFound();
  }

  const feedPost = {
    ...post,
    groupId: post.groupId,
    groupName: post.groupName,
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/social">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("feed")}
        </Link>
      </Button>

      <PostCard
        post={feedPost}
        currentUserId={session.user.id}
      />

      <div className="space-y-4">
        <h2 className="font-medium">
          {t("comments")} ({post.commentCount})
        </h2>
        <CommentForm postId={id} />
        <CommentList comments={post.comments} />
      </div>
    </div>
  );
}
