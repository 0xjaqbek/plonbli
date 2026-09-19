use anchor_lang::prelude::*;

#[account]
pub struct PlatformConfig {
    pub admin: Pubkey,         // 32
    pub fee_basis_points: u16, // 2
    pub treasury: Pubkey,      // 32
    pub bump: u8,              // 1
}

impl PlatformConfig {
    pub const SEED: &'static [u8] = b"platform_config";
    pub const LEN: usize = 8 + 32 + 2 + 32 + 1;
}
