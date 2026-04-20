import { describe, it, expect, vi, afterEach } from "vitest";
import { trackEvent } from "@/domains/analytics/track-event";

describe("trackEvent", () => {
  afterEach(() => {
    delete (window as Window & { umami?: unknown }).umami;
  });

  it("is a no-op when window.umami is not defined", () => {
    expect(() => trackEvent("auth.logged_out")).not.toThrow();
  });

  it("calls window.umami.track with event name and data", () => {
    const track = vi.fn();
    (window as Window & { umami?: unknown }).umami = { track };

    trackEvent("auth.registered", { method: "email" });

    expect(track).toHaveBeenCalledWith("auth.registered", { method: "email" });
  });

  it("passes undefined data for no-data events", () => {
    const track = vi.fn();
    (window as Window & { umami?: unknown }).umami = { track };

    trackEvent("message.sent");

    expect(track).toHaveBeenCalledWith("message.sent", undefined);
  });
});
