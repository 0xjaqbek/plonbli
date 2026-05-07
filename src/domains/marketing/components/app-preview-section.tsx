import { getTranslations } from "next-intl/server";
import { Smartphone } from "lucide-react";

export async function AppPreviewSection() {
  const t = await getTranslations("landing.appPreview");

  return (
    <section className="py-16">
      <div className="max-w-3xl mx-auto px-4 text-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>
        <div className="flex justify-center">
          <div className="relative w-56 h-96 rounded-[2.5rem] border-4 border-foreground/20 bg-muted shadow-xl flex items-center justify-center">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-foreground/20" />
            <Smartphone className="h-16 w-16 text-muted-foreground/30" />
          </div>
        </div>
      </div>
    </section>
  );
}
