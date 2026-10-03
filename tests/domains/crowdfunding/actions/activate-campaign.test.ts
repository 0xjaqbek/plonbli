import { describe, it, expect, vi, beforeEach } from "vitest";
import { Keypair } from "@solana/web3.js";

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

vi.mock("@/domains/crowdfunding/lib/read-campaign-onchain", () => ({
  verifyProgramTransaction: vi.fn().mockResolvedValue(undefined),
  readCampaignOnChain: vi.fn(),
  readMilestoneOnChain: vi.fn().mockResolvedValue({
    status: "PENDING",
    milestoneIndex: 0,
  }),
  readRewardTierOnChain: vi.fn(),
}));

vi.mock("@/domains/crowdfunding/lib/pda", () => ({
  findCampaignPda: vi.fn(() => ({
    toBase58: () => "11111111111111111111111111111113",
  })),
  findMilestonePda: vi.fn(() => ({
    toBase58: () => "11111111111111111111111111111114",
  })),
  findRewardTierPda: vi.fn(() => ({
    toBase58: () => "11111111111111111111111111111115",
  })),
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

const futureDate = new Date(Date.now() + 86_400_000);
const pastDate = new Date(Date.now() - 86_400_000);

const setupCampaign = {
  id: "campaign-1",
  creatorId: "user-1",
  status: "SETUP",
  deadline: futureDate,
  goalAmount: "1000",
  title: "Test Campaign",
  currencyMint: "So11111111111111111111111111111111111111112",
  contentHash: "a".repeat(64),
};

// ── Tests ────────────────────────────────────────────────────────────

describe("activateCampaignAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { readCampaignOnChain, readMilestoneOnChain } = await import(
      "@/domains/crowdfunding/lib/read-campaign-onchain"
    );
    vi.mocked(readCampaignOnChain).mockResolvedValue({
      status: "ACTIVE",
      creator: "11111111111111111111111111111112",
      currencyMint: setupCampaign.currencyMint,
      goalAmount: "1000000000000",
      deadline: Math.floor(futureDate.getTime() / 1000).toString(),
      contentHash: setupCampaign.contentHash,
    });
    vi.mocked(readMilestoneOnChain).mockResolvedValue({
      status: "PENDING",
      milestoneIndex: 0,
    });
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
    const creator = Keypair.generate().publicKey;
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const { readCampaignOnChain } = await import(
      "@/domains/crowdfunding/lib/read-campaign-onchain"
    );
    vi.mocked(readCampaignOnChain).mockResolvedValue({
      status: "ACTIVE",
      creator: creator.toBase58(),
      currencyMint: setupCampaign.currencyMint,
      goalAmount: "1000000000000",
      deadline: Math.floor(futureDate.getTime() / 1000).toString(),
      contentHash: setupCampaign.contentHash,
    });
    const campaignChain = mockDbChain([{ ...setupCampaign }]);
    const countChain = mockDbChain([{ count: 1 }]);
    const totalChain = mockDbChain([{ total: "500" }]);
    const rewardCountChain = mockDbChain([{ count: 0 }]);

    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(countChain as any)
      .mockReturnValueOnce(totalChain as any)
      .mockReturnValueOnce(rewardCountChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { activateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/activate-campaign"
    );
    const result = await activateCampaignAction(
      "campaign-1",
      {
        campaignPubkey: "11111111111111111111111111111113",
        creatorWalletAddress: creator.toBase58(),
        createSignature: "create-txsig",
        activationSignature: "activate-txsig",
        milestoneReceipts: [
          {
            index: 0,
            pubkey: "11111111111111111111111111111114",
            signature: "milestone-txsig",
          },
        ],
        rewardTierReceipts: [],
      }
    );
    expect(result).toEqual({ success: true });
    expect(db.update).toHaveBeenCalled();
  });
});
