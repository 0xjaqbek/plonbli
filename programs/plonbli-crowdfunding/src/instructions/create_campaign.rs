use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::errors::CrowdfundError;
use crate::events::CampaignCreated;
use crate::state::{Campaign, CampaignStatus, FundingModel};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = creator,
        space = Campaign::LEN,
        seeds = [Campaign::SEED, creator.key().as_ref(), &campaign_id.to_le_bytes()],
        bump,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(
        init,
        payer = creator,
        token::mint = currency_mint,
        token::authority = campaign,
        seeds = [Campaign::VAULT_SEED, campaign.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub currency_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateCampaign>,
    campaign_id: u64,
    goal_amount: u64,
    deadline: i64,
    funding_model: u8,
    content_hash: [u8; 32],
) -> Result<()> {
    require!(goal_amount > 0, CrowdfundError::ZeroGoalAmount);

    let clock = Clock::get()?;
    require!(deadline > clock.unix_timestamp, CrowdfundError::DeadlineInPast);

    let model = FundingModel::from_u8(funding_model)?;

    let campaign = &mut ctx.accounts.campaign;
    campaign.creator = ctx.accounts.creator.key();
    campaign.campaign_id = campaign_id;
    campaign.goal_amount = goal_amount;
    campaign.raised_amount = 0;
    campaign.currency_mint = ctx.accounts.currency_mint.key();
    campaign.funding_model = model;
    campaign.deadline = deadline;
    campaign.status = CampaignStatus::Setup;
    campaign.milestone_count = 0;
    campaign.reward_tier_count = 0;
    campaign.content_hash = content_hash;
    campaign.backer_count = 0;
    campaign.bump = ctx.bumps.campaign;

    emit!(CampaignCreated {
        campaign: campaign.key(),
        creator: campaign.creator,
        campaign_id,
        goal_amount,
        currency_mint: campaign.currency_mint,
        deadline,
    });

    Ok(())
}
