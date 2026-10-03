use crate::errors::CrowdfundError;
use crate::events::MilestoneFundsReleased;
use crate::state::{Campaign, CampaignStatus, Milestone, MilestoneStatus, PlatformConfig};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct ReleaseMilestoneFunds<'info> {
    #[account(
        mut,
        constraint = milestone.campaign == campaign.key(),
        constraint = milestone.status == MilestoneStatus::Approved @ CrowdfundError::MilestoneNotApproved,
    )]
    pub milestone: Account<'info, Milestone>,

    #[account(
        mut,
        has_one = creator @ CrowdfundError::Unauthorized,
        constraint = campaign.status == CampaignStatus::Successful @ CrowdfundError::CampaignNotSuccessful,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(
        mut,
        seeds = [Campaign::VAULT_SEED, campaign.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Creator's token account to receive funds
    #[account(
        mut,
        constraint = creator_token_account.mint == campaign.currency_mint,
        constraint = creator_token_account.owner == creator.key(),
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// Treasury token account for fee collection
    #[account(
        mut,
        constraint = treasury_token_account.mint == campaign.currency_mint,
        constraint = treasury_token_account.owner == platform_config.treasury,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [PlatformConfig::SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ReleaseMilestoneFunds>) -> Result<()> {
    let milestone = &mut ctx.accounts.milestone;
    if milestone.milestone_index == 0 {
        require!(
            ctx.remaining_accounts.is_empty(),
            CrowdfundError::PreviousMilestoneNotReleased
        );
    } else {
        require!(
            ctx.remaining_accounts.len() == 1,
            CrowdfundError::PreviousMilestoneNotReleased
        );
        let previous_account = &ctx.remaining_accounts[0];
        require_keys_eq!(
            *previous_account.owner,
            crate::ID,
            CrowdfundError::PreviousMilestoneNotReleased
        );
        let mut previous_data: &[u8] = &previous_account.try_borrow_data()?;
        let previous_milestone = Milestone::try_deserialize(&mut previous_data)?;
        require_keys_eq!(
            previous_milestone.campaign,
            ctx.accounts.campaign.key(),
            CrowdfundError::PreviousMilestoneNotReleased
        );
        require!(
            previous_milestone.milestone_index
                == milestone
                    .milestone_index
                    .checked_sub(1)
                    .ok_or(error!(CrowdfundError::Overflow))?,
            CrowdfundError::PreviousMilestoneNotReleased
        );
        require!(
            previous_milestone.status == MilestoneStatus::Released,
            CrowdfundError::PreviousMilestoneNotReleased
        );
    }

    // A campaign can be under-funded with KeepWhatYouRaise or over-funded.
    // Release the configured tranche for intermediate milestones and drain the
    // remaining vault balance on the final milestone so tokens cannot become
    // permanently stranded in escrow.
    let is_final_milestone = milestone
        .milestone_index
        .checked_add(1)
        .ok_or(error!(CrowdfundError::Overflow))?
        == ctx.accounts.campaign.milestone_count;
    let release_amount = if is_final_milestone {
        ctx.accounts.vault.amount
    } else {
        milestone.target_amount.min(ctx.accounts.vault.amount)
    };

    // Calculate fee (rounds down — platform absorbs dust)
    let fee = (release_amount as u128)
        .checked_mul(ctx.accounts.platform_config.fee_basis_points as u128)
        .ok_or(error!(CrowdfundError::Overflow))?
        .checked_div(10_000)
        .ok_or(error!(CrowdfundError::Overflow))? as u64;

    let creator_amount = release_amount
        .checked_sub(fee)
        .ok_or(error!(CrowdfundError::Overflow))?;

    // PDA signer seeds for vault authority (campaign PDA is vault authority)
    let campaign = &ctx.accounts.campaign;
    let creator_key = campaign.creator;
    let campaign_id_bytes = campaign.campaign_id.to_le_bytes();
    let bump = [campaign.bump];
    let signer_seeds: &[&[&[u8]]] = &[&[
        Campaign::SEED,
        creator_key.as_ref(),
        &campaign_id_bytes,
        &bump,
    ]];

    // Transfer to creator
    if creator_amount > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.campaign.to_account_info(),
                },
                signer_seeds,
            ),
            creator_amount,
        )?;
    }

    // Transfer fee to treasury
    if fee > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.campaign.to_account_info(),
                },
                signer_seeds,
            ),
            fee,
        )?;
    }

    milestone.status = MilestoneStatus::Released;

    emit!(MilestoneFundsReleased {
        campaign: ctx.accounts.campaign.key(),
        milestone_index: milestone.milestone_index,
        amount: release_amount,
    });

    Ok(())
}
