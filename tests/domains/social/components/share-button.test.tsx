import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockTrackEvent = vi.fn();
vi.mock("@/domains/analytics", () => ({
  useAnalytics: () => ({ trackEvent: mockTrackEvent }),
  EVENTS: { LISTING_SHARED: "listing.shared" },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ShareButton", () => {
  it("fires listing.shared with entityType and entityId before routing", async () => {
    const { ShareButton } = await import(
      "@/domains/social/components/share-button"
    );
    render(<ShareButton entityType="FARMER" entityId="farmer-123" />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockTrackEvent).toHaveBeenCalledWith("listing.shared", {
      entityType: "FARMER",
      entityId: "farmer-123",
    });
    expect(mockPush).toHaveBeenCalledWith(
      "/social?shareType=FARMER&shareId=farmer-123"
    );
  });
});
