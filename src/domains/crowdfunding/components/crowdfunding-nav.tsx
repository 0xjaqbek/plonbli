"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Target, FolderOpen, Heart } from "lucide-react";

const navItems = [
  { href: "/crowdfunding", labelKey: "nav.all" as const, icon: Target, exact: true },
  { href: "/crowdfunding/my-campaigns", labelKey: "nav.myCampaigns" as const, icon: FolderOpen },
  { href: "/crowdfunding/backed", labelKey: "nav.backed" as const, icon: Heart },
];

export function CrowdfundingNav() {
  const pathname = usePathname();
  const t = useTranslations("crowdfunding");

  // pathname includes locale prefix like /pl/crowdfunding
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?:\/|$)/, "/");

  return (
    <nav className="border-b mb-6">
      <div className="container mx-auto max-w-6xl px-4 flex gap-1 -mb-px">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathWithoutLocale === item.href
            : pathWithoutLocale.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
