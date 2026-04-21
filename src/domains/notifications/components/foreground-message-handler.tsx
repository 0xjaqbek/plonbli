"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { getFirebaseMessaging } from "@/shared/lib/firebase-client";

export function ForegroundMessageHandler() {
  useEffect(() => {
    let unsub: (() => void) | undefined;

    async function register() {
      try {
        const messaging = getFirebaseMessaging();
        unsub = onMessage(messaging, (payload) => {
          const title = payload.notification?.title ?? "Plonbli";
          const body = payload.notification?.body;
          const url = payload.data?.url;

          toast(title, {
            description: body,
            action: url
              ? {
                  label: "Otwórz",
                  onClick: () => window.location.assign(url),
                }
              : undefined,
          });
        });
      } catch {
        // Firebase not supported in this environment (e.g. SSR, no service worker)
      }
    }

    void register();
    return () => unsub?.();
  }, []);

  return null;
}
