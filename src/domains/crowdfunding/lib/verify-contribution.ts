import { BorshCoder, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import IDL from "./idl.json";
import {
  CROWDFUNDING_PROGRAM_ID,
  SOLANA_RPC_URL,
} from "./constants";
import { findContributionPda } from "./pda";

const coder = new BorshCoder(IDL as unknown as Idl);

export type VerifiedContribution = {
  amount: BN;
  rewardTierIndex: number | null;
  refunded: boolean;
};

export async function readContributionOnChain(input: {
  campaignPubkey: string;
  contributionPubkey: string;
  backerWalletAddress: string;
}): Promise<VerifiedContribution> {
  const campaign = new PublicKey(input.campaignPubkey);
  const backer = new PublicKey(input.backerWalletAddress);
  const contribution = new PublicKey(input.contributionPubkey);
  const expectedContribution = findContributionPda(campaign, backer);

  if (!contribution.equals(expectedContribution)) {
    throw new Error("INVALID_CONTRIBUTION_PDA");
  }

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const account = await connection.getAccountInfo(contribution, "confirmed");
  if (!account || !account.owner.equals(CROWDFUNDING_PROGRAM_ID)) {
    throw new Error("INVALID_CONTRIBUTION_ACCOUNT_OWNER");
  }

  const decoded = coder.accounts.decode("contribution", account.data) as {
    campaign: PublicKey;
    backer: PublicKey;
    amount: BN;
    rewardTier: number | null;
    refunded: boolean;
  };

  if (!decoded.campaign.equals(campaign) || !decoded.backer.equals(backer)) {
    throw new Error("CONTRIBUTION_ACCOUNT_MISMATCH");
  }

  return {
    amount: decoded.amount,
    rewardTierIndex:
      decoded.rewardTier === null || decoded.rewardTier === undefined
        ? null
        : Number(decoded.rewardTier),
    refunded: decoded.refunded,
  };
}

export async function verifyContributionOnChain(input: {
  campaignPubkey: string;
  contributionPubkey: string;
  backerWalletAddress: string;
  transactionSignature: string;
}): Promise<VerifiedContribution> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const transaction = await connection.getTransaction(
    input.transactionSignature,
    {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    }
  );

  if (!transaction || transaction.meta?.err) {
    throw new Error("TRANSACTION_NOT_CONFIRMED");
  }

  const invokedProgram = transaction.meta?.logMessages?.some((line) =>
    line.includes(`Program ${CROWDFUNDING_PROGRAM_ID.toBase58()} invoke`)
  );
  if (!invokedProgram) {
    throw new Error("TRANSACTION_DOES_NOT_INVOKE_PROGRAM");
  }
  const message = transaction.transaction.message;
  const staticKeys = message.getAccountKeys().staticAccountKeys;
  const accountAddresses = staticKeys.map((key) => key.toBase58());
  if (
    !accountAddresses.includes(input.campaignPubkey) ||
    !accountAddresses.includes(input.contributionPubkey) ||
    !accountAddresses.includes(input.backerWalletAddress)
  ) {
    throw new Error("TRANSACTION_ACCOUNT_MISMATCH");
  }
  const signerAddresses = staticKeys
    .slice(0, message.header.numRequiredSignatures)
    .map((key) => key.toBase58());
  if (!signerAddresses.includes(input.backerWalletAddress)) {
    throw new Error("BACKER_DID_NOT_SIGN_TRANSACTION");
  }

  const decoded = await readContributionOnChain(input);
  if (decoded.refunded) {
    throw new Error("CONTRIBUTION_ALREADY_REFUNDED");
  }
  return decoded;
}
