use crate::errors::CrowdfundError;
use crate::events::RefundClaimed;
use crate::state::{Campaign, CampaignStatus, Contribution};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(
        mut,
        has_one = backer,
        constraint = contribution.campaign == campaign.key(),
        constraint = !contribution.refunded @ CrowdfundError::AlreadyRefunded,
    )]
    pub contribution: Account<'info, Contribution>,

    #[account(
        constraint = campaign.status == CampaignStatus::Failed @ CrowdfundError::RefundNotAvailable,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(
        mut,
        seeds = [Campaign::VAULT_SEED, campaign.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Backer's token account to receive refund
    #[account(
        mut,
        constraint = backer_token_account.mint == campaign.currency_mint,
        constraint = backer_token_account.owner == backer.key(),
    )]
    pub backer_token_account: Account<'info, TokenAccount>,

    pub backer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimRefund>) -> Result<()> {
    let refund_amount = ctx.accounts.contribution.amount;

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

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.backer_token_account.to_account_info(),
                authority: ctx.accounts.campaign.to_account_info(),
            },
            signer_seeds,
        ),
        refund_amount,
    )?;

    let contribution = &mut ctx.accounts.contribution;
    contribution.refunded = true;

    emit!(RefundClaimed {
        campaign: ctx.accounts.campaign.key(),
        backer: contribution.backer,
        amount: refund_amount,
    });

    Ok(())
}
