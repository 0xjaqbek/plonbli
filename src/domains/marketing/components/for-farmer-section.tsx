import { getTranslations } from "next-intl/server";
import { Banknote, BookOpen, Star, Gift } from "lucide-react";

export async function ForFarmerSection() {
  const t = await getTranslations("landing.forFarmer");

  const benefits = [
    { Icon: Banknote, title: t("benefit1Title"), desc: t("benefit1Desc") },
    { Icon: BookOpen, title: t("benefit2Title"), desc: t("benefit2Desc") },
    { Icon: Star, title: t("benefit3Title"), desc: t("benefit3Desc") },
    { Icon: Gift, title: t("benefit4Title"), desc: t("benefit4Desc") },
  ];

  return (
    <section className="py-20 bg-landing-wash">
      <div className="max-w-5xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {benefits.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex gap-4 items-start p-6 rounded-xl bg-card border border-border/50 shadow-[0_2px_16px_oklch(0.45_0.1_145_/_0.06)] hover:shadow-[0_4px_24px_oklch(0.45_0.1_145_/_0.10)] hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex-shrink-0 rounded-lg bg-golden/15 p-2.5">
                <Icon className="h-5 w-5 text-golden" />
              </div>
              <div>
                <p className="font-display font-semibold text-base">{title}</p>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
