use anchor_lang::prelude::*;

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub campaign_id: u64,
    pub goal_amount: u64,
    pub currency_mint: Pubkey,
    pub deadline: i64,
}

#[event]
pub struct CampaignActivated {
    pub campaign: Pubkey,
}

#[event]
pub struct ContributionMade {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
    pub total_raised: u64,
}

#[event]
pub struct MilestoneApproved {
    pub campaign: Pubkey,
    pub milestone_index: u8,
    pub approved_by: Pubkey,
}

#[event]
pub struct MilestoneFundsReleased {
    pub campaign: Pubkey,
    pub milestone_index: u8,
    pub amount: u64,
}

#[event]
pub struct CampaignFinalized {
    pub campaign: Pubkey,
    pub status: u8,
    pub total_raised: u64,
}

#[event]
pub struct RefundClaimed {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
}
