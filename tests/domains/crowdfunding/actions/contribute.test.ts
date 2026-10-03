import BN from "bn.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/domains/notifications/lib/notification-types", () => ({
  buildContributionNotification: vi.fn().mockReturnValue({}),
}));
vi.mock("@/domains/crowdfunding/lib/verify-contribution", () => ({
  verifyContributionOnChain: vi.fn(),
}));
vi.mock("@solana/spl-token", () => ({
  getMint: vi.fn().mockResolvedValue({ decimals: 6 }),
}));

function chain(result: any[] = []) {
  const value: any = {};
  value.from = vi.fn().mockReturnValue(value);
  value.where = vi.fn().mockReturnValue(value);
  value.limit = vi.fn().mockResolvedValue(result);
  value.values = vi.fn().mockReturnValue(value);
  value.set = vi.fn().mockReturnValue(value);
  value.returning = vi.fn().mockResolvedValue(result);
  value.then = (resolve: (rows: any[]) => unknown) =>
    Promise.resolve(result).then(resolve);
  return value;
}

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const values = {
    campaignId: "campaign-1",
    amount: "100",
    contributionPubkey: "contribution-pda",
    transactionSignature: "transaction-signature",
    walletAddress: "wallet-1",
    ...overrides,
  };
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

const campaign = {
  id: "campaign-1",
  creatorId: "creator-1",
  status: "ACTIVE",
  deadline: new Date(Date.now() + 60_000),
  title: "Test campaign",
  campaignPubkey: "11111111111111111111111111111111",
  currencyMint: "So11111111111111111111111111111111111111112",
};

describe("contributeAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { verifyContributionOnChain } = await import(
      "@/domains/crowdfunding/lib/verify-contribution"
    );
    vi.mocked(verifyContributionOnChain).mockResolvedValue({
      amount: new BN(100_000_000),
      rewardTierIndex: null,
      refunded: false,
    });
  });

  it("requires authentication", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValue(null as any);
    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    expect(await contributeAction(form())).toEqual({ error: "Unauthorized" });
  });

  it("requires a confirmed Solana receipt", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: "backer-1" } } as any);
    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    expect(
      await contributeAction(form({ transactionSignature: "" }))
    ).toEqual({ error: "Confirmed Solana contribution is required" });
  });

  it("rejects an unverified transaction", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    const { verifyContributionOnChain } = await import(
      "@/domains/crowdfunding/lib/verify-contribution"
    );
    vi.mocked(auth).mockResolvedValue({ user: { id: "backer-1" } } as any);
    vi.mocked(db.select).mockReturnValue(chain([campaign]) as any);
    vi.mocked(verifyContributionOnChain).mockRejectedValue(new Error("bad tx"));
    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    expect(await contributeAction(form())).toEqual({
      error: "The Solana contribution could not be verified",
    });
  });

  it("records the canonical on-chain amount", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "backer-1", name: "Backer" },
    } as any);
    vi.mocked(db.select)
      .mockReturnValueOnce(chain([campaign]) as any)
      .mockReturnValueOnce(chain([]) as any)
      .mockReturnValueOnce(chain([]) as any);
    const insert = chain([]);
    vi.mocked(db.insert).mockReturnValue(insert as any);
    vi.mocked(db.update).mockReturnValue(chain([]) as any);

    const { contributeAction } = await import(
      "@/domains/crowdfunding/actions/contribute"
    );
    expect(await contributeAction(form())).toEqual({ success: true });
    expect(insert.values).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount: "100" })
    );
  });
});
