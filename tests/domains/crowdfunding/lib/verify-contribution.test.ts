// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

const { mockGetTransaction, mockGetAccountInfo, mockDecode } = vi.hoisted(
  () => ({
    mockGetTransaction: vi.fn(),
    mockGetAccountInfo: vi.fn(),
    mockDecode: vi.fn(),
  })
);

vi.mock("@solana/web3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/web3.js")>();
  return {
    ...actual,
    Connection: class MockConnection {
      getTransaction = mockGetTransaction;
      getAccountInfo = mockGetAccountInfo;
    },
  };
});

vi.mock("@coral-xyz/anchor", () => ({
  BorshCoder: class MockBorshCoder {
    accounts = { decode: mockDecode };
  },
}));

vi.mock("@/domains/crowdfunding/lib/idl.json", () => ({
  default: { instructions: [], accounts: [], types: [], events: [], errors: [] },
}));

vi.mock("@/domains/crowdfunding/lib/constants", async () => {
  const { PublicKey: SolanaPublicKey } = await import("@solana/web3.js");
  return {
    CROWDFUNDING_PROGRAM_ID: new SolanaPublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    ),
    SOLANA_RPC_URL: "https://api.devnet.solana.com",
  };
});

import {
  CROWDFUNDING_PROGRAM_ID,
} from "@/domains/crowdfunding/lib/constants";
import { findContributionPda } from "@/domains/crowdfunding/lib/pda";
import { verifyContributionOnChain } from "@/domains/crowdfunding/lib/verify-contribution";

const campaign = new PublicKey("11111111111111111111111111111112");
const backer = new PublicKey("SysvarC1ock11111111111111111111111111111111");
const contribution = findContributionPda(campaign, backer);
const otherSigner = new PublicKey("SysvarRent111111111111111111111111111111111");

function transactionWithKeys(keys: PublicKey[], requiredSignatures = 1) {
  return {
    meta: {
      err: null,
      logMessages: [
        `Program ${CROWDFUNDING_PROGRAM_ID.toBase58()} invoke [1]`,
      ],
    },
    transaction: {
      message: {
        header: { numRequiredSignatures: requiredSignatures },
        getAccountKeys: () => ({ staticAccountKeys: keys }),
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTransaction.mockResolvedValue(
    transactionWithKeys([backer, campaign, contribution])
  );
  mockGetAccountInfo.mockResolvedValue({
    owner: CROWDFUNDING_PROGRAM_ID,
    data: Buffer.alloc(128),
  });
  mockDecode.mockReturnValue({
    campaign,
    backer,
    amount: new BN("1250000000"),
    rewardTier: null,
    refunded: false,
  });
});

describe("verifyContributionOnChain", () => {
  it("accepts a successful program transaction signed by the backer", async () => {
    const result = await verifyContributionOnChain({
      campaignPubkey: campaign.toBase58(),
      contributionPubkey: contribution.toBase58(),
      backerWalletAddress: backer.toBase58(),
      transactionSignature: "signature",
    });

    expect(result.amount.toString()).toBe("1250000000");
    expect(result.refunded).toBe(false);
  });

  it("rejects when the backer account is present but did not sign", async () => {
    mockGetTransaction.mockResolvedValue(
      transactionWithKeys([otherSigner, backer, campaign, contribution])
    );

    await expect(
      verifyContributionOnChain({
        campaignPubkey: campaign.toBase58(),
        contributionPubkey: contribution.toBase58(),
        backerWalletAddress: backer.toBase58(),
        transactionSignature: "signature",
      })
    ).rejects.toThrow("BACKER_DID_NOT_SIGN_TRANSACTION");
  });

  it("rejects a transaction that does not reference the expected PDA", async () => {
    mockGetTransaction.mockResolvedValue(
      transactionWithKeys([backer, campaign, otherSigner])
    );

    await expect(
      verifyContributionOnChain({
        campaignPubkey: campaign.toBase58(),
        contributionPubkey: contribution.toBase58(),
        backerWalletAddress: backer.toBase58(),
        transactionSignature: "signature",
      })
    ).rejects.toThrow("TRANSACTION_ACCOUNT_MISMATCH");
  });

  it("rejects a contribution account not owned by the crowdfunding program", async () => {
    mockGetAccountInfo.mockResolvedValue({
      owner: otherSigner,
      data: Buffer.alloc(128),
    });

    await expect(
      verifyContributionOnChain({
        campaignPubkey: campaign.toBase58(),
        contributionPubkey: contribution.toBase58(),
        backerWalletAddress: backer.toBase58(),
        transactionSignature: "signature",
      })
    ).rejects.toThrow("INVALID_CONTRIBUTION_ACCOUNT_OWNER");
  });
});
