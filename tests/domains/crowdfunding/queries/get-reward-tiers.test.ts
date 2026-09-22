import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/shared/db/schema", () => ({
  crowdfundingRewardTiers: {
    id: "id",
    campaignId: "campaignId",
    tierIndex: "tierIndex",
    title: "title",
    description: "description",
    price: "price",
    maxClaimCount: "maxClaimCount",
    claimedCount: "claimedCount",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  asc: vi.fn(),
}));

function mockDbChain(returnValue: any = []) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockResolvedValue(returnValue);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockResolvedValue(returnValue);
  return chain;
}

describe("getRewardTiers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns reward tiers for a campaign", async () => {
    const { db } = await import("@/shared/db");
    const mockTiers = [
      {
        id: "tier-1",
        campaignId: "camp-1",
        tierIndex: 0,
        title: "Basic Supporter",
        description: "Thank you package",
        price: "50",
        maxClaimCount: 100,
        claimedCount: 12,
      },
      {
        id: "tier-2",
        campaignId: "camp-1",
        tierIndex: 1,
        title: "Premium Supporter",
        description: "Premium thank you package",
        price: "200",
        maxClaimCount: 25,
        claimedCount: 3,
      },
    ];
    const chain = mockDbChain(mockTiers);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getRewardTiers } = await import(
      "@/domains/crowdfunding/queries/get-reward-tiers"
    );
    const result = await getRewardTiers("camp-1");

    expect(result).toEqual(mockTiers);
    expect(result).toHaveLength(2);
    expect(db.select).toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });

  it("returns empty array when no tiers", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getRewardTiers } = await import(
      "@/domains/crowdfunding/queries/get-reward-tiers"
    );
    const result = await getRewardTiers("camp-no-tiers");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("orders by tierIndex ascending", async () => {
    const { db } = await import("@/shared/db");
    const { asc } = await import("drizzle-orm");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getRewardTiers } = await import(
      "@/domains/crowdfunding/queries/get-reward-tiers"
    );
    await getRewardTiers("camp-1");

    expect(asc).toHaveBeenCalled();
    expect(chain.orderBy).toHaveBeenCalled();
  });
});
