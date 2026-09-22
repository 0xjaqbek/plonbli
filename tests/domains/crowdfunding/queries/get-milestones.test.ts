import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/shared/db/schema", () => ({
  crowdfundingMilestones: {
    id: "id",
    campaignId: "campaignId",
    milestoneIndex: "milestoneIndex",
    title: "title",
    description: "description",
    status: "status",
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

describe("getMilestones", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns milestones for a campaign", async () => {
    const { db } = await import("@/shared/db");
    const mockMilestones = [
      {
        id: "ms-1",
        campaignId: "camp-1",
        milestoneIndex: 0,
        title: "Phase 1: Planning",
        description: "Initial planning phase",
        status: "COMPLETED",
      },
      {
        id: "ms-2",
        campaignId: "camp-1",
        milestoneIndex: 1,
        title: "Phase 2: Implementation",
        description: "Build the thing",
        status: "IN_PROGRESS",
      },
    ];
    const chain = mockDbChain(mockMilestones);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getMilestones } = await import(
      "@/domains/crowdfunding/queries/get-milestones"
    );
    const result = await getMilestones("camp-1");

    expect(result).toEqual(mockMilestones);
    expect(result).toHaveLength(2);
    expect(db.select).toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });

  it("returns empty array when no milestones", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getMilestones } = await import(
      "@/domains/crowdfunding/queries/get-milestones"
    );
    const result = await getMilestones("camp-empty");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("orders by milestoneIndex ascending", async () => {
    const { db } = await import("@/shared/db");
    const { asc } = await import("drizzle-orm");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getMilestones } = await import(
      "@/domains/crowdfunding/queries/get-milestones"
    );
    await getMilestones("camp-1");

    expect(asc).toHaveBeenCalled();
    expect(chain.orderBy).toHaveBeenCalled();
  });
});
