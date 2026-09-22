import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/shared/db/schema", () => ({
  crowdfundingCampaigns: {
    id: "id",
    title: "title",
    description: "description",
    images: "images",
    category: "category",
    fundingModel: "fundingModel",
    goalAmount: "goalAmount",
    raisedAmount: "raisedAmount",
    backerCount: "backerCount",
    deadline: "deadline",
    status: "status",
    createdAt: "createdAt",
    creatorId: "creatorId",
  },
  users: { id: "id", name: "name", avatar: "avatar" },
}));

vi.mock("drizzle-orm", () => ({
  desc: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  sql: vi.fn(),
}));

function mockDbChain(returnValue: any = []) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockResolvedValue(returnValue);
  return chain;
}

describe("getCampaigns", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns campaigns from db", async () => {
    const { db } = await import("@/shared/db");
    const mockCampaigns = [
      {
        id: "camp-1",
        title: "Test Campaign",
        description: "A test",
        category: "EQUIPMENT",
        status: "ACTIVE",
        goalAmount: "5000",
        raisedAmount: "1000",
        backerCount: 5,
        creatorName: "Jan Kowalski",
        creatorAvatar: null,
      },
    ];
    const chain = mockDbChain(mockCampaigns);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    const result = await getCampaigns();

    expect(result).toEqual(mockCampaigns);
    expect(db.select).toHaveBeenCalled();
  });

  it("passes through with no filters (default: ACTIVE + SUCCESSFUL)", async () => {
    const { db } = await import("@/shared/db");
    const { or, eq } = await import("drizzle-orm");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    await getCampaigns();

    expect(or).toHaveBeenCalled();
    expect(eq).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });

  it("uses status filter when provided", async () => {
    const { db } = await import("@/shared/db");
    const { eq, or } = await import("drizzle-orm");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    await getCampaigns({ status: "DRAFT" });

    // When status is explicitly provided, eq should be called for the status filter
    expect(eq).toHaveBeenCalled();
    // or() should NOT be called because explicit status overrides default ACTIVE+SUCCESSFUL
    expect(or).not.toHaveBeenCalled();
  });

  it("uses category filter when provided", async () => {
    const { db } = await import("@/shared/db");
    const { eq } = await import("drizzle-orm");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    await getCampaigns({ category: "EQUIPMENT" });

    // eq is called for category + the default ACTIVE/SUCCESSFUL status
    expect(eq).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });

  it("uses creatorId filter when provided", async () => {
    const { db } = await import("@/shared/db");
    const { eq } = await import("drizzle-orm");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    await getCampaigns({ creatorId: "user-1" });

    expect(eq).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });

  it("uses default limit of 50 and offset of 0", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    await getCampaigns();

    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(chain.offset).toHaveBeenCalledWith(0);
  });

  it("custom limit and offset are applied", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    await getCampaigns({ limit: 10, offset: 20 });

    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.offset).toHaveBeenCalledWith(20);
  });

  it("when creatorId is provided, default status filter is NOT applied", async () => {
    const { db } = await import("@/shared/db");
    const { or } = await import("drizzle-orm");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaigns } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    await getCampaigns({ creatorId: "user-1" });

    // or() is used for the default ACTIVE+SUCCESSFUL filter, should NOT be called
    expect(or).not.toHaveBeenCalled();
  });
});

function mockDbChainTerminatingAtLimit(returnValue: any = []) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(returnValue);
  chain.offset = vi.fn().mockResolvedValue(returnValue);
  return chain;
}

describe("getCampaignById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns campaign when found", async () => {
    const { db } = await import("@/shared/db");
    const mockCampaign = {
      id: "camp-1",
      title: "Test Campaign",
      status: "ACTIVE",
    };
    const chain = mockDbChainTerminatingAtLimit([mockCampaign]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaignById } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    const result = await getCampaignById("camp-1");

    expect(result).toEqual(mockCampaign);
    expect(db.select).toHaveBeenCalled();
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it("returns null when not found", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChainTerminatingAtLimit([]);
    vi.mocked(db.select).mockReturnValueOnce(chain as any);

    const { getCampaignById } = await import(
      "@/domains/crowdfunding/queries/get-campaigns"
    );
    const result = await getCampaignById("nonexistent");

    expect(result).toBeNull();
  });
});
