use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::state::{Campaign, CampaignStatus, RewardTier};

#[derive(Accounts)]
#[instruction(tier_index: u8)]
pub struct AddRewardTier<'info> {
    #[account(
        init,
        payer = creator,
        space = RewardTier::LEN,
        seeds = [RewardTier::SEED, campaign.key().as_ref(), &[tier_index]],
        bump,
    )]
    pub reward_tier: Account<'info, RewardTier>,

    #[account(
        mut,
        has_one = creator @ CrowdfundError::Unauthorized,
        constraint = campaign.status == CampaignStatus::Setup @ CrowdfundError::CampaignNotInSetup,
        constraint = campaign.reward_tier_count < RewardTier::MAX_PER_CAMPAIGN @ CrowdfundError::MaxRewardTiersReached,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddRewardTier>,
    tier_index: u8,
    price: u64,
    max_backers: u32,
    description_hash: [u8; 32],
    is_product_linked: bool,
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    require!(
        tier_index == campaign.reward_tier_count,
        CrowdfundError::InvalidRewardTierIndex
    );

    require!(price > 0, CrowdfundError::ZeroRewardTierPrice);

    let tier = &mut ctx.accounts.reward_tier;
    tier.campaign = campaign.key();
    tier.tier_index = tier_index;
    tier.price = price;
    tier.max_backers = max_backers;
    tier.current_backers = 0;
    tier.description_hash = description_hash;
    tier.is_product_linked = is_product_linked;
    tier.bump = ctx.bumps.reward_tier;

    campaign.reward_tier_count = campaign
        .reward_tier_count
        .checked_add(1)
        .ok_or(error!(CrowdfundError::Overflow))?;

    Ok(())
}
