"use client";

import { useState, useEffect } from "react";
import { getToken } from "firebase/messaging";
import { Bell, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { getFirebaseMessaging } from "@/shared/lib/firebase-client";
import { savePushToken } from "../actions/save-push-token";

const DISMISSED_KEY = "push-dismissed";

export function PushPermissionPrompt() {
  const t = useTranslations("notifications");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "default" ||
      localStorage.getItem(DISMISSED_KEY) === "true"
    ) {
      return;
    }
    // This effect synchronizes browser permission and local-storage state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
  }, []);

  async function handleEnable() {
    setShow(false);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    try {
      const messaging = getFirebaseMessaging();
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      if (token) {
        await savePushToken({ fcmToken: token });
      }
    } catch (e) {
      console.error("[PushPermissionPrompt] getToken failed:", e);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 mx-4 mb-2 md:bottom-4 md:left-auto md:right-4 md:w-96">
      <div className="bg-card border rounded-lg shadow-lg p-4 flex items-start gap-3">
        <Bell className="h-5 w-5 mt-0.5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{t("promptTitle")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("promptBody")}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleEnable}>
              {t("enable")}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              {t("dismiss")}
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Zamknij"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
