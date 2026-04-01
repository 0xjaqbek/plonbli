import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { proxyFarmers } from "@/shared/db/schema";
import { ProxyFarmerForm } from "@/domains/marketplace/components/proxy-farmer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function EditProxyFarmerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("proxyFarmer");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const proxyFarmer = await db.query.proxyFarmers.findFirst({
    where: eq(proxyFarmers.id, id),
  });

  if (!proxyFarmer || proxyFarmer.creatorId !== session.user.id) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("editProfile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProxyFarmerForm existing={proxyFarmer} />
        </CardContent>
      </Card>
    </div>
  );
}
