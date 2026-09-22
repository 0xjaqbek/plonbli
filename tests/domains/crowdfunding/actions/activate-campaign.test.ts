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

const futureDate = new Date(Date.now() + 86_400_000).toISOString();
const pastDate = new Date(Date.now() - 86_400_000).toISOString();

const setupCampaign = {
  id: "campaign-1",
  creatorId: "user-1",
  status: "SETUP",
  deadline: futureDate,
  goalAmount: "1000",
  title: "Test Campaign",
};

// ── Tests ────────────────────────────────────────────────────────────

describe("activateCampaignAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { activateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/activate-campaign"
    );
    const result = await activateCampaignAction("campaign-1");
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when campaign not found or not owned", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]); // not found
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { activateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/activate-campaign"
    );
    const result = await activateCampaignAction("campaign-1");
    expect(result).toEqual({
      error: "Nie znaleziono zbi\u00f3rki lub brak uprawnie\u0144",
    });
  });

  it("returns error when no milestones exist", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    // First select: campaign found
    const campaignChain = mockDbChain([{ ...setupCampaign }]);
    // Second select: milestone count = 0
    const countChain = mockDbChain([{ count: 0 }]);

    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(countChain as any);

    const { activateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/activate-campaign"
    );
    const result = await activateCampaignAction("campaign-1");
    expect(result).toEqual({
      error: "Dodaj co najmniej jeden kamie\u0144 milowy przed aktywacj\u0105",
    });
  });

  it("returns error when deadline has passed", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const expiredCampaign = { ...setupCampaign, deadline: pastDate };
    const campaignChain = mockDbChain([expiredCampaign]);
    const countChain = mockDbChain([{ count: 2 }]);

    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(countChain as any);

    const { activateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/activate-campaign"
    );
    const result = await activateCampaignAction("campaign-1");
    expect(result).toEqual({
      error: "Termin zako\u0144czenia musi by\u0107 w przysz\u0142o\u015bci",
    });
  });

  it("returns error when milestone targets exceed campaign goal", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const campaignChain = mockDbChain([{ ...setupCampaign }]);
    const countChain = mockDbChain([{ count: 2 }]);
    // Third select: milestone total exceeds goal
    const totalChain = mockDbChain([{ total: "1500" }]);

    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(countChain as any)
      .mockReturnValueOnce(totalChain as any);

    const { activateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/activate-campaign"
    );
    const result = await activateCampaignAction("campaign-1");
    expect(result).toEqual({
      error:
        "Suma cel\u00f3w kamieni milowych przekracza cel zbi\u00f3rki",
    });
  });

  it("successfully activates campaign and sets status to ACTIVE", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const campaignChain = mockDbChain([{ ...setupCampaign }]);
    const countChain = mockDbChain([{ count: 1 }]);
    const totalChain = mockDbChain([{ total: "500" }]);

    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(countChain as any)
      .mockReturnValueOnce(totalChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { activateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/activate-campaign"
    );
    const result = await activateCampaignAction(
      "campaign-1",
      "pubkey-abc",
      "txsig-123"
    );
    expect(result).toEqual({ success: true });
    expect(db.update).toHaveBeenCalled();
  });
});
