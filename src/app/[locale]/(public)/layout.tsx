import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sprout } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/welcome" className="flex items-center gap-2 font-bold text-lg">
            <Sprout className="h-5 w-5 text-primary" />
            plonbli
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <Button asChild size="sm">
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

      <footer className="border-t py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">plonbli</span>
          </div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline">
              {tLegal("termsOfService")}
            </Link>
            <Link href="/privacy" className="hover:underline">
              {tLegal("privacyPolicy")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
