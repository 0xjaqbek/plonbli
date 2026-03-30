"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, ShoppingBasket, Tractor, Users, MessageCircle, User } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const bottomNavItems = [
  { href: "/", icon: Home, labelKey: "home" as const },
  { href: "/marketplace", icon: ShoppingBasket, labelKey: "marketplace" as const },
  { href: "/farmers", icon: Tractor, labelKey: "farmers" as const },
  { href: "/social", icon: Users, labelKey: "social" as const },
];

const topRightItems = [
  { href: "/messages", icon: MessageCircle, labelKey: "messages" as const },
  { href: "/profile", icon: User, labelKey: "profile" as const },
];

const allNavItems = [...bottomNavItems, ...topRightItems];

export function NavBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  // Strip locale prefix for comparison
  const cleanPath = pathname.replace(/^\/[a-z]{2}(?:\/|$)/, "/");

  function isActive(href: string) {
    if (href === "/") return cleanPath === "/";
    return cleanPath.startsWith(href);
  }

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden md:flex items-center justify-between border-b px-6 py-3">
        <Link href="/" className="text-xl font-bold text-primary">
          plonbli
        </Link>
        <nav className="flex items-center gap-1">
          {allNavItems.map(({ href, icon: Icon, labelKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive(href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </Link>
          ))}
        </nav>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 flex items-center justify-between border-b bg-background px-4 py-2.5 z-50">
        <Link href="/" className="text-lg font-bold text-primary">
          plonbli
        </Link>
        <div className="flex items-center gap-1">
          {topRightItems.map(({ href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "p-2 rounded-md transition-colors",
                isActive(href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </Link>
          ))}
        </div>
      </header>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50">
        <div className="flex items-center justify-around py-2">
          {bottomNavItems.map(({ href, icon: Icon, labelKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
                isActive(href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
