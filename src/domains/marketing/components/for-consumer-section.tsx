import { getTranslations } from "next-intl/server";
import { ShoppingBasket, Leaf, MessageCircle, Users } from "lucide-react";

export async function ForConsumerSection() {
  const t = await getTranslations("landing.forConsumer");

  const benefits = [
    { Icon: ShoppingBasket, title: t("benefit1Title"), desc: t("benefit1Desc") },
    { Icon: Leaf, title: t("benefit2Title"), desc: t("benefit2Desc") },
    { Icon: MessageCircle, title: t("benefit3Title"), desc: t("benefit3Desc") },
    { Icon: Users, title: t("benefit4Title"), desc: t("benefit4Desc") },
  ];

  return (
    <section className="py-16">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {benefits.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex gap-4 items-start p-4 rounded-lg border bg-card"
            >
              <div className="flex-shrink-0 rounded-md bg-primary/10 p-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
