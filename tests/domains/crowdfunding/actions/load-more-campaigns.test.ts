import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/crowdfunding/queries/get-campaigns", () => ({
  getCampaigns: vi.fn(),
}));

// ── Tests ────────────────────────────────────────────────────────────

describe("loadMoreCampaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getCampaigns with offset and limit", async () => {
    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    vi.mocked(getCampaigns).mockResolvedValueOnce([]);

    const { loadMoreCampaigns } = await import(
      "@/domains/crowdfunding/actions/load-more-campaigns"
    );
    await loadMoreCampaigns({ offset: 12, limit: 12 });

    expect(getCampaigns).toHaveBeenCalledWith({
      category: undefined,
      limit: 12,
      offset: 12,
    });
  });

  it("passes category filter through", async () => {
    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    vi.mocked(getCampaigns).mockResolvedValueOnce([]);

    const { loadMoreCampaigns } = await import(
      "@/domains/crowdfunding/actions/load-more-campaigns"
    );
    await loadMoreCampaigns({
      offset: 0,
      limit: 12,
      category: "FARMER_INVESTMENT",
    });

    expect(getCampaigns).toHaveBeenCalledWith({
      category: "FARMER_INVESTMENT",
      limit: 12,
      offset: 0,
    });
  });

  it("returns the campaigns from getCampaigns", async () => {
    const mockCampaigns = [
      { id: "camp-1", title: "Test" },
      { id: "camp-2", title: "Test 2" },
    ];
    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    vi.mocked(getCampaigns).mockResolvedValueOnce(mockCampaigns as any);

    const { loadMoreCampaigns } = await import(
      "@/domains/crowdfunding/actions/load-more-campaigns"
    );
    const result = await loadMoreCampaigns({ offset: 0, limit: 12 });

    expect(result).toEqual(mockCampaigns);
  });
});
