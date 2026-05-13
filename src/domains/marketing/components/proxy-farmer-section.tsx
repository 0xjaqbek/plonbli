import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRoundPlus, Check } from "lucide-react";
import { Button } from "@/shared/ui/button";

export async function ProxyFarmerSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = await getTranslations("landing.proxyFarmer");

  const features = [t("feature1"), t("feature2"), t("feature3")];

  return (
    <section className="py-20 bg-landing-dark text-landing-dark-foreground">
      <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
        <div className="inline-flex items-center justify-center rounded-full bg-white/10 p-4">
          <UserRoundPlus className="h-8 w-8 text-golden" />
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            {t("title")}
          </h2>
          <p className="text-lg text-landing-dark-foreground/80">{t("subtitle")}</p>
        </div>
        <p className="text-landing-dark-foreground/70 max-w-xl mx-auto leading-relaxed">
          {t("description")}
        </p>
        <ul className="space-y-3 max-w-md mx-auto text-left">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-full bg-golden/20 p-0.5 mt-0.5">
                <Check className="h-4 w-4 text-golden" />
              </div>
              <span className="text-sm text-landing-dark-foreground/80 leading-relaxed">
                {feature}
              </span>
            </li>
          ))}
        </ul>
        <div className="pt-2">
          {isLoggedIn ? (
            <Button
              asChild
              className="bg-golden text-golden-foreground hover:bg-golden/90"
            >
              <Link href="/farmers/proxy/create">{t("ctaLoggedIn")}</Link>
            </Button>
          ) : (
            <Button
              asChild
              className="bg-golden text-golden-foreground hover:bg-golden/90"
            >
              <Link href="/register">{t("ctaGuest")}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
