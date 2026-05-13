import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Button } from "@/shared/ui/button";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { GrainOverlay } from "@/shared/ui/grain-overlay";
import { auth } from "@/domains/auth/lib/auth";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const t = await getTranslations("landing.nav");
  const tLegal = await getTranslations("legal");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GrainOverlay />

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/Plonbli logo nazwa bold Poppins.png"
              alt="plonbli"
              width={140}
              height={40}
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <Button
                asChild
                size="sm"
                className="bg-golden text-golden-foreground hover:bg-golden/90"
              >
                <Link href="/home">{t("goToApp")}</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/login">{t("login")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-landing-dark text-landing-dark-foreground py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm">
          <Link href="/">
            <Image
              src="/Plonbli logo nazwa bold Poppins.png"
              alt="plonbli"
              width={120}
              height={34}
              className="h-7 w-auto brightness-[3] opacity-80"
            />
          </Link>
          <div className="flex gap-6 text-landing-dark-foreground/60">
            <Link
              href="/terms"
              className="hover:text-landing-dark-foreground transition-colors"
            >
              {tLegal("termsOfService")}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-landing-dark-foreground transition-colors"
            >
              {tLegal("privacyPolicy")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
