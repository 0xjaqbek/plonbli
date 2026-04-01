import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getProxyFarmerCount } from "@/domains/marketplace/queries/get-proxy-farmer";
import { ProxyFarmerForm } from "@/domains/marketplace/components/proxy-farmer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function CreateProxyFarmerPage() {
  const t = await getTranslations("proxyFarmer");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const count = await getProxyFarmerCount(session.user.id);

  if (count >= 3) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {t("limitReached")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("createProfile")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("remainingProfiles")}: {3 - count}
          </p>
        </CardHeader>
        <CardContent>
          <ProxyFarmerForm />
        </CardContent>
      </Card>
    </div>
  );
}
