"use client";

import { useState, useEffect, useRef } from "react";
import { Smartphone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";

const DISMISSED_KEY = "pwa-install-dismissed";

type DeviceType = "android" | "ios";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPromptCard() {
  const t = useTranslations("installPrompt");
  const [show, setShow] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>("android");
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      // This effect synchronizes client-only browser capability state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeviceType("ios");
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setDeviceType("android");
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    setShow(false);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 mx-4 md:left-auto md:right-4 md:w-96">
      <div className="bg-card border rounded-lg shadow-lg p-4 flex items-start gap-3">
        <Smartphone className="h-5 w-5 mt-0.5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("body")}</p>
          {deviceType === "ios" ? (
            <p className="text-sm text-muted-foreground mt-2">
              {t("iosInstruction")}
            </p>
          ) : (
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleInstall}>
                {t("install")}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                {t("dismiss")}
              </Button>
            </div>
          )}
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
