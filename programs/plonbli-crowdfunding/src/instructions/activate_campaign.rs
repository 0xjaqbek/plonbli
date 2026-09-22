use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::events::CampaignActivated;
use crate::state::{Campaign, CampaignStatus, Milestone};

#[derive(Accounts)]
pub struct ActivateCampaign<'info> {
    #[account(
        mut,
        has_one = creator @ CrowdfundError::Unauthorized,
        constraint = campaign.status == CampaignStatus::Setup @ CrowdfundError::CampaignNotInSetup,
        constraint = campaign.milestone_count >= 1 @ CrowdfundError::InvalidMilestoneIndex,
    )]
    pub campaign: Account<'info, Campaign>,

    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<ActivateCampaign>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    // Verify deadline is still in the future
    let clock = Clock::get()?;
    require!(
        campaign.deadline > clock.unix_timestamp,
        CrowdfundError::DeadlineInPast
    );

    campaign.status = CampaignStatus::Active;

    emit!(CampaignActivated {
        campaign: campaign.key(),
    });

    Ok(())
}
