use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum FundingModel {
    AllOrNothing,
    KeepWhatYouRaise,
}

impl FundingModel {
    pub fn from_u8(value: u8) -> Result<Self> {
        match value {
            0 => Ok(FundingModel::AllOrNothing),
            1 => Ok(FundingModel::KeepWhatYouRaise),
            _ => Err(error!(crate::errors::CrowdfundError::InvalidFundingModel)),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CampaignStatus {
    Setup,
    Active,
    Successful,
    Failed,
    Finalized,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,            // 32
    pub campaign_id: u64,           // 8
    pub goal_amount: u64,           // 8
    pub raised_amount: u64,         // 8
    pub currency_mint: Pubkey,      // 32
    pub funding_model: FundingModel, // 1
    pub deadline: i64,              // 8
    pub status: CampaignStatus,     // 1
    pub milestone_count: u8,        // 1
    pub reward_tier_count: u8,      // 1
    pub content_hash: [u8; 32],     // 32
    pub backer_count: u32,          // 4
    pub bump: u8,                   // 1
}

impl Campaign {
    pub const SEED: &'static [u8] = b"campaign";
    pub const VAULT_SEED: &'static [u8] = b"vault";
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 32 + 1 + 8 + 1 + 1 + 1 + 32 + 4 + 1;
}
