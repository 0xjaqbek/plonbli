import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRoundPlus, Check } from "lucide-react";
import { Button } from "@/shared/ui/button";

export async function ProxyFarmerSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = await getTranslations("landing.proxyFarmer");

  const features = [t("feature1"), t("feature2"), t("feature3")];

  return (
    <section className="py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="rounded-2xl border bg-card p-8 md:p-12 space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <UserRoundPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">{t("title")}</h2>
            <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>
          <p className="text-muted-foreground text-center">{t("description")}</p>
          <ul className="space-y-3 max-w-md mx-auto">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-center pt-2">
            {isLoggedIn ? (
              <Button asChild>
                <Link href="/farmers/proxy/create">{t("ctaLoggedIn")}</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/register">{t("ctaGuest")}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
