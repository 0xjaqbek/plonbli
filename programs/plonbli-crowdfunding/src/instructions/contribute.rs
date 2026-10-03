use crate::errors::CrowdfundError;
use crate::events::ContributionMade;
use crate::state::{Campaign, CampaignStatus, Contribution, RewardTier};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(
        init_if_needed,
        payer = backer,
        space = Contribution::LEN,
        seeds = [Contribution::SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump,
    )]
    pub contribution: Account<'info, Contribution>,

    #[account(
        mut,
        constraint = campaign.status == CampaignStatus::Active @ CrowdfundError::CampaignNotActive,
    )]
    pub campaign: Account<'info, Campaign>,

    /// Optional reward tier account — must be provided if reward_tier param is Some
    #[account(mut)]
    pub reward_tier_account: Option<Account<'info, RewardTier>>,

    #[account(
        mut,
        seeds = [Campaign::VAULT_SEED, campaign.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The backer's token account to transfer from
    #[account(
        mut,
        constraint = backer_token_account.mint == campaign.currency_mint,
        constraint = backer_token_account.owner == backer.key(),
    )]
    pub backer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub backer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Contribute>, amount: u64, reward_tier: Option<u8>) -> Result<()> {
    require!(amount > 0, CrowdfundError::ZeroContribution);

    let clock = Clock::get()?;
    let campaign = &ctx.accounts.campaign;
    require!(
        clock.unix_timestamp < campaign.deadline,
        CrowdfundError::CampaignExpired
    );

    let contribution = &ctx.accounts.contribution;
    let is_new = contribution.amount == 0 && contribution.campaign == Pubkey::default();

    if !is_new {
        require!(
            contribution.reward_tier == reward_tier,
            CrowdfundError::RewardTierMismatch
        );
    }

    // Validate reward tier if specified
    if let Some(tier_index) = reward_tier {
        let tier_account = ctx
            .accounts
            .reward_tier_account
            .as_mut()
            .ok_or(error!(CrowdfundError::InsufficientForRewardTier))?;

        // Verify tier belongs to this campaign
        require!(
            tier_account.campaign == campaign.key(),
            CrowdfundError::Unauthorized
        );
        require!(
            tier_account.tier_index == tier_index,
            CrowdfundError::InvalidRewardTierIndex
        );

        // Enforce minimum contribution
        require!(
            amount >= tier_account.price,
            CrowdfundError::InsufficientForRewardTier
        );

        // Check capacity (0 = unlimited)
        if tier_account.max_backers > 0 {
            require!(
                tier_account.current_backers < tier_account.max_backers,
                CrowdfundError::RewardTierFull
            );
        }

        // Capacity counts unique backers, not repeated contributions.
        if is_new {
            tier_account.current_backers = tier_account
                .current_backers
                .checked_add(1)
                .ok_or(error!(CrowdfundError::Overflow))?;
        }
    }

    // Transfer tokens from backer to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.backer_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.backer.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update contribution (init_if_needed handles first-time creation)
    let contribution = &mut ctx.accounts.contribution;

    if is_new {
        contribution.campaign = ctx.accounts.campaign.key();
        contribution.backer = ctx.accounts.backer.key();
        contribution.amount = amount;
        contribution.reward_tier = reward_tier;
        contribution.timestamp = clock.unix_timestamp;
        contribution.refunded = false;
        contribution.bump = ctx.bumps.contribution;
    } else {
        contribution.amount = contribution
            .amount
            .checked_add(amount)
            .ok_or(error!(CrowdfundError::Overflow))?;
        contribution.timestamp = clock.unix_timestamp;
    }

    // Update campaign totals
    let campaign = &mut ctx.accounts.campaign;
    campaign.raised_amount = campaign
        .raised_amount
        .checked_add(amount)
        .ok_or(error!(CrowdfundError::Overflow))?;

    if is_new {
        campaign.backer_count = campaign
            .backer_count
            .checked_add(1)
            .ok_or(error!(CrowdfundError::Overflow))?;
    }

    emit!(ContributionMade {
        campaign: campaign.key(),
        backer: ctx.accounts.backer.key(),
        amount,
        total_raised: campaign.raised_amount,
    });

    Ok(())
}
