use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::CrowdfundError;
use crate::events::CampaignFinalized;
use crate::state::{Campaign, CampaignStatus, FundingModel, PlatformConfig};

#[derive(Accounts)]
pub struct FinalizeCampaign<'info> {
    #[account(
        mut,
        constraint = campaign.status == CampaignStatus::Active @ CrowdfundError::CannotFinalize,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(
        mut,
        seeds = [Campaign::VAULT_SEED, campaign.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Creator's token account — receives funds if campaign succeeds with no milestones.
    /// Validated only when used for transfer.
    #[account(mut)]
    pub creator_token_account: Option<Account<'info, TokenAccount>>,

    /// Treasury token account for fee.
    /// Validated only when used for transfer.
    #[account(mut)]
    pub treasury_token_account: Option<Account<'info, TokenAccount>>,

    #[account(
        seeds = [PlatformConfig::SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// Anyone can call finalize after deadline
    pub caller: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<FinalizeCampaign>) -> Result<()> {
    let clock = Clock::get()?;
    let campaign = &ctx.accounts.campaign;

    require!(
        clock.unix_timestamp >= campaign.deadline,
        CrowdfundError::CampaignNotExpired
    );

    let goal_met = campaign.raised_amount >= campaign.goal_amount;

    let new_status = match (goal_met, campaign.funding_model) {
        (true, _) => CampaignStatus::Successful,
        (false, FundingModel::KeepWhatYouRaise) => CampaignStatus::Successful,
        (false, FundingModel::AllOrNothing) => CampaignStatus::Failed,
    };

    // If successful with no milestones, transfer all funds to creator now
    if new_status == CampaignStatus::Successful
        && campaign.milestone_count == 0
        && campaign.raised_amount > 0
    {
        let creator_token_account = ctx
            .accounts
            .creator_token_account
            .as_ref()
            .ok_or(error!(CrowdfundError::Unauthorized))?;

        // Validate creator_token_account
        require!(
            creator_token_account.mint == campaign.currency_mint,
            CrowdfundError::Unauthorized
        );
        require!(
            creator_token_account.owner == campaign.creator,
            CrowdfundError::Unauthorized
        );

        let total = campaign.raised_amount;
        let fee = (total as u128)
            .checked_mul(ctx.accounts.platform_config.fee_basis_points as u128)
            .ok_or(error!(CrowdfundError::Overflow))?
            .checked_div(10_000)
            .ok_or(error!(CrowdfundError::Overflow))? as u64;
        let creator_amount = total.checked_sub(fee).ok_or(error!(CrowdfundError::Overflow))?;

        let creator_key = campaign.creator;
        let campaign_id_bytes = campaign.campaign_id.to_le_bytes();
        let bump = [campaign.bump];
        let signer_seeds: &[&[&[u8]]] = &[&[
            Campaign::SEED,
            creator_key.as_ref(),
            &campaign_id_bytes,
            &bump,
        ]];

        if creator_amount > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: creator_token_account.to_account_info(),
                        authority: ctx.accounts.campaign.to_account_info(),
                    },
                    signer_seeds,
                ),
                creator_amount,
            )?;
        }

        if fee > 0 {
            if let Some(treasury_token_account) = ctx.accounts.treasury_token_account.as_ref() {
                // Validate treasury_token_account
                require!(
                    treasury_token_account.mint == campaign.currency_mint,
                    CrowdfundError::Unauthorized
                );
                require!(
                    treasury_token_account.owner == ctx.accounts.platform_config.treasury,
                    CrowdfundError::Unauthorized
                );

                token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.vault.to_account_info(),
                            to: treasury_token_account.to_account_info(),
                            authority: ctx.accounts.campaign.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    fee,
                )?;
            }
        }
    }

    let campaign = &mut ctx.accounts.campaign;
    campaign.status = new_status;

    emit!(CampaignFinalized {
        campaign: campaign.key(),
        status: new_status.to_u8(),
        total_raised: campaign.raised_amount,
    });

    Ok(())
}
