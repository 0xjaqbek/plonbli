use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = admin,
        space = PlatformConfig::LEN,
        seeds = [PlatformConfig::SEED],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: Treasury account that will receive fees. Can be any account.
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializePlatform>, fee_basis_points: u16) -> Result<()> {
    require!(fee_basis_points <= 1000, CrowdfundError::FeeTooHigh);

    let config = &mut ctx.accounts.platform_config;
    config.admin = ctx.accounts.admin.key();
    config.fee_basis_points = fee_basis_points;
    config.treasury = ctx.accounts.treasury.key();
    config.bump = ctx.bumps.platform_config;

    Ok(())
}
