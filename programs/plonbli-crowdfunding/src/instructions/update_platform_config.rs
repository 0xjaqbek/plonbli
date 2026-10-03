use crate::errors::CrowdfundError;
use crate::state::PlatformConfig;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdatePlatformConfig<'info> {
    #[account(
        mut,
        seeds = [PlatformConfig::SEED],
        bump = platform_config.bump,
        has_one = admin @ CrowdfundError::Unauthorized,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub admin: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdatePlatformConfig>,
    fee_basis_points: Option<u16>,
    new_treasury: Option<Pubkey>,
) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;

    if let Some(fee) = fee_basis_points {
        require!(fee <= 1000, CrowdfundError::FeeTooHigh);
        config.fee_basis_points = fee;
    }

    if let Some(treasury) = new_treasury {
        config.treasury = treasury;
    }

    Ok(())
}
