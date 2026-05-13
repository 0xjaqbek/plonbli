import { getTranslations } from "next-intl/server";

export async function AppPreviewSection() {
  const t = await getTranslations("landing.appPreview");

  return (
    <section className="py-20 bg-landing-wash">
      <div className="max-w-3xl mx-auto px-4 text-center space-y-10">
        <div className="space-y-3">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>
        {/* CSS-only phone mockup */}
        <div className="flex justify-center">
          <div className="relative w-52 h-[420px] rounded-[2.8rem] border-[3px] border-foreground/20 bg-landing-dark shadow-[0_24px_64px_oklch(0.28_0.08_145_/_0.30)] overflow-hidden">
            {/* Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-1.5 rounded-full bg-white/20 z-10" />
            {/* Screen content */}
            <div className="absolute inset-0 bg-gradient-to-b from-landing-dark to-[oklch(0.20_0.06_145)] pt-8 px-3 space-y-2.5">
              {/* Status row */}
              <div className="h-1.5 w-3/4 rounded-full bg-white/10 mt-1 mx-auto" />
              {/* Header bar */}
              <div className="h-7 w-full rounded-lg bg-white/10 mt-2" />
              {/* Cards */}
              <div className="space-y-2 mt-3">
                <div className="h-20 w-full rounded-xl bg-white/10" />
                <div className="h-20 w-full rounded-xl bg-white/[0.07]" />
                <div className="h-16 w-full rounded-xl bg-white/[0.05]" />
              </div>
              {/* Bottom nav */}
              <div className="absolute bottom-3 left-3 right-3 h-10 rounded-2xl bg-white/12 flex items-center justify-around px-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-white/25" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
