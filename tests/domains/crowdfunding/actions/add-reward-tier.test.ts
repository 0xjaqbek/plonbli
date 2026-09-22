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

vi.mock("@/domains/crowdfunding/lib/content-hash", () => ({
  generateContentHash: vi.fn().mockResolvedValue(new Uint8Array(32)),
  hashToHex: vi.fn().mockReturnValue("d".repeat(64)),
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

const setupCampaign = {
  id: "campaign-1",
  creatorId: "user-1",
  status: "SETUP",
};

const validTier = () =>
  makeFormData({
    title: "Bronze Supporter",
    description: "Get a thank-you card and early access rewards",
    price: "50",
    maxBackers: "100",
  });

// ── Tests ────────────────────────────────────────────────────────────

describe("addRewardTierAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { addRewardTierAction } = await import(
      "@/domains/crowdfunding/actions/add-reward-tier"
    );
    const result = await addRewardTierAction("campaign-1", validTier());
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when campaign not found/not SETUP", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]); // not found
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { addRewardTierAction } = await import(
      "@/domains/crowdfunding/actions/add-reward-tier"
    );
    const result = await addRewardTierAction("campaign-1", validTier());
    expect(result).toEqual({
      error: "Nie znaleziono zbi\u00f3rki lub brak uprawnie\u0144",
    });
  });

  it("returns validation error for bad input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([{ ...setupCampaign }]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { addRewardTierAction } = await import(
      "@/domains/crowdfunding/actions/add-reward-tier"
    );
    // Title too short, description too short, invalid price
    const result = await addRewardTierAction(
      "campaign-1",
      makeFormData({ title: "ab", description: "short", price: "-10" })
    );
    expect(result).toHaveProperty("error");
  });

  it("successfully adds reward tier with correct index", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    // First select: campaign found
    const campaignChain = mockDbChain([{ ...setupCampaign }]);
    // Second select: existing tier count = 1
    const countChain = mockDbChain([{ count: 1 }]);

    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(countChain as any);

    const insertChain = mockDbChain([]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { addRewardTierAction } = await import(
      "@/domains/crowdfunding/actions/add-reward-tier"
    );
    const result = await addRewardTierAction("campaign-1", validTier());
    expect(result).toEqual({ success: true });
    expect(db.insert).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });
});
