import { describe, it, expect, vi, beforeEach } from "vitest";

// Top-level mocks — must be before any imports of the module under test
vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/domains/notifications/lib/notification-types", () => ({
  buildContributionNotification: vi.fn().mockReturnValue({}),
}));

// ── Helpers ──────────────────────────────────────────────────────────

function mockDbChain(returnValue: any = []) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(returnValue);
  chain.then = (fn: any) => Promise.resolve(returnValue).then(fn);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockResolvedValue(returnValue);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue(returnValue);
  chain.set = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

const validFormData = () =>
  makeFormData({
    campaignId: "campaign-1",
    amount: "100",
  });

const futureDate = new Date(Date.now() + 86_400_000).toISOString();
const pastDate = new Date(Date.now() - 86_400_000).toISOString();

const activeCampaign = {
  id: "campaign-1",
  creatorId: "creator-1",
  status: "ACTIVE",
  deadline: futureDate,
  title: "Test Campaign",
  raisedAmount: "0",
  backerCount: 0,
};

// ── Tests ────────────────────────────────────────────────────────────

describe("contributeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    const result = await contributeAction(validFormData());
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns validation error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "User" },
    } as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    // Missing required fields
    const result = await contributeAction(makeFormData({ amount: "-5" }));
    expect(result).toHaveProperty("error");
    expect(result.error).not.toBe("Unauthorized");
  });

  it("returns error when campaign is not ACTIVE", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "User" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]); // no campaign found
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    const result = await contributeAction(validFormData());
    expect(result).toEqual({ error: "Zbi\u00f3rka nie jest aktywna" });
  });

  it("returns error when contributor is the campaign creator", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "creator-1", name: "Creator" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([{ ...activeCampaign }]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    const result = await contributeAction(validFormData());
    expect(result).toEqual({
      error: "Nie mo\u017cesz wspiera\u0107 w\u0142asnej zbi\u00f3rki",
    });
  });

  it("returns error when campaign deadline has passed", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "User" },
    } as any);

    const { db } = await import("@/shared/db");
    const expiredCampaign = { ...activeCampaign, deadline: pastDate };
    const chain = mockDbChain([expiredCampaign]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    const result = await contributeAction(validFormData());
    expect(result).toEqual({
      error: "Termin zbi\u00f3rki up\u0142yn\u0105\u0142",
    });
  });

  it("returns error when reward tier does not exist", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "User" },
    } as any);

    const { db } = await import("@/shared/db");
    // First select: campaign found; second select: tier not found
    const campaignChain = mockDbChain([{ ...activeCampaign }]);
    const tierChain = mockDbChain([]);
    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(tierChain as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    const fd = makeFormData({
      campaignId: "campaign-1",
      amount: "100",
      rewardTierId: "tier-1",
    });
    const result = await contributeAction(fd);
    expect(result).toEqual({
      error: "Wybrany pr\u00f3g nagrody nie istnieje",
    });
  });

  it("returns error when contribution amount is less than tier price", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "User" },
    } as any);

    const { db } = await import("@/shared/db");
    const tier = {
      id: "tier-1",
      campaignId: "campaign-1",
      price: "200",
      maxBackers: 0,
      currentBackers: 0,
    };
    const campaignChain = mockDbChain([{ ...activeCampaign }]);
    const tierChain = mockDbChain([tier]);
    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(tierChain as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    const fd = makeFormData({
      campaignId: "campaign-1",
      amount: "50",
      rewardTierId: "tier-1",
    });
    const result = await contributeAction(fd);
    expect(result).toHaveProperty("error");
    expect((result as any).error).toContain("200");
  });

  it("returns error when reward tier is full", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "User" },
    } as any);

    const { db } = await import("@/shared/db");
    const tier = {
      id: "tier-1",
      campaignId: "campaign-1",
      price: "50",
      maxBackers: 10,
      currentBackers: 10,
    };
    const campaignChain = mockDbChain([{ ...activeCampaign }]);
    const tierChain = mockDbChain([tier]);
    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(tierChain as any);

    // Atomic update returns empty array (no rows updated = full)
    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    const fd = makeFormData({
      campaignId: "campaign-1",
      amount: "100",
      rewardTierId: "tier-1",
    });
    const result = await contributeAction(fd);
    expect(result).toEqual({
      error: "Ten pr\u00f3g nagrody jest ju\u017c pe\u0142ny",
    });
  });

  it("successfully records contribution and updates campaign totals", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "User" },
    } as any);

    const { db } = await import("@/shared/db");
    const campaignChain = mockDbChain([{ ...activeCampaign }]);
    vi.mocked(db.select).mockReturnValue(campaignChain as any);

    const insertChain = mockDbChain([]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    const result = await contributeAction(validFormData());
    expect(result).toEqual({ success: true });
    expect(db.insert).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });

  it("sends notification to campaign creator", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "User" },
    } as any);

    const { db } = await import("@/shared/db");
    const campaignChain = mockDbChain([{ ...activeCampaign }]);
    vi.mocked(db.select).mockReturnValue(campaignChain as any);

    const insertChain = mockDbChain([]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    await contributeAction(validFormData());

    expect(sendNotification).toHaveBeenCalledWith("creator-1", expect.anything());
  });
});
