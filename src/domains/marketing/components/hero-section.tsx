import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sprout } from "lucide-react";
import { Button } from "@/shared/ui/button";

export async function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = await getTranslations("landing.hero");

  return (
    <section className="max-w-3xl mx-auto text-center px-4 py-20 space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Sprout className="h-12 w-12 text-primary" />
        </div>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        {t("tagline")}
      </h1>
      <p className="text-xl text-muted-foreground max-w-xl mx-auto">
        {t("subtitle")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        {isLoggedIn ? (
          <Button asChild size="lg">
            <Link href="/">{t("ctaApp")}</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg">
              <Link href="/register">{t("ctaRegister")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">{t("ctaLogin")}</Link>
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
