import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getCollectionsByGroup } from "@/domains/logistics/queries/get-collections";
import { CollectionCard } from "@/domains/logistics/components/collection-card";
import { Button } from "@/shared/ui/button";

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("logistics");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const collections = await getCollectionsByGroup(id);

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("collections")}</h1>
        <Link href={`/social/groups/${id}/collections/create`}>
          <Button>{t("createCollection")}</Button>
        </Link>
      </div>

      {collections.length === 0 ? (
        <p className="text-muted-foreground">{t("noCollections")}</p>
      ) : (
        <div className="grid gap-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              groupId={id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
