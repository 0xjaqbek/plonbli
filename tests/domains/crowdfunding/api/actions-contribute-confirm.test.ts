import { beforeEach, describe, expect, it, vi } from "vitest";
import BN from "bn.js";
import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/domains/crowdfunding/queries/get-campaigns", () => ({
  getCampaignById: vi.fn(),
}));

vi.mock("@/domains/crowdfunding/lib/verify-contribution", () => ({
  verifyContributionOnChain: vi.fn(),
}));

vi.mock("@/domains/crowdfunding/lib/pda", async () => {
  const { PublicKey: SolanaPublicKey } = await import("@solana/web3.js");
  return {
    findContributionPda: vi.fn(
      () =>
        new SolanaPublicKey(
          "SysvarRent111111111111111111111111111111111"
        )
    ),
  };
});

vi.mock("@/domains/crowdfunding/lib/constants", () => ({
  SOLANA_RPC_URL: "https://api.devnet.solana.com",
}));

vi.mock("@solana/spl-token", () => ({
  getMint: vi.fn().mockResolvedValue({ decimals: 9 }),
}));

import { POST } from "@/app/api/actions/contribute/[campaignId]/confirm/route";
import { db } from "@/shared/db";
import { getCampaignById } from "@/domains/crowdfunding/queries/get-campaigns";
import { verifyContributionOnChain } from "@/domains/crowdfunding/lib/verify-contribution";

const campaignPubkey = "11111111111111111111111111111112";
const backerWallet = "SysvarC1ock11111111111111111111111111111111";
const signature = "confirmed-transaction-signature";
const contributionPda = new PublicKey(
  "SysvarRent111111111111111111111111111111111"
);

function dbChain(result: unknown[] = []) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    values: vi.fn(),
    set: vi.fn(),
    then: (
      resolve: (value: unknown[]) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValue(result);
  chain.values.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  return chain;
}

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/actions/contribute/camp-1/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ campaignId: "camp-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCampaignById).mockResolvedValue({
    id: "camp-1",
    campaignPubkey,
    currencyMint: "So11111111111111111111111111111111111111112",
  } as Awaited<ReturnType<typeof getCampaignById>>);
});

describe("POST /api/actions/contribute/[campaignId]/confirm", () => {
  it("requires both the wallet and transaction signature", async () => {
    const response = await POST(request({ account: backerWallet }), params);

    expect(response.status).toBe(400);
    expect(verifyContributionOnChain).not.toHaveBeenCalled();
  });

  it("rejects a transaction that fails program, account, or signer verification", async () => {
    vi.mocked(verifyContributionOnChain).mockRejectedValue(
      new Error("BACKER_DID_NOT_SIGN_TRANSACTION")
    );

    const response = await POST(
      request({ account: backerWallet, signature }),
      params
    );

    expect(response.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("persists only the canonical amount from the verified contribution PDA", async () => {
    vi.mocked(verifyContributionOnChain).mockResolvedValue({
      amount: new BN("1250000000"),
      rewardTierIndex: null,
      refunded: false,
    });

    const walletLookup = dbChain([]);
    const contributionLookup = dbChain([]);
    vi.mocked(db.select)
      .mockReturnValueOnce(walletLookup as never)
      .mockReturnValueOnce(contributionLookup as never);

    const insert = dbChain([]);
    const update = dbChain([]);
    vi.mocked(db.insert).mockReturnValue(insert as never);
    vi.mocked(db.update).mockReturnValue(update as never);

    const response = await POST(
      request({ account: backerWallet, signature }),
      params
    );

    expect(response.status).toBe(200);
    expect(verifyContributionOnChain).toHaveBeenCalledWith({
      campaignPubkey,
      contributionPubkey: contributionPda.toBase58(),
      backerWalletAddress: backerWallet,
      transactionSignature: signature,
    });
    expect(insert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "1.25",
        contributionPubkey: contributionPda.toBase58(),
        walletAddress: backerWallet,
        transactionSignature: signature,
        source: "ACTION",
      })
    );
  });
});
