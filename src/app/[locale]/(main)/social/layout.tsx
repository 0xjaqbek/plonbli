"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";

const socialTabs = [
  { href: "/social", labelKey: "feed" as const, exact: true },
  { href: "/social/my-posts", labelKey: "myPosts" as const, exact: false },
  { href: "/social/groups", labelKey: "groups" as const, exact: false },
  { href: "/social/events", labelKey: "events" as const, exact: false },
];

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const ts = useTranslations("social");
  const te = useTranslations("event");
  const tg = useTranslations("group");
  const pathname = usePathname();

  // Strip locale prefix for comparison
  const cleanPath = pathname.replace(/^\/[a-z]{2}(?:\/|$)/, "/");

  function getLabel(key: string) {
    if (key === "feed") return ts("feed");
    if (key === "myPosts") return ts("myPosts");
    if (key === "groups") return tg("groups");
    if (key === "events") return te("events");
    return key;
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return cleanPath === href;
    return cleanPath.startsWith(href);
  }

  return (
    <div>
      <nav className="border-b">
        <div className="max-w-4xl mx-auto flex gap-1 px-4 overflow-x-auto scrollbar-none">
          {socialTabs.map(({ href, labelKey, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                isActive(href, exact)
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              {getLabel(labelKey)}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
