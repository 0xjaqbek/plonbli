use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::events::CampaignActivated;
use crate::state::{Campaign, CampaignStatus};

#[derive(Accounts)]
pub struct ActivateCampaign<'info> {
    #[account(
        mut,
        has_one = creator @ CrowdfundError::Unauthorized,
        constraint = campaign.status == CampaignStatus::Setup @ CrowdfundError::CampaignNotInSetup,
    )]
    pub campaign: Account<'info, Campaign>,

    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<ActivateCampaign>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    campaign.status = CampaignStatus::Active;

    emit!(CampaignActivated {
        campaign: campaign.key(),
    });

    Ok(())
}
