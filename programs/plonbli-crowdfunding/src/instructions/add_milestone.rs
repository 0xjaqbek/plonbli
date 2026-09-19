use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::state::{Campaign, CampaignStatus, Milestone, MilestoneStatus};

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct AddMilestone<'info> {
    #[account(
        init,
        payer = creator,
        space = Milestone::LEN,
        seeds = [Milestone::SEED, campaign.key().as_ref(), &[milestone_index]],
        bump,
    )]
    pub milestone: Account<'info, Milestone>,

    #[account(
        mut,
        has_one = creator @ CrowdfundError::Unauthorized,
        constraint = campaign.status == CampaignStatus::Setup @ CrowdfundError::CampaignNotInSetup,
        constraint = campaign.milestone_count < Milestone::MAX_PER_CAMPAIGN @ CrowdfundError::MaxMilestonesReached,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddMilestone>,
    milestone_index: u8,
    target_amount: u64,
    description_hash: [u8; 32],
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    require!(
        milestone_index == campaign.milestone_count,
        CrowdfundError::InvalidMilestoneIndex
    );

    let milestone = &mut ctx.accounts.milestone;
    milestone.campaign = campaign.key();
    milestone.milestone_index = milestone_index;
    milestone.target_amount = target_amount;
    milestone.description_hash = description_hash;
    milestone.status = MilestoneStatus::Pending;
    milestone.approved_by = None;
    milestone.bump = ctx.bumps.milestone;

    campaign.milestone_count = campaign
        .milestone_count
        .checked_add(1)
        .ok_or(error!(CrowdfundError::Overflow))?;

    Ok(())
}
