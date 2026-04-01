import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { CollectionForm } from "@/domains/logistics/components/collection-form";

export default async function CreateCollectionPage({
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

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("createCollection")}</h1>
      <CollectionForm groupId={id} />
    </div>
  );
}
