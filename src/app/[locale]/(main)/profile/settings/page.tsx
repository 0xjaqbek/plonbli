import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users, notificationPreferences } from "@/shared/db/schema";
import { ProfileForm } from "@/domains/auth/components/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { NotificationSettings } from "@/domains/notifications/components/notification-settings";

export default async function SettingsPage() {
  const t = await getTranslations("profile");
  const tNotif = await getTranslations("notifications");
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, prefs] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
    db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, session.user.id),
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/profile">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("title")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tNotif("settingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettings preferences={prefs ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
