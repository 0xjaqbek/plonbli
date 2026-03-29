import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import {
  ShoppingBasket,
  Leaf,
  Star,
  Users,
  ChevronRight,
} from "lucide-react";
import { auth, signOut } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { ProfileForm } from "@/domains/auth/components/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const tAuth = await getTranslations("auth");
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) redirect("/login");

  const isFarmer = user.role === "FARMER" || user.role === "BOTH";

  const quickLinks = [
    ...(isFarmer
      ? [
          {
            href: "/marketplace?mine=1",
            icon: ShoppingBasket,
            label: t("myListings"),
          },
          {
            href: `/farmers/${user.id}/crop-log`,
            icon: Leaf,
            label: t("myCropLog"),
          },
        ]
      : []),
    {
      href: `/social/users/${user.id}/reviews`,
      icon: Star,
      label: t("myReviews"),
    },
    {
      href: "/social/groups",
      icon: Users,
      label: t("myGroups"),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card>
        <CardContent className="pt-6">
          <nav className="space-y-1">
            {quickLinks.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
              >
                <span className="flex items-center gap-3 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </nav>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
          <Separator className="my-6" />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-destructive hover:underline"
            >
              {tAuth("logout")}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
