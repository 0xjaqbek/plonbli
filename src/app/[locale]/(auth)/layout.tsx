import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { InstallPromptCard } from "@/domains/notifications/components/install-prompt-card";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">plonbli</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        <Link href="/terms" className="hover:underline">
          {t("termsLink")}
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:underline">
          {t("privacyLink")}
        </Link>
      </p>
      <InstallPromptCard />
    </div>
  );
}
