import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getCollection } from "@/domains/logistics/queries/get-collection";
import { CollectionDetail } from "@/domains/logistics/components/collection-detail";
import { CollectionJoinButton } from "@/domains/logistics/components/collection-join-button";
import { StatusUpdateButton } from "./status-update-button";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>;
}) {
  const t = await getTranslations("logistics");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { collectionId } = await params;
  const collection = await getCollection(collectionId);

  if (!collection) {
    notFound();
  }

  const isCoordinator = collection.coordinator.id === session.user.id;
  const hasJoined = collection.items.some(
    (item) => item.userId === session.user!.id
  );

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <CollectionDetail collection={collection} />

      {collection.status === "COLLECTING" && !hasJoined && (
        <CollectionJoinButton collectionId={collectionId} />
      )}

      {isCoordinator && (
        <div className="space-y-2">
          <h3 className="font-medium">{t("updateStatus")}</h3>
          <StatusUpdateButton
            collectionId={collectionId}
            currentStatus={collection.status}
          />
        </div>
      )}
    </div>
  );
}
