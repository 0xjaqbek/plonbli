import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import {
  ShoppingBasket,
  Leaf,
  Star,
  Users,
  FileText,
  Settings,
  ChevronRight,
} from "lucide-react";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Card, CardContent } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) redirect("/login");

  const isFarmer = user.role === "FARMER" || user.role === "BOTH";

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
      href: "/social/my-posts",
      icon: FileText,
      label: t("myPosts"),
    },
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
      {/* User header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar ?? undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.voivodeship && (
                <p className="text-xs text-muted-foreground">
                  {user.voivodeship}
                  {user.commune ? `, ${user.commune}` : ""}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card>
        <CardContent className="pt-4 pb-2">
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
            <Separator className="my-1" />
            <Link
              href="/profile/settings"
              className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
            >
              <span className="flex items-center gap-3 text-sm">
                <Settings className="h-4 w-4 text-muted-foreground" />
                {t("settings")}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}
