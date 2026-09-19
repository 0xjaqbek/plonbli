use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MilestoneStatus {
    Pending,
    Approved,
    Released,
}

#[account]
pub struct Milestone {
    pub campaign: Pubkey,              // 32
    pub milestone_index: u8,           // 1
    pub target_amount: u64,            // 8
    pub description_hash: [u8; 32],    // 32
    pub status: MilestoneStatus,       // 1
    pub approved_by: Option<Pubkey>,   // 1 + 32
    pub bump: u8,                      // 1
}

impl Milestone {
    pub const SEED: &'static [u8] = b"milestone";
    pub const MAX_PER_CAMPAIGN: u8 = 10;
    pub const LEN: usize = 8 + 32 + 1 + 8 + 32 + 1 + (1 + 32) + 1;
}
