// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";

// Mock constants (same pattern as pda.test.ts)
vi.mock("@/domains/crowdfunding/lib/constants", async () => {
  const { PublicKey: PK } = await import("@solana/web3.js");
  return {
    CROWDFUNDING_PROGRAM_ID: new PK(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    ),
    SOLANA_RPC_URL: "https://api.devnet.solana.com",
  };
});

// Mock Connection to control getAccountInfo
const mockGetAccountInfo = vi.fn();

vi.mock("@solana/web3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/web3.js")>();
  return {
    ...actual,
    Connection: class MockConnection {
      getAccountInfo = mockGetAccountInfo;
    },
  };
});

import { buildContributeInstructions } from "@/domains/crowdfunding/lib/instruction-builder";
import { CROWDFUNDING_PROGRAM_ID } from "@/domains/crowdfunding/lib/constants";
import { findVaultPda, findContributionPda } from "@/domains/crowdfunding/lib/pda";

// Use well-known public keys for deterministic tests
const campaignPubkey = new PublicKey("11111111111111111111111111111112");
const backerPubkey = new PublicKey(
  "SysvarC1ock11111111111111111111111111111111"
);
const currencyMint = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

function defaultParams() {
  return {
    campaignPubkey,
    backerPubkey,
    currencyMint,
    amount: new BN(1_000_000),
    rewardTier: null as number | null,
  };
}

describe("buildContributeInstructions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: ATA does not exist
    mockGetAccountInfo.mockResolvedValue(null);
  });

  it("returns a single instruction when ATA already exists", async () => {
    mockGetAccountInfo.mockResolvedValue({ data: Buffer.alloc(165) });

    const instructions = await buildContributeInstructions(defaultParams());

    expect(instructions).toHaveLength(1);
  });

  it("returns two instructions (createATA + contribute) when ATA does not exist", async () => {
    mockGetAccountInfo.mockResolvedValue(null);

    const instructions = await buildContributeInstructions(defaultParams());

    expect(instructions).toHaveLength(2);
  });

  it("contribute instruction has the correct program ID", async () => {
    mockGetAccountInfo.mockResolvedValue({ data: Buffer.alloc(165) });

    const instructions = await buildContributeInstructions(defaultParams());
    const contributeIx = instructions[instructions.length - 1];

    expect(contributeIx.programId.equals(CROWDFUNDING_PROGRAM_ID)).toBe(true);
  });

  it("contribute instruction has exactly 7 accounts in correct order", async () => {
    mockGetAccountInfo.mockResolvedValue({ data: Buffer.alloc(165) });

    const instructions = await buildContributeInstructions(defaultParams());
    const contributeIx = instructions[instructions.length - 1];
    const keys = contributeIx.keys;

    expect(keys).toHaveLength(7);

    const expectedVault = findVaultPda(campaignPubkey);
    const expectedContribution = findContributionPda(
      campaignPubkey,
      backerPubkey
    );

    // Account order: contribution, campaign, vault, backerATA, backer, tokenProgram, systemProgram
    expect(keys[0].pubkey.equals(expectedContribution)).toBe(true);
    expect(keys[1].pubkey.equals(campaignPubkey)).toBe(true);
    expect(keys[2].pubkey.equals(expectedVault)).toBe(true);
    // keys[3] is backerATA — derived from currencyMint + backerPubkey
    expect(keys[4].pubkey.equals(backerPubkey)).toBe(true);
    expect(keys[5].pubkey.equals(TOKEN_PROGRAM_ID)).toBe(true);
    expect(keys[6].pubkey.equals(SystemProgram.programId)).toBe(true);
  });

  it("backer account is marked as signer", async () => {
    mockGetAccountInfo.mockResolvedValue({ data: Buffer.alloc(165) });

    const instructions = await buildContributeInstructions(defaultParams());
    const contributeIx = instructions[instructions.length - 1];

    // backer is at index 4
    expect(contributeIx.keys[4].isSigner).toBe(true);
  });

  it("vault, contribution, campaign, and backerATA are writable", async () => {
    mockGetAccountInfo.mockResolvedValue({ data: Buffer.alloc(165) });

    const instructions = await buildContributeInstructions(defaultParams());
    const contributeIx = instructions[instructions.length - 1];

    // contribution (0), campaign (1), vault (2), backerATA (3) — all writable
    expect(contributeIx.keys[0].isWritable).toBe(true); // contribution
    expect(contributeIx.keys[1].isWritable).toBe(true); // campaign
    expect(contributeIx.keys[2].isWritable).toBe(true); // vault
    expect(contributeIx.keys[3].isWritable).toBe(true); // backerATA
  });

  it("tokenProgram and systemProgram are not writable", async () => {
    mockGetAccountInfo.mockResolvedValue({ data: Buffer.alloc(165) });

    const instructions = await buildContributeInstructions(defaultParams());
    const contributeIx = instructions[instructions.length - 1];

    expect(contributeIx.keys[5].isWritable).toBe(false); // tokenProgram
    expect(contributeIx.keys[6].isWritable).toBe(false); // systemProgram
  });

  it("instruction data encodes rewardTier as null when not provided", async () => {
    mockGetAccountInfo.mockResolvedValue({ data: Buffer.alloc(165) });

    const params = defaultParams();
    params.rewardTier = null;

    const instructions = await buildContributeInstructions(params);
    const contributeIx = instructions[instructions.length - 1];

    // The instruction should have data (Buffer)
    expect(contributeIx.data).toBeInstanceOf(Buffer);
    expect(contributeIx.data.length).toBeGreaterThan(0);

    // Run again with a reward tier to confirm the data differs
    params.rewardTier = 2;
    const instructionsWithTier = await buildContributeInstructions(params);
    const contributeIxWithTier =
      instructionsWithTier[instructionsWithTier.length - 1];

    expect(contributeIx.data.equals(contributeIxWithTier.data)).toBe(false);
  });

  it("different campaign produces different vault and contribution PDAs", async () => {
    mockGetAccountInfo.mockResolvedValue({ data: Buffer.alloc(165) });

    const paramsA = defaultParams();
    // Use a different campaign pubkey but same backer (must be on-curve for ATA)
    const paramsB = {
      ...defaultParams(),
      campaignPubkey: new PublicKey(
        "SysvarRent111111111111111111111111111111111"
      ),
    };

    const instructionsA = await buildContributeInstructions(paramsA);
    const instructionsB = await buildContributeInstructions(paramsB);

    const contributeA = instructionsA[instructionsA.length - 1];
    const contributeB = instructionsB[instructionsB.length - 1];

    // contribution PDA (index 0) should differ
    expect(contributeA.keys[0].pubkey.equals(contributeB.keys[0].pubkey)).toBe(
      false
    );

    // campaign (index 1) should differ
    expect(contributeA.keys[1].pubkey.equals(contributeB.keys[1].pubkey)).toBe(
      false
    );

    // vault PDA (index 2) should differ
    expect(contributeA.keys[2].pubkey.equals(contributeB.keys[2].pubkey)).toBe(
      false
    );
  });
});
