import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/pl/marketplace",
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/domains/geo", () => ({
  LocationCascade: () => null,
}));

const mockTrackEvent = vi.fn();
vi.mock("@/domains/analytics", () => ({
  useAnalytics: () => ({ trackEvent: mockTrackEvent }),
  EVENTS: {
    SEARCH_PERFORMED: "search.performed",
    FILTER_APPLIED: "filter.applied",
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SearchFilters", () => {
  it("fires search.performed with query on form submit", async () => {
    const { SearchFilters } = await import(
      "@/domains/marketplace/components/search-filters"
    );
    render(<SearchFilters categories={[]} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "jabłka" } });
    fireEvent.submit(input.closest("form")!);
    expect(mockTrackEvent).toHaveBeenCalledWith("search.performed", {
      query: "jabłka",
    });
  });
});
