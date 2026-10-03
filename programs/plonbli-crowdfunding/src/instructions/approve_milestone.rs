use crate::errors::CrowdfundError;
use crate::events::MilestoneApproved;
use crate::state::{Campaign, CampaignStatus, Milestone, MilestoneStatus, PlatformConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ApproveMilestone<'info> {
    #[account(
        mut,
        constraint = milestone.campaign == campaign.key(),
        constraint = milestone.status == MilestoneStatus::Pending @ CrowdfundError::MilestoneNotPending,
    )]
    pub milestone: Account<'info, Milestone>,

    #[account(
        constraint = campaign.status == CampaignStatus::Active
            || campaign.status == CampaignStatus::Successful @ CrowdfundError::CampaignNotActive,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(
        seeds = [PlatformConfig::SEED],
        bump = platform_config.bump,
        has_one = admin @ CrowdfundError::Unauthorized,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<ApproveMilestone>) -> Result<()> {
    let clock = Clock::get()?;
    let milestone = &mut ctx.accounts.milestone;
    milestone.status = MilestoneStatus::Approved;
    milestone.approved_by = Some(ctx.accounts.admin.key());
    milestone.approved_at = Some(clock.unix_timestamp);

    emit!(MilestoneApproved {
        campaign: ctx.accounts.campaign.key(),
        milestone_index: milestone.milestone_index,
        approved_by: ctx.accounts.admin.key(),
    });

    Ok(())
}
