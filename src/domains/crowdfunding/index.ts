// Schemas
export {
  createCampaignSchema,
  updateCampaignSchema,
  addMilestoneSchema,
  addRewardTierSchema,
  contributeSchema,
  type CreateCampaignInput,
  type UpdateCampaignInput,
  type AddMilestoneInput,
  type AddRewardTierInput,
  type ContributeInput,
} from "./schemas/validation";

// Solana utilities
export {
  CROWDFUNDING_PROGRAM_ID,
  SOL_NATIVE_MINT,
  SOLANA_RPC_URL,
  SOLANA_NETWORK,
} from "./lib/constants";

export {
  findPlatformConfigPda,
  findCampaignPda,
  findVaultPda,
  findMilestonePda,
  findRewardTierPda,
  findContributionPda,
} from "./lib/pda";

export {
  generateContentHash,
  hashToHex,
  hexToHash,
} from "./lib/content-hash";

// Components
export { SolanaWalletProvider } from "./components/solana-wallet-provider";
export { CampaignCard } from "./components/campaign-card";
export { CampaignDetail } from "./components/campaign-detail";
export { CampaignManagement } from "./components/campaign-management";
export { ContributeDialog } from "./components/contribute-dialog";
export { WalletButton } from "./components/wallet-button";
export { CreateCampaignForm } from "./components/create-campaign-form";
export { MilestoneForm } from "./components/milestone-form";
export { RewardTierForm } from "./components/reward-tier-form";

// Actions
export { createCampaignAction } from "./actions/create-campaign";
export { addMilestoneAction } from "./actions/add-milestone";
export { addRewardTierAction } from "./actions/add-reward-tier";
export { deleteMilestoneAction } from "./actions/delete-milestone";
export { deleteRewardTierAction } from "./actions/delete-reward-tier";
export { activateCampaignAction } from "./actions/activate-campaign";
export { contributeAction } from "./actions/contribute";

// Queries
// Hooks
export { useCreateCampaignOnChain } from "./hooks/use-create-campaign-onchain";
export { useContributeOnChain } from "./hooks/use-contribute-onchain";

// Program
export { getProgram, getReadonlyProgram } from "./lib/program";

// Queries
export { getCampaigns, getCampaignById } from "./queries/get-campaigns";
export { getMilestones } from "./queries/get-milestones";
export { getRewardTiers } from "./queries/get-reward-tiers";
