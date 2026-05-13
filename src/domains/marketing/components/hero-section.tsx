import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sprout } from "lucide-react";
import { Button } from "@/shared/ui/button";

export async function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = await getTranslations("landing.hero");

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-20">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-landing-wash -z-10" />

      {/* Blob 1 — top left */}
      <svg
        viewBox="0 0 400 400"
        className="absolute -top-32 -left-32 w-[420px] h-[420px] sm:w-[560px] sm:h-[560px] text-primary opacity-[0.07] -z-10 pointer-events-none"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M196,28 C272,28 348,78 368,158 C388,238 348,318 268,354 C188,390 100,360 62,280 C24,200 52,100 124,60 C148,42 172,28 196,28 Z" />
      </svg>

      {/* Blob 2 — bottom right */}
      <svg
        viewBox="0 0 400 400"
        className="absolute -bottom-24 -right-24 w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] text-primary opacity-[0.05] -z-10 pointer-events-none"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M218,38 C298,58 358,128 358,208 C358,288 298,358 218,368 C138,378 68,318 48,238 C28,158 68,78 148,48 C171,38 194,33 218,38 Z" />
      </svg>

      {/* Blob 3 — center left, tiny accent */}
      <svg
        viewBox="0 0 200 200"
        className="absolute top-1/3 -left-10 w-[180px] h-[180px] text-golden opacity-[0.06] -z-10 pointer-events-none hidden sm:block"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M100,20 C140,20 170,50 175,90 C180,130 155,165 115,175 C75,185 35,160 25,120 C15,80 40,40 80,25 C87,22 93,20 100,20 Z" />
      </svg>

      {/* Content */}
      <div className="relative max-w-3xl mx-auto text-center space-y-7 sm:space-y-8">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
          style={{ animation: "hero-fade-in 0.7s ease both" }}
        >
          <Sprout className="h-3.5 w-3.5 flex-shrink-0" />
          <span>plonbli</span>
        </div>

        <h1
          className="font-display text-[2.8rem] sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
          style={{ animation: "hero-fade-in 0.8s 0.08s ease both" }}
        >
          {t("tagline")}
        </h1>

        <p
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
          style={{ animation: "hero-fade-in 0.8s 0.18s ease both" }}
        >
          {t("subtitle")}
        </p>

        <div
          className="flex flex-col sm:flex-row gap-3 justify-center pt-1"
          style={{ animation: "hero-fade-in 0.8s 0.28s ease both" }}
        >
          {isLoggedIn ? (
            <Button
              asChild
              size="lg"
              className="bg-golden text-golden-foreground hover:bg-golden/90 w-full sm:w-auto"
            >
              <Link href="/home">{t("ctaApp")}</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="lg"
                className="bg-golden text-golden-foreground hover:bg-golden/90 w-full sm:w-auto"
              >
                <Link href="/register">{t("ctaRegister")}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/login">{t("ctaLogin")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
