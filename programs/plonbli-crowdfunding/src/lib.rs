use anchor_lang::prelude::*;

declare_id!("63fEfSpaubSMFFvGVo5ALKye38XACxTCwBtL1rR1beRX");

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod plonbli_crowdfunding {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        fee_basis_points: u16,
    ) -> Result<()> {
        instructions::initialize_platform::handler(ctx, fee_basis_points)
    }

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        goal_amount: u64,
        deadline: i64,
        funding_model: u8,
        content_hash: [u8; 32],
    ) -> Result<()> {
        instructions::create_campaign::handler(
            ctx,
            campaign_id,
            goal_amount,
            deadline,
            funding_model,
            content_hash,
        )
    }

    pub fn add_milestone(
        ctx: Context<AddMilestone>,
        milestone_index: u8,
        target_amount: u64,
        description_hash: [u8; 32],
    ) -> Result<()> {
        instructions::add_milestone::handler(ctx, milestone_index, target_amount, description_hash)
    }

    pub fn add_reward_tier(
        ctx: Context<AddRewardTier>,
        tier_index: u8,
        price: u64,
        max_backers: u32,
        description_hash: [u8; 32],
        is_product_linked: bool,
    ) -> Result<()> {
        instructions::add_reward_tier::handler(
            ctx,
            tier_index,
            price,
            max_backers,
            description_hash,
            is_product_linked,
        )
    }

    pub fn activate_campaign(ctx: Context<ActivateCampaign>) -> Result<()> {
        instructions::activate_campaign::handler(ctx)
    }

    pub fn contribute(
        ctx: Context<Contribute>,
        amount: u64,
        reward_tier: Option<u8>,
    ) -> Result<()> {
        instructions::contribute::handler(ctx, amount, reward_tier)
    }

    pub fn approve_milestone(ctx: Context<ApproveMilestone>) -> Result<()> {
        instructions::approve_milestone::handler(ctx)
    }

    pub fn release_milestone_funds(ctx: Context<ReleaseMilestoneFunds>) -> Result<()> {
        instructions::release_milestone_funds::handler(ctx)
    }

    pub fn finalize_campaign(ctx: Context<FinalizeCampaign>) -> Result<()> {
        instructions::finalize_campaign::handler(ctx)
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        instructions::claim_refund::handler(ctx)
    }

    pub fn update_platform_config(
        ctx: Context<UpdatePlatformConfig>,
        fee_basis_points: Option<u16>,
        new_treasury: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_platform_config::handler(ctx, fee_basis_points, new_treasury)
    }
}
