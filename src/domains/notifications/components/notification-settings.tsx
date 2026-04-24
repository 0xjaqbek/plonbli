"use client";

import { useState, useEffect } from "react";
import { getToken } from "firebase/messaging";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { getFirebaseMessaging } from "@/shared/lib/firebase-client";
import { savePushToken } from "../actions/save-push-token";
import { updateNotificationPreferences } from "../actions/update-notification-preferences";
import type { NotificationPreferences } from "@/shared/db/schema";

interface Props {
  preferences: Pick<NotificationPreferences, "messages" | "social" | "marketplace"> | null;
}

export function NotificationSettings({ preferences }: Props) {
  const t = useTranslations("notifications");
  const [pushGranted, setPushGranted] = useState(false);
  const [prefs, setPrefs] = useState({
    messages: preferences?.messages ?? true,
    social: preferences?.social ?? true,
    marketplace: preferences?.marketplace ?? true,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushGranted(Notification.permission === "granted");
    }
  }, []);

  if (typeof window !== "undefined" && !("Notification" in window)) {
    return <p className="text-sm text-muted-foreground">{t("notSupported")}</p>;
  }

  async function handleEnablePush() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    try {
      const messaging = getFirebaseMessaging();
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      if (token) {
        await savePushToken({ fcmToken: token });
        setPushGranted(true);
      }
    } catch (e) {
      console.error("[NotificationSettings] getToken failed:", e);
    }
  }

  async function handleToggle(
    key: "messages" | "social" | "marketplace",
    value: boolean
  ) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await updateNotificationPreferences(updated);
  }

  if (!pushGranted) {
    return (
      <Button variant="outline" onClick={handleEnablePush}>
        <Bell className="h-4 w-4 mr-2" />
        {t("enablePushButton")}
      </Button>
    );
  }

  const toggles: { key: "messages" | "social" | "marketplace"; label: string }[] = [
    { key: "messages", label: t("messagesLabel") },
    { key: "social", label: t("socialLabel") },
    { key: "marketplace", label: t("marketplaceLabel") },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("settingsDescription")}</p>
      {toggles.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={`notif-${key}`}>{label}</Label>
          <input
            id={`notif-${key}`}
            type="checkbox"
            checked={prefs[key]}
            onChange={(e) => handleToggle(key, e.target.checked)}
            className="h-4 w-4"
          />
        </div>
      ))}
    </div>
  );
}
