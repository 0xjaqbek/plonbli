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
  UserPlus,
  Plus,
  Pencil,
  MapPin,
} from "lucide-react";
import { auth, signOut } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { getProxyFarmersByCreator } from "@/domains/marketplace/queries/get-proxy-farmer";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import { ThemeSelect } from "./theme-select";

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const tAuth = await getTranslations("auth");
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) redirect("/login");

  const tProxy = await getTranslations("proxyFarmer");
  const isFarmer = user.role === "FARMER" || user.role === "BOTH";
  const proxyProfiles = await getProxyFarmersByCreator(session.user.id);

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

      {/* Proxy farmer profiles */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              {tProxy("myProxyProfiles")}
            </span>
            {proxyProfiles.length < 3 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/farmers/proxy/create">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {tProxy("createProfile")}
                </Link>
              </Button>
            )}
          </div>
          {proxyProfiles.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">
              {tProxy("noProxyProfiles")}
            </p>
          ) : (
            <div className="space-y-2">
              {proxyProfiles.map((pf) => (
                <Link
                  key={pf.id}
                  href={`/farmers/proxy/${pf.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={pf.avatar ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {pf.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pf.name}</p>
                      {pf.voivodeship && (
                        <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {pf.voivodeship}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] shrink-0 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                  >
                    {tProxy("ambassadorBadge")}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
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
          <Separator className="my-3" />
          <ThemeSelect />
          <Separator className="my-3" />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-destructive hover:underline px-3"
            >
              {tAuth("logout")}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
