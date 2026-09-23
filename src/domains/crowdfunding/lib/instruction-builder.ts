import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  Connection,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { BorshCoder } from "@coral-xyz/anchor";
import BN from "bn.js";
import IDL from "./idl.json";
import { CROWDFUNDING_PROGRAM_ID, SOLANA_RPC_URL } from "./constants";
import { findVaultPda, findContributionPda } from "./pda";

const coder = new BorshCoder(IDL as any);

type BuildContributeParams = {
  campaignPubkey: PublicKey;
  backerPubkey: PublicKey;
  currencyMint: PublicKey;
  /** Amount in smallest token units (e.g. lamports) */
  amount: BN;
  /** Tier index (0-9) or null for no tier */
  rewardTier: number | null;
};

/**
 * Builds unsigned contribute instruction(s) for the crowdfunding program.
 * Derives vault PDA internally — never exposes it.
 *
 * Returns 1 or 2 instructions:
 * - If backer's ATA doesn't exist: [createATA, contribute]
 * - If backer's ATA exists: [contribute]
 */
export async function buildContributeInstructions(
  params: BuildContributeParams
): Promise<TransactionInstruction[]> {
  const { campaignPubkey, backerPubkey, currencyMint, amount, rewardTier } =
    params;

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const instructions: TransactionInstruction[] = [];

  // Derive PDAs
  const vaultPda = findVaultPda(campaignPubkey);
  const contributionPda = findContributionPda(campaignPubkey, backerPubkey);

  // Get backer's Associated Token Account
  const backerAta = getAssociatedTokenAddressSync(currencyMint, backerPubkey);

  // Check if ATA exists; if not, prepend create instruction
  const ataInfo = await connection.getAccountInfo(backerAta);
  if (!ataInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        backerPubkey, // payer
        backerAta, // ata
        backerPubkey, // owner
        currencyMint // mint
      )
    );
  }

  // Encode instruction data using Anchor's BorshCoder
  const data = coder.instruction.encode("contribute", {
    amount,
    rewardTier: rewardTier !== null ? rewardTier : null,
  });

  // Build accounts array matching IDL order exactly:
  // contribution, campaign, vault, backerTokenAccount, backer, tokenProgram, systemProgram
  const keys = [
    {
      pubkey: contributionPda,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: campaignPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vaultPda,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: backerAta,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: backerPubkey,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      programId: CROWDFUNDING_PROGRAM_ID,
      keys,
      data,
    })
  );

  return instructions;
}
