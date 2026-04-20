"use client";

import { useCallback } from "react";
import { trackEvent } from "./track-event";
import type { EventName, EventProperties } from "./types";

export function useAnalytics() {
  const track = useCallback(
    <T extends EventName>(event: T, data?: EventProperties[T]) => {
      trackEvent(event, data);
    },
    []
  );

  return { trackEvent: track };
}
