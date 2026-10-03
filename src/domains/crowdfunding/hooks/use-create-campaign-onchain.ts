"use client";

import { useCallback, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import BN from "bn.js";
import { getProgram } from "../lib/program";
import {
  findCampaignPda,
  findMilestonePda,
  findRewardTierPda,
  findVaultPda,
} from "../lib/pda";
import { generateContentHash } from "../lib/content-hash";
import {
  campaignIdFromDatabaseId,
  generateCampaignContentHash,
} from "../lib/campaign-content";
import { parseTokenAmount } from "../lib/token-amount";

type MilestoneInput = {
  milestoneIndex: number;
  description: string;
  targetAmount: string;
};

type RewardTierInput = {
  tierIndex: number;
  description: string;
  price: string;
  maxBackers: number;
  isProductLinked: boolean;
};

type CreateCampaignParams = {
  campaignDatabaseId: string;
  goalAmount: string;
  deadline: Date;
  fundingModel: "ALL_OR_NOTHING" | "KEEP_WHAT_YOU_RAISE";
  currencyMint: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  milestones: MilestoneInput[];
  rewardTiers: RewardTierInput[];
};

type CampaignAccount = {
  creator: PublicKey;
  campaignId: BN;
  goalAmount: BN;
  currencyMint: PublicKey;
  fundingModel: Record<string, unknown>;
  deadline: BN;
  status: Record<string, unknown>;
  milestoneCount: number;
  rewardTierCount: number;
  contentHash: number[] | Uint8Array;
};

type MilestoneAccount = {
  campaign: PublicKey;
  milestoneIndex: number;
  targetAmount: BN;
  descriptionHash: number[] | Uint8Array;
};

type RewardTierAccount = {
  campaign: PublicKey;
  tierIndex: number;
  price: BN;
  maxBackers: number;
  descriptionHash: number[] | Uint8Array;
  isProductLinked: boolean;
};

function bytesEqual(
  actual: number[] | Uint8Array,
  expected: Uint8Array
): boolean {
  const values = Array.from(actual);
  return (
    values.length === expected.length &&
    values.every((value, index) => value === expected[index])
  );
}

function hasVariant(value: Record<string, unknown>, variant: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, variant);
}

export function useCreateCampaignOnChain() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCampaign = useCallback(
    async (params: CreateCampaignParams) => {
      if (!wallet) {
        setError("WALLET_NOT_CONNECTED");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(wallet);
        const campaignId = await campaignIdFromDatabaseId(
          params.campaignDatabaseId
        );
        const deadline = new BN(Math.floor(params.deadline.getTime() / 1000));
        const fundingModel =
          params.fundingModel === "ALL_OR_NOTHING" ? 0 : 1;
        const fundingModelVariant =
          fundingModel === 0 ? "allOrNothing" : "keepWhatYouRaise";

        const campaignPda = findCampaignPda(wallet.publicKey, campaignId);
        const vaultPda = findVaultPda(campaignPda);
        const currencyMint = new PublicKey(params.currencyMint);
        const mint = await getMint(connection, currencyMint);
        const goalAmount = parseTokenAmount(params.goalAmount, mint.decimals);
        const contentHash = await generateCampaignContentHash({
          title: params.title,
          description: params.description,
          images: params.images,
          category: params.category,
          fundingModel: params.fundingModel,
          currencyMint: params.currencyMint,
          goalAmount: params.goalAmount,
          deadline: params.deadline.toISOString(),
        });

        let createSignature: string | null = null;
        let campaignAccount = (await program.account.campaign.fetchNullable(
          campaignPda
        )) as CampaignAccount | null;

        if (!campaignAccount) {
          const createBuilder = program.methods
            .createCampaign(
              campaignId,
              goalAmount,
              deadline,
              fundingModel,
              Array.from(contentHash)
            )
            .accounts({
              campaign: campaignPda,
              vault: vaultPda,
              currencyMint,
              creator: wallet.publicKey,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            });

          await createBuilder.simulate();
          createSignature = await createBuilder.rpc();
          campaignAccount = (await program.account.campaign.fetch(
            campaignPda
          )) as CampaignAccount;
        }

        if (
          !campaignAccount.creator.equals(wallet.publicKey) ||
          !campaignAccount.campaignId.eq(campaignId) ||
          !campaignAccount.goalAmount.eq(goalAmount) ||
          !campaignAccount.currencyMint.equals(currencyMint) ||
          !campaignAccount.deadline.eq(deadline) ||
          !hasVariant(campaignAccount.fundingModel, fundingModelVariant) ||
          !bytesEqual(campaignAccount.contentHash, contentHash)
        ) {
          throw new Error("EXISTING_CAMPAIGN_CONFIGURATION_MISMATCH");
        }

        const isSetup = hasVariant(campaignAccount.status, "setup");
        const isActive = hasVariant(campaignAccount.status, "active");
        if (!isSetup && !isActive) {
          throw new Error("CAMPAIGN_CAN_NO_LONGER_BE_ACTIVATED");
        }

        let existingMilestoneCount = Number(campaignAccount.milestoneCount);
        let existingRewardTierCount = Number(campaignAccount.rewardTierCount);
        if (
          existingMilestoneCount > params.milestones.length ||
          existingRewardTierCount > params.rewardTiers.length
        ) {
          throw new Error("EXISTING_CAMPAIGN_CHILD_COUNT_MISMATCH");
        }

        const milestoneReceipts: Array<{
          index: number;
          pubkey: string;
          signature: string | null;
        }> = [];
        for (const milestone of params.milestones) {
          const milestonePda = findMilestonePda(
            campaignPda,
            milestone.milestoneIndex
          );
          const descriptionHash = await generateContentHash(
            milestone.description
          );
          const targetAmount = parseTokenAmount(
            milestone.targetAmount,
            mint.decimals
          );
          let signature: string | null = null;
          const existing = (await program.account.milestone.fetchNullable(
            milestonePda
          )) as MilestoneAccount | null;

          if (existing) {
            if (
              !existing.campaign.equals(campaignPda) ||
              existing.milestoneIndex !== milestone.milestoneIndex ||
              !existing.targetAmount.eq(targetAmount) ||
              !bytesEqual(existing.descriptionHash, descriptionHash)
            ) {
              throw new Error("EXISTING_MILESTONE_CONFIGURATION_MISMATCH");
            }
          } else {
            if (isActive || milestone.milestoneIndex !== existingMilestoneCount) {
              throw new Error("MISSING_ON_CHAIN_MILESTONE");
            }
            const builder = program.methods
              .addMilestone(
                milestone.milestoneIndex,
                targetAmount,
                Array.from(descriptionHash)
              )
              .accounts({
                milestone: milestonePda,
                campaign: campaignPda,
                creator: wallet.publicKey,
                systemProgram: SystemProgram.programId,
              });
            await builder.simulate();
            signature = await builder.rpc();
            existingMilestoneCount += 1;
          }

          milestoneReceipts.push({
            index: milestone.milestoneIndex,
            pubkey: milestonePda.toBase58(),
            signature,
          });
        }

        const rewardTierReceipts: Array<{
          index: number;
          pubkey: string;
          signature: string | null;
        }> = [];
        for (const tier of params.rewardTiers) {
          const rewardTierPda = findRewardTierPda(
            campaignPda,
            tier.tierIndex
          );
          const descriptionHash = await generateContentHash(tier.description);
          const price = parseTokenAmount(tier.price, mint.decimals);
          let signature: string | null = null;
          const existing = (await program.account.rewardTier.fetchNullable(
            rewardTierPda
          )) as RewardTierAccount | null;

          if (existing) {
            if (
              !existing.campaign.equals(campaignPda) ||
              existing.tierIndex !== tier.tierIndex ||
              !existing.price.eq(price) ||
              existing.maxBackers !== tier.maxBackers ||
              existing.isProductLinked !== tier.isProductLinked ||
              !bytesEqual(existing.descriptionHash, descriptionHash)
            ) {
              throw new Error("EXISTING_REWARD_TIER_CONFIGURATION_MISMATCH");
            }
          } else {
            if (isActive || tier.tierIndex !== existingRewardTierCount) {
              throw new Error("MISSING_ON_CHAIN_REWARD_TIER");
            }
            const builder = program.methods
              .addRewardTier(
                tier.tierIndex,
                price,
                tier.maxBackers,
                Array.from(descriptionHash),
                tier.isProductLinked
              )
              .accounts({
                rewardTier: rewardTierPda,
                campaign: campaignPda,
                creator: wallet.publicKey,
                systemProgram: SystemProgram.programId,
              });
            await builder.simulate();
            signature = await builder.rpc();
            existingRewardTierCount += 1;
          }

          rewardTierReceipts.push({
            index: tier.tierIndex,
            pubkey: rewardTierPda.toBase58(),
            signature,
          });
        }

        if (
          existingMilestoneCount !== params.milestones.length ||
          existingRewardTierCount !== params.rewardTiers.length
        ) {
          throw new Error("ON_CHAIN_SETUP_INCOMPLETE");
        }

        let activationSignature: string | null = null;
        if (isSetup) {
          const activateBuilder = program.methods
            .activateCampaign()
            .accounts({
              campaign: campaignPda,
              creator: wallet.publicKey,
            })
            .remainingAccounts(
              params.milestones.map((milestone) => ({
                pubkey: findMilestonePda(
                  campaignPda,
                  milestone.milestoneIndex
                ),
                isSigner: false,
                isWritable: false,
              }))
            );
          await activateBuilder.simulate();
          activationSignature = await activateBuilder.rpc();
        }

        return {
          createSignature,
          activationSignature,
          milestoneReceipts,
          rewardTierReceipts,
          campaignPubkey: campaignPda.toBase58(),
          creatorWalletAddress: wallet.publicKey.toBase58(),
        };
      } catch (cause: unknown) {
        setError(
          cause instanceof Error ? cause.message : "TRANSACTION_FAILED"
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet]
  );

  return { createCampaign, loading, error, connected: !!wallet };
}
