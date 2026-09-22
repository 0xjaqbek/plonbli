use anchor_lang::prelude::*;

#[error_code]
pub enum CrowdfundError {
    #[msg("Unauthorized: signer is not the expected authority")]
    Unauthorized,

    #[msg("Invalid funding model value")]
    InvalidFundingModel,

    #[msg("Campaign is not in Setup status")]
    CampaignNotInSetup,

    #[msg("Campaign is not Active")]
    CampaignNotActive,

    #[msg("Campaign has not reached its deadline yet")]
    CampaignNotExpired,

    #[msg("Campaign deadline has passed")]
    CampaignExpired,

    #[msg("Maximum milestones reached for this campaign")]
    MaxMilestonesReached,

    #[msg("Maximum reward tiers reached for this campaign")]
    MaxRewardTiersReached,

    #[msg("Milestone index does not match expected next index")]
    InvalidMilestoneIndex,

    #[msg("Reward tier index does not match expected next index")]
    InvalidRewardTierIndex,

    #[msg("Contribution amount must be greater than zero")]
    ZeroContribution,

    #[msg("Reward tier is full (max backers reached)")]
    RewardTierFull,

    #[msg("Contribution amount is less than reward tier price")]
    InsufficientForRewardTier,

    #[msg("Milestone is not in Pending status")]
    MilestoneNotPending,

    #[msg("Milestone is not Approved")]
    MilestoneNotApproved,

    #[msg("Campaign is not Failed — refunds not available")]
    RefundNotAvailable,

    #[msg("Contribution already refunded")]
    AlreadyRefunded,

    #[msg("Campaign must be Active to finalize")]
    CannotFinalize,

    #[msg("Campaign goal not reached and funding model is AllOrNothing")]
    GoalNotReached,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Deadline must be in the future")]
    DeadlineInPast,

    #[msg("Goal amount must be greater than zero")]
    ZeroGoalAmount,

    #[msg("Fee basis points exceeds maximum (1000 = 10%)")]
    FeeTooHigh,

    #[msg("Milestone target amounts must sum to at most the campaign goal")]
    MilestoneAmountsExceedGoal,

    #[msg("Reward tier price must be greater than zero")]
    ZeroRewardTierPrice,

    #[msg("Campaign must be Successful to release milestone funds")]
    CampaignNotSuccessful,
}
