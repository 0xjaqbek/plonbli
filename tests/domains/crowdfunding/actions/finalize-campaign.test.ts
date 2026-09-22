import { describe, it, expect, vi, beforeEach } from "vitest";

// Top-level mocks
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
  buildCampaignActivatedNotification: vi.fn().mockReturnValue({}),
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

const pastDate = new Date(Date.now() - 86_400_000).toISOString();
const futureDate = new Date(Date.now() + 86_400_000).toISOString();

// ── Tests ────────────────────────────────────────────────────────────

describe("finalizeCampaignAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when campaign is not ACTIVE", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]); // no ACTIVE campaign found
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { finalizeCampaignAction } = await import(
      "@/domains/crowdfunding/actions/finalize-campaign"
    );
    const result = await finalizeCampaignAction("campaign-1");
    expect(result).toEqual({ error: "Zbi\u00f3rka nie jest aktywna" });
  });

  it("returns error when deadline has not passed yet", async () => {
    const { db } = await import("@/shared/db");
    const campaign = {
      id: "campaign-1",
      creatorId: "creator-1",
      status: "ACTIVE",
      deadline: futureDate,
      raisedAmount: "100",
      goalAmount: "1000",
      fundingModel: "ALL_OR_NOTHING",
      title: "Test",
    };
    const chain = mockDbChain([campaign]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { finalizeCampaignAction } = await import(
      "@/domains/crowdfunding/actions/finalize-campaign"
    );
    const result = await finalizeCampaignAction("campaign-1");
    expect(result).toEqual({
      error: "Termin zbi\u00f3rki jeszcze nie up\u0142yn\u0105\u0142",
    });
  });

  it("ALL_OR_NOTHING with goal met results in SUCCESSFUL", async () => {
    const { db } = await import("@/shared/db");
    const campaign = {
      id: "campaign-1",
      creatorId: "creator-1",
      status: "ACTIVE",
      deadline: pastDate,
      raisedAmount: "1000",
      goalAmount: "1000",
      fundingModel: "ALL_OR_NOTHING",
      title: "Test",
    };
    const selectChain = mockDbChain([campaign]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { finalizeCampaignAction } = await import(
      "@/domains/crowdfunding/actions/finalize-campaign"
    );
    const result = await finalizeCampaignAction("campaign-1");
    expect(result).toEqual({ success: true, status: "SUCCESSFUL" });
  });

  it("ALL_OR_NOTHING with goal not met results in FAILED", async () => {
    const { db } = await import("@/shared/db");
    const campaign = {
      id: "campaign-1",
      creatorId: "creator-1",
      status: "ACTIVE",
      deadline: pastDate,
      raisedAmount: "500",
      goalAmount: "1000",
      fundingModel: "ALL_OR_NOTHING",
      title: "Test",
    };
    const selectChain = mockDbChain([campaign]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { finalizeCampaignAction } = await import(
      "@/domains/crowdfunding/actions/finalize-campaign"
    );
    const result = await finalizeCampaignAction("campaign-1");
    expect(result).toEqual({ success: true, status: "FAILED" });
  });

  it("KEEP_WHAT_YOU_RAISE always results in SUCCESSFUL regardless of goal", async () => {
    const { db } = await import("@/shared/db");
    const campaign = {
      id: "campaign-1",
      creatorId: "creator-1",
      status: "ACTIVE",
      deadline: pastDate,
      raisedAmount: "100",
      goalAmount: "1000",
      fundingModel: "KEEP_WHAT_YOU_RAISE",
      title: "Test",
    };
    const selectChain = mockDbChain([campaign]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { finalizeCampaignAction } = await import(
      "@/domains/crowdfunding/actions/finalize-campaign"
    );
    const result = await finalizeCampaignAction("campaign-1");
    expect(result).toEqual({ success: true, status: "SUCCESSFUL" });
  });
});

describe("finalizeExpiredCampaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes multiple expired campaigns", async () => {
    const { db } = await import("@/shared/db");

    // First call: select expired campaign IDs (no .limit — resolves via .where)
    // Subsequent calls: finalizeCampaignAction's select for each campaign
    const expiredList = [{ id: "c-1" }, { id: "c-2" }];
    const expiredChain = mockDbChain(expiredList);
    // Override .where to resolve directly (no .limit call in the batch select)
    expiredChain.where = vi.fn().mockResolvedValue(expiredList);

    const campaign1 = {
      id: "c-1",
      creatorId: "creator-1",
      status: "ACTIVE",
      deadline: pastDate,
      raisedAmount: "1000",
      goalAmount: "1000",
      fundingModel: "ALL_OR_NOTHING",
      title: "Campaign 1",
    };
    const campaign2 = {
      id: "c-2",
      creatorId: "creator-2",
      status: "ACTIVE",
      deadline: pastDate,
      raisedAmount: "200",
      goalAmount: "500",
      fundingModel: "KEEP_WHAT_YOU_RAISE",
      title: "Campaign 2",
    };

    const chain1 = mockDbChain([campaign1]);
    const chain2 = mockDbChain([campaign2]);

    vi.mocked(db.select)
      .mockReturnValueOnce(expiredChain as any)
      .mockReturnValueOnce(chain1 as any)
      .mockReturnValueOnce(chain2 as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { finalizeExpiredCampaigns } = await import(
      "@/domains/crowdfunding/actions/finalize-campaign"
    );
    const result = await finalizeExpiredCampaigns();
    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
  });
});
