import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/shared/db/schema", () => ({
  crowdfundingUpdates: {
    id: "id",
    title: "title",
    content: "content",
    createdAt: "createdAt",
    campaignId: "campaignId",
    authorId: "authorId",
  },
  users: { id: "id", name: "name" },
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
  chain.orderBy = vi.fn().mockResolvedValue(returnValue);
  return chain;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("getUpdatesByCampaign", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns updates for a campaign", async () => {
    const { db } = await import("@/shared/db");
    const mockUpdates = [
      {
        id: "update-1",
        title: "First update",
        content: "Some content",
        createdAt: new Date(),
        authorName: "Jan Kowalski",
      },
    ];
    const chain = mockDbChain(mockUpdates);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getUpdatesByCampaign } = await import(
      "@/domains/crowdfunding/queries/get-updates"
    );
    const result = await getUpdatesByCampaign("campaign-1");

    expect(result).toEqual(mockUpdates);
    expect(db.select).toHaveBeenCalled();
    expect(chain.innerJoin).toHaveBeenCalled();
  });

  it("returns empty array when no updates exist", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getUpdatesByCampaign } = await import(
      "@/domains/crowdfunding/queries/get-updates"
    );
    const result = await getUpdatesByCampaign("campaign-1");

    expect(result).toEqual([]);
  });

  it("orders updates by createdAt descending", async () => {
    const { db } = await import("@/shared/db");
    const { desc } = await import("drizzle-orm");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getUpdatesByCampaign } = await import(
      "@/domains/crowdfunding/queries/get-updates"
    );
    await getUpdatesByCampaign("campaign-1");

    expect(desc).toHaveBeenCalled();
    expect(chain.orderBy).toHaveBeenCalled();
  });
});
