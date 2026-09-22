import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/shared/db/schema", () => ({
  crowdfundingContributions: {
    id: "id",
    amount: "amount",
    rewardTierId: "rewardTierId",
    refunded: "refunded",
    createdAt: "createdAt",
    backerId: "backerId",
    campaignId: "campaignId",
  },
  crowdfundingCampaigns: {
    id: "id",
    title: "title",
    images: "images",
    status: "status",
    goalAmount: "goalAmount",
    raisedAmount: "raisedAmount",
    deadline: "deadline",
  },
  crowdfundingRewardTiers: {
    id: "id",
    title: "title",
    price: "price",
  },
  users: { id: "id", name: "name", avatar: "avatar" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}));

function mockDbChain(returnValue: any = []) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockResolvedValue(returnValue);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockResolvedValue(returnValue);
  return chain;
}

describe("getContributionsByCampaign", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns contributions for a campaign", async () => {
    const { db } = await import("@/shared/db");
    const mockContributions = [
      {
        id: "contrib-1",
        amount: "100",
        rewardTierId: null,
        refunded: false,
        createdAt: new Date("2026-09-01"),
        backerName: "Jan Kowalski",
        backerAvatar: null,
      },
      {
        id: "contrib-2",
        amount: "250",
        rewardTierId: "tier-1",
        refunded: false,
        createdAt: new Date("2026-09-02"),
        backerName: "Anna Nowak",
        backerAvatar: "avatar.jpg",
      },
    ];
    const chain = mockDbChain(mockContributions);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getContributionsByCampaign } = await import(
      "@/domains/crowdfunding/queries/get-contributions"
    );
    const result = await getContributionsByCampaign("camp-1");

    expect(result).toEqual(mockContributions);
    expect(result).toHaveLength(2);
  });

  it("calls db.select with correct fields", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getContributionsByCampaign } = await import(
      "@/domains/crowdfunding/queries/get-contributions"
    );
    await getContributionsByCampaign("camp-1");

    expect(db.select).toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalled();
    expect(chain.innerJoin).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
    expect(chain.orderBy).toHaveBeenCalled();
  });

  it("returns empty array when no contributions", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getContributionsByCampaign } = await import(
      "@/domains/crowdfunding/queries/get-contributions"
    );
    const result = await getContributionsByCampaign("camp-empty");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe("getBackedCampaigns", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns backed campaigns with contribution details", async () => {
    const { db } = await import("@/shared/db");
    const mockBacked = [
      {
        contribution: {
          id: "contrib-1",
          amount: "100",
          refunded: false,
          createdAt: new Date("2026-09-01"),
        },
        campaign: {
          id: "camp-1",
          title: "Farm Equipment",
          images: [],
          status: "ACTIVE",
          goalAmount: "5000",
          raisedAmount: "1000",
          deadline: new Date("2026-12-31"),
        },
        rewardTier: {
          title: null,
          price: null,
        },
      },
    ];
    const chain = mockDbChain(mockBacked);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getBackedCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-contributions"
    );
    const result = await getBackedCampaigns("user-1");

    expect(result).toEqual(mockBacked);
    expect(result[0].contribution.id).toBe("contrib-1");
    expect(result[0].campaign.title).toBe("Farm Equipment");
  });

  it("includes reward tier data when available", async () => {
    const { db } = await import("@/shared/db");
    const mockBacked = [
      {
        contribution: {
          id: "contrib-1",
          amount: "250",
          refunded: false,
          createdAt: new Date("2026-09-01"),
        },
        campaign: {
          id: "camp-1",
          title: "Organic Seeds",
          images: [],
          status: "ACTIVE",
          goalAmount: "3000",
          raisedAmount: "2500",
          deadline: new Date("2026-11-30"),
        },
        rewardTier: {
          title: "Early Bird",
          price: "200",
        },
      },
    ];
    const chain = mockDbChain(mockBacked);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getBackedCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-contributions"
    );
    const result = await getBackedCampaigns("user-1");

    expect(result[0].rewardTier!.title).toBe("Early Bird");
    expect(result[0].rewardTier!.price).toBe("200");
    // Verify leftJoin was used for optional reward tier
    expect(chain.leftJoin).toHaveBeenCalled();
  });

  it("returns empty array when user has no contributions", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getBackedCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-contributions"
    );
    const result = await getBackedCampaigns("user-no-contributions");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});
