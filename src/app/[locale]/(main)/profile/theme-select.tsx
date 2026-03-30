"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const themes = [
  { value: "light", icon: Sun, labelKey: "light" as const },
  { value: "dark", icon: Moon, labelKey: "dark" as const },
  { value: "system", icon: Monitor, labelKey: "system" as const },
];

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");

  return (
    <div className="px-3">
      <p className="text-sm text-muted-foreground mb-2">{t("toggle")}</p>
      <div className="flex flex-col sm:flex-row rounded-lg border p-1 gap-1">
        {themes.map(({ value, icon: Icon, labelKey }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              theme === value
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
