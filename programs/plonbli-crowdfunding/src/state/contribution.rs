use anchor_lang::prelude::*;

#[account]
pub struct Contribution {
    pub campaign: Pubkey,       // 32
    pub backer: Pubkey,         // 32
    pub amount: u64,            // 8
    pub reward_tier: Option<u8>, // 1 + 1
    pub timestamp: i64,         // 8
    pub refunded: bool,         // 1
    pub bump: u8,               // 1
}

impl Contribution {
    pub const SEED: &'static [u8] = b"contribution";
    pub const LEN: usize = 8 + 32 + 32 + 8 + 2 + 8 + 1 + 1;
}
