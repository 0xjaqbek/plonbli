import type { EventName, EventProperties } from "./types";

declare global {
  interface Window {
    umami?: {
      track(event: string, data?: Record<string, unknown>): void;
    };
  }
}

export function trackEvent<T extends EventName>(
  event: T,
  data?: EventProperties[T]
): void {
  if (typeof window === "undefined") return;
  if (!window.umami) return;
  window.umami.track(event, data as Record<string, unknown> | undefined);
}
