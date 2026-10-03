use crate::errors::CrowdfundError;
use crate::events::CampaignActivated;
use crate::state::{Campaign, CampaignStatus, Milestone};
use anchor_lang::prelude::*;

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
    let campaign_key = ctx.accounts.campaign.key();
    let milestone_count = ctx.accounts.campaign.milestone_count;
    require!(
        ctx.remaining_accounts.len() == milestone_count as usize,
        CrowdfundError::InvalidMilestoneIndex
    );

    let mut milestone_total = 0u64;
    for (index, account_info) in ctx.remaining_accounts.iter().enumerate() {
        require_keys_eq!(*account_info.owner, crate::ID, CrowdfundError::Unauthorized);
        let mut data: &[u8] = &account_info.try_borrow_data()?;
        let milestone = Milestone::try_deserialize(&mut data)?;
        require_keys_eq!(
            milestone.campaign,
            campaign_key,
            CrowdfundError::Unauthorized
        );
        require!(
            milestone.milestone_index == index as u8,
            CrowdfundError::InvalidMilestoneIndex
        );
        milestone_total = milestone_total
            .checked_add(milestone.target_amount)
            .ok_or(error!(CrowdfundError::Overflow))?;
    }

    require!(
        milestone_total <= ctx.accounts.campaign.goal_amount,
        CrowdfundError::MilestoneAmountsExceedGoal
    );

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
