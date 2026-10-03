import { BorshCoder, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import IDL from "./idl.json";
import {
  CROWDFUNDING_PROGRAM_ID,
  SOLANA_RPC_URL,
} from "./constants";

const coder = new BorshCoder(IDL as unknown as Idl);

export type OnChainCampaignStatus =
  | "SETUP"
  | "ACTIVE"
  | "SUCCESSFUL"
  | "FAILED"
  | "FINALIZED";

export type OnChainMilestoneStatus = "PENDING" | "APPROVED" | "RELEASED";

export async function readCampaignOnChain(
  campaignAddress: string
): Promise<{
  status: OnChainCampaignStatus;
  creator: string;
  currencyMint: string;
  goalAmount: string;
  deadline: string;
  contentHash: string;
}> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const address = new PublicKey(campaignAddress);
  const account = await connection.getAccountInfo(address, "confirmed");
  if (!account || !account.owner.equals(CROWDFUNDING_PROGRAM_ID)) {
    throw new Error("INVALID_CAMPAIGN_ACCOUNT");
  }

  const decoded = coder.accounts.decode("campaign", account.data) as {
    creator: PublicKey;
    currencyMint: PublicKey;
    goalAmount: BN;
    deadline: BN;
    contentHash: number[] | Uint8Array;
    status: Record<string, object>;
  };
  const variant = Object.keys(decoded.status)[0];
  const statusMap: Record<string, OnChainCampaignStatus> = {
    setup: "SETUP",
    active: "ACTIVE",
    successful: "SUCCESSFUL",
    failed: "FAILED",
    finalized: "FINALIZED",
  };
  const status = statusMap[variant];
  if (!status) throw new Error("UNKNOWN_CAMPAIGN_STATUS");
  return {
    status,
    creator: decoded.creator.toBase58(),
    currencyMint: decoded.currencyMint.toBase58(),
    goalAmount: decoded.goalAmount.toString(),
    deadline: decoded.deadline.toString(),
    contentHash: Buffer.from(decoded.contentHash).toString("hex"),
  };
}

export async function readMilestoneOnChain(
  milestoneAddress: string,
  expectedCampaignAddress: string
): Promise<{ status: OnChainMilestoneStatus; milestoneIndex: number }> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const address = new PublicKey(milestoneAddress);
  const expectedCampaign = new PublicKey(expectedCampaignAddress);
  const account = await connection.getAccountInfo(address, "confirmed");
  if (!account || !account.owner.equals(CROWDFUNDING_PROGRAM_ID)) {
    throw new Error("INVALID_MILESTONE_ACCOUNT");
  }
  const decoded = coder.accounts.decode("milestone", account.data) as {
    campaign: PublicKey;
    milestoneIndex: number;
    status: Record<string, object>;
  };
  if (!decoded.campaign.equals(expectedCampaign)) {
    throw new Error("MILESTONE_CAMPAIGN_MISMATCH");
  }
  const statusMap: Record<string, OnChainMilestoneStatus> = {
    pending: "PENDING",
    approved: "APPROVED",
    released: "RELEASED",
  };
  const status = statusMap[Object.keys(decoded.status)[0]];
  if (!status) throw new Error("UNKNOWN_MILESTONE_STATUS");
  return { status, milestoneIndex: decoded.milestoneIndex };
}

export async function readRewardTierOnChain(
  rewardTierAddress: string,
  expectedCampaignAddress: string
): Promise<{ tierIndex: number }> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const address = new PublicKey(rewardTierAddress);
  const expectedCampaign = new PublicKey(expectedCampaignAddress);
  const account = await connection.getAccountInfo(address, "confirmed");
  if (!account || !account.owner.equals(CROWDFUNDING_PROGRAM_ID)) {
    throw new Error("INVALID_REWARD_TIER_ACCOUNT");
  }
  const decoded = coder.accounts.decode("rewardTier", account.data) as {
    campaign: PublicKey;
    tierIndex: number;
  };
  if (!decoded.campaign.equals(expectedCampaign)) {
    throw new Error("REWARD_TIER_CAMPAIGN_MISMATCH");
  }
  return { tierIndex: decoded.tierIndex };
}

export async function verifyProgramTransaction(
  signature: string,
  expectedAccountAddresses: string[] = []
): Promise<void> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const transaction = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!transaction || transaction.meta?.err) {
    throw new Error("TRANSACTION_NOT_CONFIRMED");
  }
  const invoked = transaction.meta?.logMessages?.some((line) =>
    line.includes(`Program ${CROWDFUNDING_PROGRAM_ID.toBase58()} invoke`)
  );
  if (!invoked) throw new Error("TRANSACTION_DOES_NOT_INVOKE_PROGRAM");
  const staticKeys = transaction.transaction.message
    .getAccountKeys()
    .staticAccountKeys.map((key) => key.toBase58());
  if (
    expectedAccountAddresses.some((address) => !staticKeys.includes(address))
  ) {
    throw new Error("TRANSACTION_ACCOUNT_MISMATCH");
  }
}
