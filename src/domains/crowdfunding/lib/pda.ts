import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { CROWDFUNDING_PROGRAM_ID } from "./constants";

export function findPlatformConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    CROWDFUNDING_PROGRAM_ID
  );
  return pda;
}

export function findCampaignPda(
  creator: PublicKey,
  campaignId: BN | number
): PublicKey {
  const id = typeof campaignId === "number" ? new BN(campaignId) : campaignId;
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("campaign"),
      creator.toBuffer(),
      id.toArrayLike(Buffer, "le", 8),
    ],
    CROWDFUNDING_PROGRAM_ID
  );
  return pda;
}

export function findVaultPda(campaign: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), campaign.toBuffer()],
    CROWDFUNDING_PROGRAM_ID
  );
  return pda;
}

export function findMilestonePda(
  campaign: PublicKey,
  milestoneIndex: number
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("milestone"),
      campaign.toBuffer(),
      Buffer.from([milestoneIndex]),
    ],
    CROWDFUNDING_PROGRAM_ID
  );
  return pda;
}

export function findRewardTierPda(
  campaign: PublicKey,
  tierIndex: number
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("reward_tier"),
      campaign.toBuffer(),
      Buffer.from([tierIndex]),
    ],
    CROWDFUNDING_PROGRAM_ID
  );
  return pda;
}

export function findContributionPda(
  campaign: PublicKey,
  backer: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("contribution"), campaign.toBuffer(), backer.toBuffer()],
    CROWDFUNDING_PROGRAM_ID
  );
  return pda;
}
