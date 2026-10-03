import { describe, it, expect, vi, beforeEach } from "vitest";

// Top-level mocks
vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const db: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  db.transaction = vi.fn((callback) => callback(db));
  return { db };
});

vi.mock("@/domains/crowdfunding/lib/read-campaign-onchain", () => ({
  verifyProgramTransaction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/domains/crowdfunding/lib/verify-contribution", () => ({
  readContributionOnChain: vi.fn().mockResolvedValue({ refunded: true }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

const contribution = {
  id: "contrib-1",
  campaignId: "campaign-1",
  backerId: "user-1",
  amount: "100",
  refunded: false,
  rewardTierId: null,
  walletAddress: "wallet-1",
  contributionPubkey: "contribution-pda",
};

const receipt = { signature: "refund-signature", walletAddress: "wallet-1" };

// ── Tests ────────────────────────────────────────────────────────────

describe("claimRefundAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { claimRefundAction } = await import(
      "@/domains/crowdfunding/actions/claim-refund"
    );
    const result = await claimRefundAction("contrib-1", receipt);
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when contribution not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]); // not found
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { claimRefundAction } = await import(
      "@/domains/crowdfunding/actions/claim-refund"
    );
    const result = await claimRefundAction("contrib-999", receipt);
    expect(result).toEqual({
      error: "Wp\u0142ata nie zosta\u0142a znaleziona",
    });
  });

  it("returns error when already refunded", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const refundedContribution = { ...contribution, refunded: true };
    const chain = mockDbChain([refundedContribution]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { claimRefundAction } = await import(
      "@/domains/crowdfunding/actions/claim-refund"
    );
    const result = await claimRefundAction("contrib-1", receipt);
    expect(result).toEqual({
      error: "Zwrot zosta\u0142 ju\u017c zrealizowany",
    });
  });

  it("returns error when campaign is not FAILED", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    // First select: contribution found
    const contribChain = mockDbChain([{ ...contribution }]);
    // Second select: campaign not FAILED (empty result)
    const campaignChain = mockDbChain([]);

    vi.mocked(db.select)
      .mockReturnValueOnce(contribChain as any)
      .mockReturnValueOnce(campaignChain as any);

    const { claimRefundAction } = await import(
      "@/domains/crowdfunding/actions/claim-refund"
    );
    const result = await claimRefundAction("contrib-1", receipt);
    expect(result).toEqual({
      error:
        "Zwroty s\u0105 dost\u0119pne tylko dla nieudanych zbi\u00f3rek Solana",
    });
  });

  it("successfully marks contribution as refunded", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    // First select: contribution found
    const contribChain = mockDbChain([{ ...contribution }]);
    // Second select: campaign is FAILED
    const campaignChain = mockDbChain([
      {
        id: "campaign-1",
        status: "FAILED",
        campaignPubkey: "campaign-pda",
      },
    ]);

    vi.mocked(db.select)
      .mockReturnValueOnce(contribChain as any)
      .mockReturnValueOnce(campaignChain as any);

    const updateChain = mockDbChain([{ id: "contrib-1" }]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { claimRefundAction } = await import(
      "@/domains/crowdfunding/actions/claim-refund"
    );
    const result = await claimRefundAction("contrib-1", receipt);
    expect(result).toEqual({ success: true, amount: "100" });
    expect(db.update).toHaveBeenCalled();
  });
});
