use anchor_lang::prelude::*;

#[account]
pub struct RewardTier {
    pub campaign: Pubkey,           // 32
    pub tier_index: u8,             // 1
    pub price: u64,                 // 8
    pub max_backers: u32,           // 4
    pub current_backers: u32,       // 4
    pub description_hash: [u8; 32], // 32
    pub is_product_linked: bool,    // 1
    pub bump: u8,                   // 1
}

impl RewardTier {
    pub const SEED: &'static [u8] = b"reward_tier";
    pub const MAX_PER_CAMPAIGN: u8 = 10;
    pub const LEN: usize = 8 + 32 + 1 + 8 + 4 + 4 + 32 + 1 + 1;
}
