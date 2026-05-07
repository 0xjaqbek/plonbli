import { getTranslations } from "next-intl/server";
import { ShoppingBasket, Rss, Users, MessageCircle, BookOpen, Star } from "lucide-react";

export async function FeaturesSection() {
  const t = await getTranslations("landing.features");

  const features = [
    { Icon: ShoppingBasket, title: t("marketplaceTitle"), desc: t("marketplaceDesc") },
    { Icon: Rss, title: t("socialTitle"), desc: t("socialDesc") },
    { Icon: Users, title: t("groupsTitle"), desc: t("groupsDesc") },
    { Icon: MessageCircle, title: t("chatTitle"), desc: t("chatDesc") },
    { Icon: BookOpen, title: t("cropLogTitle"), desc: t("cropLogDesc") },
    { Icon: Star, title: t("reputationTitle"), desc: t("reputationDesc") },
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        <h2 className="text-3xl font-bold text-center">{t("title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-5 space-y-2">
              <div className="rounded-md bg-primary/10 w-fit p-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
