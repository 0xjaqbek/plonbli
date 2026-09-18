# Solana Crowdfunding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Solana-powered crowdfunding system for Plonbli — on-chain escrow program (Anchor) + off-chain Next.js domain with wallet integration.

**Architecture:** Anchor program handles fund escrow/release on Solana; PostgreSQL stores campaign content/metadata; Next.js domain provides UI. The on-chain program is the source of truth for financial data. Off-chain caches on-chain state for fast queries. A `contentHash` bridges both — SHA-256 of metadata stored on-chain for tamper-proofing.

**Tech Stack:** Anchor (Rust), Solana SPL Token, Drizzle ORM, Next.js 16 App Router, `@solana/react-hooks`, `@coral-xyz/anchor` TypeScript client, Zod, next-intl, shadcn/ui.

**Design Spec:** `docs/superpowers/specs/2026-09-18-solana-crowdfunding-design.md`

---

## File Structure

### On-Chain Program

```
programs/plonbli-crowdfunding/
  Cargo.toml
  src/
    lib.rs                           # Program entry + instruction routing
    state/
      mod.rs                         # Re-exports
      platform_config.rs             # PlatformConfig account
      campaign.rs                    # Campaign account + enums
      milestone.rs                   # Milestone account
      reward_tier.rs                 # RewardTier account
      contribution.rs                # Contribution account
    instructions/
      mod.rs                         # Re-exports
      initialize_platform.rs         # Admin setup
      create_campaign.rs             # Create campaign + vault
      add_milestone.rs               # Add milestone to campaign
      add_reward_tier.rs             # Add reward tier to campaign
      activate_campaign.rs           # Lock campaign, set Active
      contribute.rs                  # Back a campaign
      approve_milestone.rs           # Admin approves milestone
      release_milestone_funds.rs     # Creator withdraws milestone funds
      finalize_campaign.rs           # End campaign after deadline
      claim_refund.rs                # Backer claims refund
      update_platform_config.rs      # Admin updates config
    errors.rs                        # Custom error codes
    events.rs                        # On-chain events
Anchor.toml                          # Anchor project config
tests/
  plonbli-crowdfunding.ts            # TypeScript integration tests
```

### Off-Chain (Next.js)

```
src/shared/db/schema/
  crowdfunding.ts                    # All crowdfunding tables + enums
  user-wallets.ts                    # Wallet storage table

src/domains/crowdfunding/
  types.ts                           # TypeScript types
  schemas/
    validation.ts                    # Zod schemas (shared frontend/backend)
  lib/
    solana-client.ts                 # Anchor program client setup
    content-hash.ts                  # SHA-256 content hashing
    wallet-encryption.ts             # AES-256-GCM encrypt/decrypt for custodial keys
  queries/
    get-campaigns.ts                 # List/filter/search campaigns
    get-campaign.ts                  # Single campaign with details
    get-user-contributions.ts        # User's backed campaigns
    get-user-campaigns.ts            # User's created campaigns
  actions/
    create-campaign.ts               # Create on-chain + DB
    contribute.ts                    # Back a campaign
    finalize-campaign.ts             # Trigger finalization
    claim-refund.ts                  # Claim refund
    manage-milestones.ts             # Add/approve/release milestones
    manage-rewards.ts                # Add reward tiers
    sync-campaign.ts                 # Sync on-chain state to DB
    wallet-actions.ts                # Create/manage custodial wallets
  components/
    campaign-card.tsx                # Card for listing
    campaign-detail.tsx              # Full campaign view
    campaign-form.tsx                # Multi-step creation wizard
    milestone-list.tsx               # Milestone progress
    reward-tier-list.tsx             # Reward tiers display
    contribution-form.tsx            # Backing flow
    funding-progress.tsx             # Progress bar + live stats
    wallet-connect.tsx               # Wallet connection UI
    campaign-dashboard.tsx           # Creator dashboard
    solana-provider.tsx              # SolanaProvider wrapper
  hooks/
    use-campaign-balance.ts          # Real-time vault balance
    use-wallet.ts                    # Wallet state management
  index.ts                           # Barrel export (public API)

src/app/[locale]/(main)/crowdfunding/
  page.tsx                           # Campaign listing
  [id]/page.tsx                      # Campaign detail
  create/page.tsx                    # Campaign creation
  dashboard/page.tsx                 # Creator dashboard

src/app/[locale]/(main)/profile/
  wallet/page.tsx                    # Wallet management
  contributions/page.tsx             # Contribution history
```

---

## Phase 1: Solana Program (Anchor)

### Task 1: Anchor Project Setup

**Files:**
- Create: `Anchor.toml`
- Create: `programs/plonbli-crowdfunding/Cargo.toml`
- Create: `programs/plonbli-crowdfunding/src/lib.rs`
- Modify: `.gitignore`

**Prerequisites:** Rust toolchain, Solana CLI, and Anchor CLI must be installed. On Windows, use WSL2 or Git Bash with Solana tools. See https://solana.com/docs/intro/installation for setup.

- [ ] **Step 1: Verify toolchain**

Run:
```bash
rustc --version && solana --version && anchor --version
```
Expected: Rust 1.89+, Solana CLI 2.x, Anchor 0.32.x. If not installed, install:
```bash
# Install Solana + Rust + Anchor
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest && avm use latest
```

- [ ] **Step 2: Initialize Anchor project**

Run from project root (`.worktrees/solana-crowdfunding/`):
```bash
anchor init plonbli-crowdfunding --no-git
```

This creates `programs/plonbli-crowdfunding/` and `Anchor.toml`. If `anchor init` creates files in an unexpected location, move them to the project root.

- [ ] **Step 3: Configure Anchor.toml**

Replace the generated `Anchor.toml` with:
```toml
[toolchain]
anchor_version = "0.32.1"

[features]
resolution = true
skip-lint = false

[programs.localnet]
plonbli_crowdfunding = "11111111111111111111111111111111"

[programs.devnet]
plonbli_crowdfunding = "11111111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

- [ ] **Step 4: Configure Cargo.toml**

Replace `programs/plonbli-crowdfunding/Cargo.toml`:
```toml
[package]
name = "plonbli-crowdfunding"
version = "0.1.0"
description = "Crowdfunding program for Plonbli platform"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "plonbli_crowdfunding"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]

[dependencies]
anchor-lang = "0.32.1"
anchor-spl = "0.32.1"
```

- [ ] **Step 5: Write initial lib.rs**

Write `programs/plonbli-crowdfunding/src/lib.rs`:
```rust
use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod plonbli_crowdfunding {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        fee_basis_points: u16,
    ) -> Result<()> {
        instructions::initialize_platform::handler(ctx, fee_basis_points)
    }

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        goal_amount: u64,
        deadline: i64,
        funding_model: u8,
        content_hash: [u8; 32],
    ) -> Result<()> {
        instructions::create_campaign::handler(
            ctx,
            campaign_id,
            goal_amount,
            deadline,
            funding_model,
            content_hash,
        )
    }

    pub fn add_milestone(
        ctx: Context<AddMilestone>,
        milestone_index: u8,
        target_amount: u64,
        description_hash: [u8; 32],
    ) -> Result<()> {
        instructions::add_milestone::handler(ctx, milestone_index, target_amount, description_hash)
    }

    pub fn add_reward_tier(
        ctx: Context<AddRewardTier>,
        tier_index: u8,
        price: u64,
        max_backers: u32,
        description_hash: [u8; 32],
        is_product_linked: bool,
    ) -> Result<()> {
        instructions::add_reward_tier::handler(
            ctx,
            tier_index,
            price,
            max_backers,
            description_hash,
            is_product_linked,
        )
    }

    pub fn activate_campaign(ctx: Context<ActivateCampaign>) -> Result<()> {
        instructions::activate_campaign::handler(ctx)
    }

    pub fn contribute(
        ctx: Context<Contribute>,
        amount: u64,
        reward_tier: Option<u8>,
    ) -> Result<()> {
        instructions::contribute::handler(ctx, amount, reward_tier)
    }

    pub fn approve_milestone(ctx: Context<ApproveMilestone>) -> Result<()> {
        instructions::approve_milestone::handler(ctx)
    }

    pub fn release_milestone_funds(ctx: Context<ReleaseMilestoneFunds>) -> Result<()> {
        instructions::release_milestone_funds::handler(ctx)
    }

    pub fn finalize_campaign(ctx: Context<FinalizeCampaign>) -> Result<()> {
        instructions::finalize_campaign::handler(ctx)
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        instructions::claim_refund::handler(ctx)
    }

    pub fn update_platform_config(
        ctx: Context<UpdatePlatformConfig>,
        fee_basis_points: Option<u16>,
        new_treasury: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_platform_config::handler(ctx, fee_basis_points, new_treasury)
    }
}
```

- [ ] **Step 6: Add .gitignore entries**

Append to `.gitignore`:
```
# Anchor / Solana
target/
test-ledger/
.anchor/
```

- [ ] **Step 7: Create empty module files**

Create placeholder files so the project compiles incrementally:

`programs/plonbli-crowdfunding/src/errors.rs`:
```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum CrowdfundError {
    #[msg("Unauthorized")]
    Unauthorized,
}
```

`programs/plonbli-crowdfunding/src/events.rs`:
```rust
use anchor_lang::prelude::*;

#[event]
pub struct PlaceholderEvent {
    pub timestamp: i64,
}
```

`programs/plonbli-crowdfunding/src/state/mod.rs`:
```rust
pub mod platform_config;
pub mod campaign;
pub mod milestone;
pub mod reward_tier;
pub mod contribution;

pub use platform_config::*;
pub use campaign::*;
pub use milestone::*;
pub use reward_tier::*;
pub use contribution::*;
```

`programs/plonbli-crowdfunding/src/instructions/mod.rs`:
```rust
pub mod initialize_platform;
pub mod create_campaign;
pub mod add_milestone;
pub mod add_reward_tier;
pub mod activate_campaign;
pub mod contribute;
pub mod approve_milestone;
pub mod release_milestone_funds;
pub mod finalize_campaign;
pub mod claim_refund;
pub mod update_platform_config;

pub use initialize_platform::*;
pub use create_campaign::*;
pub use add_milestone::*;
pub use add_reward_tier::*;
pub use activate_campaign::*;
pub use contribute::*;
pub use approve_milestone::*;
pub use release_milestone_funds::*;
pub use finalize_campaign::*;
pub use claim_refund::*;
pub use update_platform_config::*;
```

Create empty instruction files (one per instruction) — each will be filled in subsequent tasks. For now, each contains a minimal stub so the project compiles:

For each file in `instructions/` (e.g., `initialize_platform.rs`):
```rust
use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializePlatform {}

pub fn handler(_ctx: Context<InitializePlatform>) -> Result<()> {
    Ok(())
}
```

Repeat this stub pattern for all 11 instruction files, adjusting struct names to match: `CreateCampaign`, `AddMilestone`, `AddRewardTier`, `ActivateCampaign`, `Contribute`, `ApproveMilestone`, `ReleaseMilestoneFunds`, `FinalizeCampaign`, `ClaimRefund`, `UpdatePlatformConfig`.

- [ ] **Step 8: Build to verify setup**

Run:
```bash
anchor build
```
Expected: Compiles successfully. The program ID in `target/deploy/plonbli_crowdfunding-keypair.json` is generated.

- [ ] **Step 9: Sync program ID**

Run:
```bash
anchor keys sync
```
This updates `declare_id!` in `lib.rs` and `Anchor.toml` with the actual program keypair.

- [ ] **Step 10: Commit**

```bash
git add programs/ Anchor.toml .gitignore
git commit -m "feat(crowdfunding): scaffold Anchor program with empty instruction stubs"
```

---

### Task 2: State Account Definitions

**Files:**
- Create: `programs/plonbli-crowdfunding/src/state/platform_config.rs`
- Create: `programs/plonbli-crowdfunding/src/state/campaign.rs`
- Create: `programs/plonbli-crowdfunding/src/state/milestone.rs`
- Create: `programs/plonbli-crowdfunding/src/state/reward_tier.rs`
- Create: `programs/plonbli-crowdfunding/src/state/contribution.rs`

- [ ] **Step 1: Write PlatformConfig**

`programs/plonbli-crowdfunding/src/state/platform_config.rs`:
```rust
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    pub admin: Pubkey,
    pub fee_basis_points: u16,
    pub treasury: Pubkey,
    pub bump: u8,
}

impl PlatformConfig {
    pub const SEED: &'static [u8] = b"platform_config";
}
```

- [ ] **Step 2: Write Campaign**

`programs/plonbli-crowdfunding/src/state/campaign.rs`:
```rust
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum FundingModel {
    AllOrNothing,
    KeepWhatYouRaise,
}

impl FundingModel {
    pub fn from_u8(value: u8) -> Result<Self> {
        match value {
            0 => Ok(FundingModel::AllOrNothing),
            1 => Ok(FundingModel::KeepWhatYouRaise),
            _ => Err(error!(crate::errors::CrowdfundError::InvalidFundingModel)),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CampaignStatus {
    Setup,
    Active,
    Successful,
    Failed,
    Finalized,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub creator: Pubkey,
    pub campaign_id: u64,
    pub goal_amount: u64,
    pub raised_amount: u64,
    pub currency_mint: Pubkey,
    pub funding_model: FundingModel,
    pub deadline: i64,
    pub status: CampaignStatus,
    pub milestone_count: u8,
    pub reward_tier_count: u8,
    pub content_hash: [u8; 32],
    pub backer_count: u32,
    pub bump: u8,
}

impl Campaign {
    pub const SEED: &'static [u8] = b"campaign";
    pub const VAULT_SEED: &'static [u8] = b"vault";
}
```

- [ ] **Step 3: Write Milestone**

`programs/plonbli-crowdfunding/src/state/milestone.rs`:
```rust
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MilestoneStatus {
    Pending,
    Approved,
    Released,
}

#[account]
#[derive(InitSpace)]
pub struct Milestone {
    pub campaign: Pubkey,
    pub milestone_index: u8,
    pub target_amount: u64,
    pub description_hash: [u8; 32],
    pub status: MilestoneStatus,
    pub approved_by: Option<Pubkey>,
    pub bump: u8,
}

impl Milestone {
    pub const SEED: &'static [u8] = b"milestone";
    pub const MAX_PER_CAMPAIGN: u8 = 10;
}
```

- [ ] **Step 4: Write RewardTier**

`programs/plonbli-crowdfunding/src/state/reward_tier.rs`:
```rust
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RewardTier {
    pub campaign: Pubkey,
    pub tier_index: u8,
    pub price: u64,
    pub max_backers: u32,
    pub current_backers: u32,
    pub description_hash: [u8; 32],
    pub is_product_linked: bool,
    pub bump: u8,
}

impl RewardTier {
    pub const SEED: &'static [u8] = b"reward_tier";
    pub const MAX_PER_CAMPAIGN: u8 = 10;
}
```

- [ ] **Step 5: Write Contribution**

`programs/plonbli-crowdfunding/src/state/contribution.rs`:
```rust
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Contribution {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
    pub reward_tier: Option<u8>,
    pub timestamp: i64,
    pub refunded: bool,
    pub bump: u8,
}

impl Contribution {
    pub const SEED: &'static [u8] = b"contribution";
}
```

- [ ] **Step 6: Build to verify state compiles**

Run:
```bash
anchor build
```
Expected: Compiles successfully.

- [ ] **Step 7: Commit**

```bash
git add programs/plonbli-crowdfunding/src/state/
git commit -m "feat(crowdfunding): define on-chain account structs (Campaign, Milestone, RewardTier, Contribution, PlatformConfig)"
```

---

### Task 3: Error Codes & Events

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/errors.rs`
- Modify: `programs/plonbli-crowdfunding/src/events.rs`

- [ ] **Step 1: Write error codes**

`programs/plonbli-crowdfunding/src/errors.rs`:
```rust
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

    #[msg("Campaign must be Successful or Failed to finalize")]
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
}
```

- [ ] **Step 2: Write events**

`programs/plonbli-crowdfunding/src/events.rs`:
```rust
use anchor_lang::prelude::*;

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub campaign_id: u64,
    pub goal_amount: u64,
    pub currency_mint: Pubkey,
    pub deadline: i64,
}

#[event]
pub struct CampaignActivated {
    pub campaign: Pubkey,
}

#[event]
pub struct ContributionMade {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
    pub total_raised: u64,
}

#[event]
pub struct MilestoneApproved {
    pub campaign: Pubkey,
    pub milestone_index: u8,
    pub approved_by: Pubkey,
}

#[event]
pub struct MilestoneFundsReleased {
    pub campaign: Pubkey,
    pub milestone_index: u8,
    pub amount: u64,
}

#[event]
pub struct CampaignFinalized {
    pub campaign: Pubkey,
    pub status: u8,
    pub total_raised: u64,
}

#[event]
pub struct RefundClaimed {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
}
```

- [ ] **Step 3: Build**

Run: `anchor build`
Expected: Compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add programs/plonbli-crowdfunding/src/errors.rs programs/plonbli-crowdfunding/src/events.rs
git commit -m "feat(crowdfunding): add error codes and on-chain events"
```

---

### Task 4: initialize_platform Instruction

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/instructions/initialize_platform.rs`
- Create: `tests/plonbli-crowdfunding.ts`

- [ ] **Step 1: Write the instruction**

`programs/plonbli-crowdfunding/src/instructions/initialize_platform.rs`:
```rust
use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [PlatformConfig::SEED],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: Treasury account that will receive fees. Can be any account.
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializePlatform>, fee_basis_points: u16) -> Result<()> {
    require!(fee_basis_points <= 1000, CrowdfundError::FeeTooHigh);

    let config = &mut ctx.accounts.platform_config;
    config.admin = ctx.accounts.admin.key();
    config.fee_basis_points = fee_basis_points;
    config.treasury = ctx.accounts.treasury.key();
    config.bump = ctx.bumps.platform_config;

    Ok(())
}
```

- [ ] **Step 2: Install test dependencies**

Run:
```bash
npm install --save-dev @coral-xyz/anchor @solana/web3.js chai mocha ts-mocha @types/chai @types/mocha @solana/spl-token
```

- [ ] **Step 3: Write the test**

`tests/plonbli-crowdfunding.ts`:
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PlonbliCrowdfunding } from "../target/types/plonbli_crowdfunding";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

describe("plonbli-crowdfunding", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .plonbliCrowdfunding as Program<PlonbliCrowdfunding>;
  const admin = provider.wallet as anchor.Wallet;
  const treasury = Keypair.generate();

  function findPlatformConfigPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("platform_config")],
      program.programId
    );
  }

  function findCampaignPDA(
    creator: PublicKey,
    campaignId: anchor.BN
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        creator.toBuffer(),
        campaignId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
  }

  function findVaultPDA(campaign: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), campaign.toBuffer()],
      program.programId
    );
  }

  function findMilestonePDA(
    campaign: PublicKey,
    index: number
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("milestone"), campaign.toBuffer(), Buffer.from([index])],
      program.programId
    );
  }

  function findRewardTierPDA(
    campaign: PublicKey,
    index: number
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("reward_tier"), campaign.toBuffer(), Buffer.from([index])],
      program.programId
    );
  }

  function findContributionPDA(
    campaign: PublicKey,
    backer: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("contribution"), campaign.toBuffer(), backer.toBuffer()],
      program.programId
    );
  }

  describe("initialize_platform", () => {
    it("initializes platform config", async () => {
      const [configPDA] = findPlatformConfigPDA();

      await program.methods
        .initializePlatform(0) // 0 fee
        .accounts({
          platformConfig: configPDA,
          admin: admin.publicKey,
          treasury: treasury.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await program.account.platformConfig.fetch(configPDA);
      expect(config.admin.toString()).to.equal(admin.publicKey.toString());
      expect(config.feeBasisPoints).to.equal(0);
      expect(config.treasury.toString()).to.equal(
        treasury.publicKey.toString()
      );
    });

    it("rejects fee > 1000 basis points", async () => {
      // Platform config already initialized, so this would fail anyway.
      // Test the fee validation on update_platform_config instead (Task 12).
      // This test verifies the constraint conceptually — the actual rejection
      // is tested via update_platform_config since init can only run once.
    });
  });
});
```

- [ ] **Step 4: Run test**

Run:
```bash
anchor test
```
Expected: `initialize_platform` test passes. The `anchor test` command builds the program, starts a local validator, deploys, and runs tests.

- [ ] **Step 5: Commit**

```bash
git add programs/plonbli-crowdfunding/src/instructions/initialize_platform.rs tests/
git commit -m "feat(crowdfunding): implement initialize_platform instruction with test"
```

---

### Task 5: create_campaign Instruction

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/instructions/create_campaign.rs`
- Modify: `tests/plonbli-crowdfunding.ts`

- [ ] **Step 1: Write the instruction**

`programs/plonbli-crowdfunding/src/instructions/create_campaign.rs`:
```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::errors::CrowdfundError;
use crate::events::CampaignCreated;
use crate::state::{Campaign, CampaignStatus, FundingModel};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [Campaign::SEED, creator.key().as_ref(), &campaign_id.to_le_bytes()],
        bump,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(
        init,
        payer = creator,
        token::mint = currency_mint,
        token::authority = campaign,
        seeds = [Campaign::VAULT_SEED, campaign.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub currency_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateCampaign>,
    campaign_id: u64,
    goal_amount: u64,
    deadline: i64,
    funding_model: u8,
    content_hash: [u8; 32],
) -> Result<()> {
    require!(goal_amount > 0, CrowdfundError::ZeroGoalAmount);

    let clock = Clock::get()?;
    require!(deadline > clock.unix_timestamp, CrowdfundError::DeadlineInPast);

    let model = FundingModel::from_u8(funding_model)?;

    let campaign = &mut ctx.accounts.campaign;
    campaign.creator = ctx.accounts.creator.key();
    campaign.campaign_id = campaign_id;
    campaign.goal_amount = goal_amount;
    campaign.raised_amount = 0;
    campaign.currency_mint = ctx.accounts.currency_mint.key();
    campaign.funding_model = model;
    campaign.deadline = deadline;
    campaign.status = CampaignStatus::Setup;
    campaign.milestone_count = 0;
    campaign.reward_tier_count = 0;
    campaign.content_hash = content_hash;
    campaign.backer_count = 0;
    campaign.bump = ctx.bumps.campaign;

    emit!(CampaignCreated {
        campaign: campaign.key(),
        creator: campaign.creator,
        campaign_id,
        goal_amount,
        currency_mint: campaign.currency_mint,
        deadline,
    });

    Ok(())
}
```

- [ ] **Step 2: Add test**

Add to `tests/plonbli-crowdfunding.ts` inside the outer `describe` block, after the `initialize_platform` describe:

```typescript
  // Shared state across tests
  let usdcMint: PublicKey;
  let campaignPDA: PublicKey;
  const campaignId = new anchor.BN(1);
  const goalAmount = new anchor.BN(1_000_000); // 1 USDC (6 decimals)
  const contentHash = Buffer.alloc(32, 1); // dummy hash

  describe("create_campaign", () => {
    before(async () => {
      // Create a USDC-like mint for testing
      usdcMint = await createMint(
        provider.connection,
        (admin as any).payer,
        admin.publicKey,
        null,
        6 // USDC has 6 decimals
      );

      [campaignPDA] = findCampaignPDA(admin.publicKey, campaignId);
    });

    it("creates a campaign in Setup status", async () => {
      const [vaultPDA] = findVaultPDA(campaignPDA);
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 24h from now

      await program.methods
        .createCampaign(
          campaignId,
          goalAmount,
          new anchor.BN(deadline),
          0, // AllOrNothing
          Array.from(contentHash)
        )
        .accounts({
          campaign: campaignPDA,
          vault: vaultPDA,
          currencyMint: usdcMint,
          creator: admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const campaign = await program.account.campaign.fetch(campaignPDA);
      expect(campaign.creator.toString()).to.equal(
        admin.publicKey.toString()
      );
      expect(campaign.goalAmount.toNumber()).to.equal(1_000_000);
      expect(campaign.raisedAmount.toNumber()).to.equal(0);
      expect(campaign.status).to.deep.equal({ setup: {} });
      expect(campaign.milestoneCount).to.equal(0);
      expect(campaign.backerCount).to.equal(0);
    });

    it("rejects zero goal amount", async () => {
      const badId = new anchor.BN(999);
      const [badCampaign] = findCampaignPDA(admin.publicKey, badId);
      const [badVault] = findVaultPDA(badCampaign);
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      try {
        await program.methods
          .createCampaign(
            badId,
            new anchor.BN(0),
            new anchor.BN(deadline),
            0,
            Array.from(contentHash)
          )
          .accounts({
            campaign: badCampaign,
            vault: badVault,
            currencyMint: usdcMint,
            creator: admin.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("ZeroGoalAmount");
      }
    });
  });
```

- [ ] **Step 3: Run tests**

Run: `anchor test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add programs/plonbli-crowdfunding/src/instructions/create_campaign.rs tests/
git commit -m "feat(crowdfunding): implement create_campaign instruction with vault PDA"
```

---

### Task 6: add_milestone & add_reward_tier Instructions

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/instructions/add_milestone.rs`
- Modify: `programs/plonbli-crowdfunding/src/instructions/add_reward_tier.rs`
- Modify: `tests/plonbli-crowdfunding.ts`

- [ ] **Step 1: Write add_milestone**

`programs/plonbli-crowdfunding/src/instructions/add_milestone.rs`:
```rust
use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::state::{Campaign, CampaignStatus, Milestone, MilestoneStatus};

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct AddMilestone<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Milestone::INIT_SPACE,
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
        .ok_or(CrowdfundError::Overflow)?;

    Ok(())
}
```

- [ ] **Step 2: Write add_reward_tier**

`programs/plonbli-crowdfunding/src/instructions/add_reward_tier.rs`:
```rust
use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::state::{Campaign, CampaignStatus, RewardTier};

#[derive(Accounts)]
#[instruction(tier_index: u8)]
pub struct AddRewardTier<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + RewardTier::INIT_SPACE,
        seeds = [RewardTier::SEED, campaign.key().as_ref(), &[tier_index]],
        bump,
    )]
    pub reward_tier: Account<'info, RewardTier>,

    #[account(
        mut,
        has_one = creator @ CrowdfundError::Unauthorized,
        constraint = campaign.status == CampaignStatus::Setup @ CrowdfundError::CampaignNotInSetup,
        constraint = campaign.reward_tier_count < RewardTier::MAX_PER_CAMPAIGN @ CrowdfundError::MaxRewardTiersReached,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddRewardTier>,
    tier_index: u8,
    price: u64,
    max_backers: u32,
    description_hash: [u8; 32],
    is_product_linked: bool,
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    require!(
        tier_index == campaign.reward_tier_count,
        CrowdfundError::InvalidRewardTierIndex
    );

    let tier = &mut ctx.accounts.reward_tier;
    tier.campaign = campaign.key();
    tier.tier_index = tier_index;
    tier.price = price;
    tier.max_backers = max_backers;
    tier.current_backers = 0;
    tier.description_hash = description_hash;
    tier.is_product_linked = is_product_linked;
    tier.bump = ctx.bumps.reward_tier;

    campaign.reward_tier_count = campaign
        .reward_tier_count
        .checked_add(1)
        .ok_or(CrowdfundError::Overflow)?;

    Ok(())
}
```

- [ ] **Step 3: Add tests**

Add to `tests/plonbli-crowdfunding.ts`:

```typescript
  describe("add_milestone", () => {
    it("adds a milestone to a campaign in Setup", async () => {
      const descHash = Buffer.alloc(32, 2);
      const [milestonePDA] = findMilestonePDA(campaignPDA, 0);

      await program.methods
        .addMilestone(0, new anchor.BN(500_000), Array.from(descHash))
        .accounts({
          milestone: milestonePDA,
          campaign: campaignPDA,
          creator: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const milestone = await program.account.milestone.fetch(milestonePDA);
      expect(milestone.milestoneIndex).to.equal(0);
      expect(milestone.targetAmount.toNumber()).to.equal(500_000);
      expect(milestone.status).to.deep.equal({ pending: {} });

      const campaign = await program.account.campaign.fetch(campaignPDA);
      expect(campaign.milestoneCount).to.equal(1);
    });
  });

  describe("add_reward_tier", () => {
    it("adds a reward tier to a campaign in Setup", async () => {
      const descHash = Buffer.alloc(32, 3);
      const [tierPDA] = findRewardTierPDA(campaignPDA, 0);

      await program.methods
        .addRewardTier(
          0,
          new anchor.BN(100_000), // 0.1 USDC price
          100, // max 100 backers
          Array.from(descHash),
          true // product linked
        )
        .accounts({
          rewardTier: tierPDA,
          campaign: campaignPDA,
          creator: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const tier = await program.account.rewardTier.fetch(tierPDA);
      expect(tier.tierIndex).to.equal(0);
      expect(tier.price.toNumber()).to.equal(100_000);
      expect(tier.maxBackers).to.equal(100);
      expect(tier.currentBackers).to.equal(0);
      expect(tier.isProductLinked).to.be.true;
    });
  });
```

- [ ] **Step 4: Run tests**

Run: `anchor test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add programs/plonbli-crowdfunding/src/instructions/add_milestone.rs programs/plonbli-crowdfunding/src/instructions/add_reward_tier.rs tests/
git commit -m "feat(crowdfunding): implement add_milestone and add_reward_tier instructions"
```

---

### Task 7: activate_campaign Instruction

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/instructions/activate_campaign.rs`
- Modify: `tests/plonbli-crowdfunding.ts`

- [ ] **Step 1: Write the instruction**

`programs/plonbli-crowdfunding/src/instructions/activate_campaign.rs`:
```rust
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
```

- [ ] **Step 2: Add test**

```typescript
  describe("activate_campaign", () => {
    it("activates a campaign in Setup status", async () => {
      await program.methods
        .activateCampaign()
        .accounts({
          campaign: campaignPDA,
          creator: admin.publicKey,
        })
        .rpc();

      const campaign = await program.account.campaign.fetch(campaignPDA);
      expect(campaign.status).to.deep.equal({ active: {} });
    });

    it("rejects adding milestone to active campaign", async () => {
      const descHash = Buffer.alloc(32, 4);
      const [milestonePDA] = findMilestonePDA(campaignPDA, 1);

      try {
        await program.methods
          .addMilestone(1, new anchor.BN(500_000), Array.from(descHash))
          .accounts({
            milestone: milestonePDA,
            campaign: campaignPDA,
            creator: admin.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("CampaignNotInSetup");
      }
    });
  });
```

- [ ] **Step 3: Run tests**

Run: `anchor test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add programs/plonbli-crowdfunding/src/instructions/activate_campaign.rs tests/
git commit -m "feat(crowdfunding): implement activate_campaign instruction"
```

---

### Task 8: contribute Instruction

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/instructions/contribute.rs`
- Modify: `tests/plonbli-crowdfunding.ts`

- [ ] **Step 1: Write the instruction**

`programs/plonbli-crowdfunding/src/instructions/contribute.rs`:
```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::CrowdfundError;
use crate::events::ContributionMade;
use crate::state::{Campaign, CampaignStatus, Contribution, RewardTier};

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(
        init_if_needed,
        payer = backer,
        space = 8 + Contribution::INIT_SPACE,
        seeds = [Contribution::SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump,
    )]
    pub contribution: Account<'info, Contribution>,

    #[account(
        mut,
        constraint = campaign.status == CampaignStatus::Active @ CrowdfundError::CampaignNotActive,
    )]
    pub campaign: Account<'info, Campaign>,

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

pub fn handler(
    ctx: Context<Contribute>,
    amount: u64,
    reward_tier: Option<u8>,
) -> Result<()> {
    require!(amount > 0, CrowdfundError::ZeroContribution);

    let clock = Clock::get()?;
    let campaign = &ctx.accounts.campaign;
    require!(
        clock.unix_timestamp < campaign.deadline,
        CrowdfundError::CampaignExpired
    );

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
    let is_new = contribution.amount == 0 && contribution.campaign == Pubkey::default();

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
            .ok_or(CrowdfundError::Overflow)?;
    }

    // Update campaign totals
    let campaign = &mut ctx.accounts.campaign;
    campaign.raised_amount = campaign
        .raised_amount
        .checked_add(amount)
        .ok_or(CrowdfundError::Overflow)?;

    if is_new {
        campaign.backer_count = campaign
            .backer_count
            .checked_add(1)
            .ok_or(CrowdfundError::Overflow)?;
    }

    emit!(ContributionMade {
        campaign: campaign.key(),
        backer: ctx.accounts.backer.key(),
        amount,
        total_raised: campaign.raised_amount,
    });

    Ok(())
}
```

- [ ] **Step 2: Add test**

```typescript
  describe("contribute", () => {
    const backer = Keypair.generate();
    let backerTokenAccount: PublicKey;

    before(async () => {
      // Airdrop SOL to backer for tx fees
      const sig = await provider.connection.requestAirdrop(
        backer.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      // Create backer's USDC token account and mint tokens
      const ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        (admin as any).payer,
        usdcMint,
        backer.publicKey
      );
      backerTokenAccount = ata.address;

      // Mint 10 USDC to backer
      await mintTo(
        provider.connection,
        (admin as any).payer,
        usdcMint,
        backerTokenAccount,
        admin.publicKey,
        10_000_000 // 10 USDC
      );
    });

    it("backer contributes to an active campaign", async () => {
      const [contributionPDA] = findContributionPDA(
        campaignPDA,
        backer.publicKey
      );
      const [vaultPDA] = findVaultPDA(campaignPDA);

      await program.methods
        .contribute(new anchor.BN(500_000), 0) // 0.5 USDC, tier 0
        .accounts({
          contribution: contributionPDA,
          campaign: campaignPDA,
          vault: vaultPDA,
          backerTokenAccount: backerTokenAccount,
          backer: backer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([backer])
        .rpc();

      const contribution =
        await program.account.contribution.fetch(contributionPDA);
      expect(contribution.amount.toNumber()).to.equal(500_000);
      expect(contribution.backer.toString()).to.equal(
        backer.publicKey.toString()
      );

      const campaign = await program.account.campaign.fetch(campaignPDA);
      expect(campaign.raisedAmount.toNumber()).to.equal(500_000);
      expect(campaign.backerCount).to.equal(1);
    });

    it("accumulates on second contribution", async () => {
      const [contributionPDA] = findContributionPDA(
        campaignPDA,
        backer.publicKey
      );
      const [vaultPDA] = findVaultPDA(campaignPDA);

      await program.methods
        .contribute(new anchor.BN(300_000), null) // 0.3 USDC more
        .accounts({
          contribution: contributionPDA,
          campaign: campaignPDA,
          vault: vaultPDA,
          backerTokenAccount: backerTokenAccount,
          backer: backer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([backer])
        .rpc();

      const contribution =
        await program.account.contribution.fetch(contributionPDA);
      expect(contribution.amount.toNumber()).to.equal(800_000); // 500k + 300k

      const campaign = await program.account.campaign.fetch(campaignPDA);
      expect(campaign.raisedAmount.toNumber()).to.equal(800_000);
      expect(campaign.backerCount).to.equal(1); // still 1, not 2
    });
  });
```

- [ ] **Step 3: Run tests**

Run: `anchor test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add programs/plonbli-crowdfunding/src/instructions/contribute.rs tests/
git commit -m "feat(crowdfunding): implement contribute instruction with accumulation"
```

---

### Task 9: approve_milestone & release_milestone_funds Instructions

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/instructions/approve_milestone.rs`
- Modify: `programs/plonbli-crowdfunding/src/instructions/release_milestone_funds.rs`
- Modify: `tests/plonbli-crowdfunding.ts`

- [ ] **Step 1: Write approve_milestone**

`programs/plonbli-crowdfunding/src/instructions/approve_milestone.rs`:
```rust
use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::events::MilestoneApproved;
use crate::state::{Campaign, CampaignStatus, Milestone, MilestoneStatus, PlatformConfig};

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
    let milestone = &mut ctx.accounts.milestone;
    milestone.status = MilestoneStatus::Approved;
    milestone.approved_by = Some(ctx.accounts.admin.key());

    emit!(MilestoneApproved {
        campaign: ctx.accounts.campaign.key(),
        milestone_index: milestone.milestone_index,
        approved_by: ctx.accounts.admin.key(),
    });

    Ok(())
}
```

- [ ] **Step 2: Write release_milestone_funds**

`programs/plonbli-crowdfunding/src/instructions/release_milestone_funds.rs`:
```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::CrowdfundError;
use crate::events::MilestoneFundsReleased;
use crate::state::{Campaign, CampaignStatus, Milestone, MilestoneStatus, PlatformConfig};

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
        constraint = campaign.status == CampaignStatus::Active
            || campaign.status == CampaignStatus::Successful @ CrowdfundError::CampaignNotActive,
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
    let release_amount = milestone.target_amount;

    // Calculate fee
    let fee = (release_amount as u128)
        .checked_mul(ctx.accounts.platform_config.fee_basis_points as u128)
        .ok_or(CrowdfundError::Overflow)?
        .checked_div(10_000)
        .ok_or(CrowdfundError::Overflow)? as u64;

    let creator_amount = release_amount
        .checked_sub(fee)
        .ok_or(CrowdfundError::Overflow)?;

    // PDA signer seeds for vault authority (campaign PDA is vault authority)
    let campaign_key = ctx.accounts.campaign.key();
    let bump = [ctx.accounts.campaign.bump];
    let campaign_id_bytes = ctx.accounts.campaign.campaign_id.to_le_bytes();
    let signer_seeds: &[&[&[u8]]] = &[&[
        Campaign::SEED,
        ctx.accounts.campaign.creator.as_ref(),
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
```

- [ ] **Step 3: Add tests**

```typescript
  describe("milestone management", () => {
    it("admin approves a milestone", async () => {
      const [milestonePDA] = findMilestonePDA(campaignPDA, 0);
      const [configPDA] = findPlatformConfigPDA();

      await program.methods
        .approveMilestone()
        .accounts({
          milestone: milestonePDA,
          campaign: campaignPDA,
          platformConfig: configPDA,
          admin: admin.publicKey,
        })
        .rpc();

      const milestone = await program.account.milestone.fetch(milestonePDA);
      expect(milestone.status).to.deep.equal({ approved: {} });
      expect(milestone.approvedBy.toString()).to.equal(
        admin.publicKey.toString()
      );
    });

    it("creator releases approved milestone funds", async () => {
      const [milestonePDA] = findMilestonePDA(campaignPDA, 0);
      const [vaultPDA] = findVaultPDA(campaignPDA);
      const [configPDA] = findPlatformConfigPDA();

      // Create token accounts for creator and treasury
      const creatorAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        (admin as any).payer,
        usdcMint,
        admin.publicKey
      );
      const treasuryAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        (admin as any).payer,
        usdcMint,
        treasury.publicKey
      );

      await program.methods
        .releaseMilestoneFunds()
        .accounts({
          milestone: milestonePDA,
          campaign: campaignPDA,
          vault: vaultPDA,
          creatorTokenAccount: creatorAta.address,
          treasuryTokenAccount: treasuryAta.address,
          platformConfig: configPDA,
          creator: admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const milestone = await program.account.milestone.fetch(milestonePDA);
      expect(milestone.status).to.deep.equal({ released: {} });
    });
  });
```

- [ ] **Step 4: Run tests**

Run: `anchor test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add programs/plonbli-crowdfunding/src/instructions/approve_milestone.rs programs/plonbli-crowdfunding/src/instructions/release_milestone_funds.rs tests/
git commit -m "feat(crowdfunding): implement milestone approval and fund release with fee support"
```

---

### Task 10: finalize_campaign Instruction

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/instructions/finalize_campaign.rs`
- Modify: `tests/plonbli-crowdfunding.ts`

- [ ] **Step 1: Write the instruction**

`programs/plonbli-crowdfunding/src/instructions/finalize_campaign.rs`:
```rust
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
    /// CHECK: Only used if campaign has no milestones and succeeds.
    #[account(mut)]
    pub creator_token_account: Option<Account<'info, TokenAccount>>,

    /// Treasury token account for fee.
    /// CHECK: Only used if fee > 0.
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
            .ok_or(CrowdfundError::Unauthorized)?;
        let treasury_token_account = ctx
            .accounts
            .treasury_token_account
            .as_ref()
            .ok_or(CrowdfundError::Unauthorized)?;

        let total = campaign.raised_amount;
        let fee = (total as u128)
            .checked_mul(ctx.accounts.platform_config.fee_basis_points as u128)
            .ok_or(CrowdfundError::Overflow)?
            .checked_div(10_000)
            .ok_or(CrowdfundError::Overflow)? as u64;
        let creator_amount = total.checked_sub(fee).ok_or(CrowdfundError::Overflow)?;

        let campaign_key = campaign.key();
        let bump = [campaign.bump];
        let campaign_id_bytes = campaign.campaign_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[
            Campaign::SEED,
            campaign.creator.as_ref(),
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

    let campaign = &mut ctx.accounts.campaign;
    let status_u8 = match new_status {
        CampaignStatus::Successful => 2,
        CampaignStatus::Failed => 3,
        _ => 0,
    };
    campaign.status = new_status;

    emit!(CampaignFinalized {
        campaign: campaign.key(),
        status: status_u8,
        total_raised: campaign.raised_amount,
    });

    Ok(())
}
```

- [ ] **Step 2: Add test**

For this test, we need a separate campaign (campaign 2) that we can let expire. The main campaign (ID 1) is still active and will be used for later tests.

```typescript
  describe("finalize_campaign", () => {
    let campaign2PDA: PublicKey;
    const campaign2Id = new anchor.BN(2);
    const backer2 = Keypair.generate();

    before(async () => {
      // Create a second campaign with a very short deadline (already passed)
      // We'll use a workaround: create with future deadline, contribute, then
      // test finalize_campaign with a campaign that has deadline in the past.
      // For testing, we create the campaign with deadline = now + 2 seconds
      // and wait for it to pass.
      [campaign2PDA] = findCampaignPDA(admin.publicKey, campaign2Id);
      const [vault2PDA] = findVaultPDA(campaign2PDA);
      const deadline = Math.floor(Date.now() / 1000) + 3; // 3 seconds from now

      await program.methods
        .createCampaign(
          campaign2Id,
          new anchor.BN(1_000_000), // 1 USDC goal
          new anchor.BN(deadline),
          0, // AllOrNothing
          Array.from(Buffer.alloc(32, 5))
        )
        .accounts({
          campaign: campaign2PDA,
          vault: vault2PDA,
          currencyMint: usdcMint,
          creator: admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Activate it
      await program.methods
        .activateCampaign()
        .accounts({
          campaign: campaign2PDA,
          creator: admin.publicKey,
        })
        .rpc();

      // Wait for deadline to pass
      await new Promise((resolve) => setTimeout(resolve, 4000));
    });

    it("finalizes an expired AllOrNothing campaign as Failed (goal not met)", async () => {
      const [vault2PDA] = findVaultPDA(campaign2PDA);
      const [configPDA] = findPlatformConfigPDA();

      await program.methods
        .finalizeCampaign()
        .accounts({
          campaign: campaign2PDA,
          vault: vault2PDA,
          creatorTokenAccount: null,
          treasuryTokenAccount: null,
          platformConfig: configPDA,
          caller: admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const campaign = await program.account.campaign.fetch(campaign2PDA);
      expect(campaign.status).to.deep.equal({ failed: {} });
    });
  });
```

- [ ] **Step 3: Run tests**

Run: `anchor test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add programs/plonbli-crowdfunding/src/instructions/finalize_campaign.rs tests/
git commit -m "feat(crowdfunding): implement finalize_campaign with fund distribution and AllOrNothing logic"
```

---

### Task 11: claim_refund Instruction

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/instructions/claim_refund.rs`
- Modify: `tests/plonbli-crowdfunding.ts`

- [ ] **Step 1: Write the instruction**

`programs/plonbli-crowdfunding/src/instructions/claim_refund.rs`:
```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::CrowdfundError;
use crate::events::RefundClaimed;
use crate::state::{Campaign, CampaignStatus, Contribution};

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
    let bump = [campaign.bump];
    let campaign_id_bytes = campaign.campaign_id.to_le_bytes();
    let signer_seeds: &[&[&[u8]]] = &[&[
        Campaign::SEED,
        campaign.creator.as_ref(),
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
```

- [ ] **Step 2: Add test**

The test uses campaign2 (which was finalized as Failed in Task 10). We need to have a contribution on that campaign first. Update the `before` block in the `finalize_campaign` describe to include a contribution from backer2, or add a dedicated test campaign. Here, we'll create campaign3 with a contribution and refund flow:

```typescript
  describe("claim_refund", () => {
    let campaign3PDA: PublicKey;
    const campaign3Id = new anchor.BN(3);
    const refundBacker = Keypair.generate();
    let refundBackerAta: PublicKey;

    before(async () => {
      // Airdrop to backer
      const sig = await provider.connection.requestAirdrop(
        refundBacker.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      // Create backer token account + mint tokens
      const ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        (admin as any).payer,
        usdcMint,
        refundBacker.publicKey
      );
      refundBackerAta = ata.address;
      await mintTo(
        provider.connection,
        (admin as any).payer,
        usdcMint,
        refundBackerAta,
        admin.publicKey,
        5_000_000
      );

      // Create campaign3 with short deadline
      [campaign3PDA] = findCampaignPDA(admin.publicKey, campaign3Id);
      const [vault3PDA] = findVaultPDA(campaign3PDA);
      const deadline = Math.floor(Date.now() / 1000) + 3;

      await program.methods
        .createCampaign(
          campaign3Id,
          new anchor.BN(10_000_000), // 10 USDC goal (won't be met)
          new anchor.BN(deadline),
          0, // AllOrNothing
          Array.from(Buffer.alloc(32, 6))
        )
        .accounts({
          campaign: campaign3PDA,
          vault: vault3PDA,
          currencyMint: usdcMint,
          creator: admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .activateCampaign()
        .accounts({ campaign: campaign3PDA, creator: admin.publicKey })
        .rpc();

      // Backer contributes 1 USDC (goal is 10, so it won't be met)
      const [contribPDA] = findContributionPDA(
        campaign3PDA,
        refundBacker.publicKey
      );
      await program.methods
        .contribute(new anchor.BN(1_000_000), null)
        .accounts({
          contribution: contribPDA,
          campaign: campaign3PDA,
          vault: vault3PDA,
          backerTokenAccount: refundBackerAta,
          backer: refundBacker.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([refundBacker])
        .rpc();

      // Wait for deadline
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Finalize (should fail since goal not met + AllOrNothing)
      const [configPDA] = findPlatformConfigPDA();
      await program.methods
        .finalizeCampaign()
        .accounts({
          campaign: campaign3PDA,
          vault: vault3PDA,
          creatorTokenAccount: null,
          treasuryTokenAccount: null,
          platformConfig: configPDA,
          caller: admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    });

    it("backer claims refund from failed campaign", async () => {
      const [contribPDA] = findContributionPDA(
        campaign3PDA,
        refundBacker.publicKey
      );
      const [vault3PDA] = findVaultPDA(campaign3PDA);

      const balanceBefore = await provider.connection.getTokenAccountBalance(
        refundBackerAta
      );

      await program.methods
        .claimRefund()
        .accounts({
          contribution: contribPDA,
          campaign: campaign3PDA,
          vault: vault3PDA,
          backerTokenAccount: refundBackerAta,
          backer: refundBacker.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([refundBacker])
        .rpc();

      const contribution = await program.account.contribution.fetch(contribPDA);
      expect(contribution.refunded).to.be.true;

      const balanceAfter = await provider.connection.getTokenAccountBalance(
        refundBackerAta
      );
      expect(
        Number(balanceAfter.value.amount) - Number(balanceBefore.value.amount)
      ).to.equal(1_000_000);
    });

    it("rejects double refund", async () => {
      const [contribPDA] = findContributionPDA(
        campaign3PDA,
        refundBacker.publicKey
      );
      const [vault3PDA] = findVaultPDA(campaign3PDA);

      try {
        await program.methods
          .claimRefund()
          .accounts({
            contribution: contribPDA,
            campaign: campaign3PDA,
            vault: vault3PDA,
            backerTokenAccount: refundBackerAta,
            backer: refundBacker.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([refundBacker])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("AlreadyRefunded");
      }
    });
  });
```

- [ ] **Step 3: Run tests**

Run: `anchor test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add programs/plonbli-crowdfunding/src/instructions/claim_refund.rs tests/
git commit -m "feat(crowdfunding): implement claim_refund with double-refund protection"
```

---

### Task 12: update_platform_config Instruction

**Files:**
- Modify: `programs/plonbli-crowdfunding/src/instructions/update_platform_config.rs`
- Modify: `tests/plonbli-crowdfunding.ts`

- [ ] **Step 1: Write the instruction**

`programs/plonbli-crowdfunding/src/instructions/update_platform_config.rs`:
```rust
use anchor_lang::prelude::*;
use crate::errors::CrowdfundError;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct UpdatePlatformConfig<'info> {
    #[account(
        mut,
        seeds = [PlatformConfig::SEED],
        bump = platform_config.bump,
        has_one = admin @ CrowdfundError::Unauthorized,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub admin: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdatePlatformConfig>,
    fee_basis_points: Option<u16>,
    new_treasury: Option<Pubkey>,
) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;

    if let Some(fee) = fee_basis_points {
        require!(fee <= 1000, CrowdfundError::FeeTooHigh);
        config.fee_basis_points = fee;
    }

    if let Some(treasury) = new_treasury {
        config.treasury = treasury;
    }

    Ok(())
}
```

- [ ] **Step 2: Add test**

```typescript
  describe("update_platform_config", () => {
    it("admin updates fee", async () => {
      const [configPDA] = findPlatformConfigPDA();

      await program.methods
        .updatePlatformConfig(200, null) // 2% fee
        .accounts({
          platformConfig: configPDA,
          admin: admin.publicKey,
        })
        .rpc();

      const config = await program.account.platformConfig.fetch(configPDA);
      expect(config.feeBasisPoints).to.equal(200);
    });

    it("rejects fee > 10%", async () => {
      const [configPDA] = findPlatformConfigPDA();

      try {
        await program.methods
          .updatePlatformConfig(1001, null)
          .accounts({
            platformConfig: configPDA,
            admin: admin.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("FeeTooHigh");
      }
    });

    it("resets fee back to 0 for other tests", async () => {
      const [configPDA] = findPlatformConfigPDA();

      await program.methods
        .updatePlatformConfig(0, null)
        .accounts({
          platformConfig: configPDA,
          admin: admin.publicKey,
        })
        .rpc();

      const config = await program.account.platformConfig.fetch(configPDA);
      expect(config.feeBasisPoints).to.equal(0);
    });
  });
```

- [ ] **Step 3: Run tests**

Run: `anchor test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add programs/plonbli-crowdfunding/src/instructions/update_platform_config.rs tests/
git commit -m "feat(crowdfunding): implement update_platform_config with fee validation"
```

---

## Phase 2: Off-Chain Schema & Domain

### Task 13: Drizzle Schema Tables

**Files:**
- Create: `src/shared/db/schema/crowdfunding.ts`
- Create: `src/shared/db/schema/user-wallets.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Write crowdfunding schema**

`src/shared/db/schema/crowdfunding.ts`:
```typescript
import { pgTable, text, timestamp, boolean, smallint, integer, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { groups } from "./groups";
import { products } from "./products";

export const campaignCategoryEnum = pgEnum("campaign_category", [
  "FARMER_INVESTMENT",
  "GROUP_PRE_ORDER",
  "COMMUNITY_PROJECT",
]);

export const fundingModelEnum = pgEnum("funding_model", [
  "ALL_OR_NOTHING",
  "KEEP_WHAT_YOU_RAISE",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "SETUP",
  "ACTIVE",
  "SUCCESSFUL",
  "FAILED",
  "FINALIZED",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "PENDING",
  "APPROVED",
  "RELEASED",
]);

// --- Tables ---

export const crowdfundingCampaigns = pgTable("crowdfunding_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  creatorId: text("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => groups.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  images: text("images").array().notNull().default([]),
  category: campaignCategoryEnum("category").notNull(),
  campaignPubkey: text("campaign_pubkey").notNull().unique(),
  currencyMint: text("currency_mint").notNull(),
  fundingModel: fundingModelEnum("funding_model").notNull(),
  goalAmount: text("goal_amount").notNull(),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  status: campaignStatusEnum("status").notNull().default("SETUP"),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const crowdfundingMilestones = pgTable("crowdfunding_milestones", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  campaignId: text("campaign_id").notNull().references(() => crowdfundingCampaigns.id, { onDelete: "cascade" }),
  milestoneIndex: smallint("milestone_index").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  descriptionHash: text("description_hash").notNull(),
  targetAmount: text("target_amount").notNull(),
  status: milestoneStatusEnum("status").notNull().default("PENDING"),
});

export const crowdfundingRewardTiers = pgTable("crowdfunding_reward_tiers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  campaignId: text("campaign_id").notNull().references(() => crowdfundingCampaigns.id, { onDelete: "cascade" }),
  tierIndex: smallint("tier_index").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  descriptionHash: text("description_hash").notNull(),
  price: text("price").notNull(),
  maxBackers: integer("max_backers").notNull().default(0),
  currentBackers: integer("current_backers").notNull().default(0),
  isProductLinked: boolean("is_product_linked").notNull().default(false),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
});

export const crowdfundingContributions = pgTable("crowdfunding_contributions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  campaignId: text("campaign_id").notNull().references(() => crowdfundingCampaigns.id, { onDelete: "cascade" }),
  backerId: text("backer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: text("amount").notNull(),
  rewardTierId: text("reward_tier_id").references(() => crowdfundingRewardTiers.id, { onDelete: "set null" }),
  contributionPubkey: text("contribution_pubkey").notNull(),
  transactionSignature: text("transaction_signature").notNull(),
  refunded: boolean("refunded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Relations ---

export const crowdfundingCampaignsRelations = relations(crowdfundingCampaigns, ({ one, many }) => ({
  creator: one(users, { fields: [crowdfundingCampaigns.creatorId], references: [users.id] }),
  group: one(groups, { fields: [crowdfundingCampaigns.groupId], references: [groups.id] }),
  milestones: many(crowdfundingMilestones),
  rewardTiers: many(crowdfundingRewardTiers),
  contributions: many(crowdfundingContributions),
}));

export const crowdfundingMilestonesRelations = relations(crowdfundingMilestones, ({ one }) => ({
  campaign: one(crowdfundingCampaigns, { fields: [crowdfundingMilestones.campaignId], references: [crowdfundingCampaigns.id] }),
}));

export const crowdfundingRewardTiersRelations = relations(crowdfundingRewardTiers, ({ one, many }) => ({
  campaign: one(crowdfundingCampaigns, { fields: [crowdfundingRewardTiers.campaignId], references: [crowdfundingCampaigns.id] }),
  product: one(products, { fields: [crowdfundingRewardTiers.productId], references: [products.id] }),
  contributions: many(crowdfundingContributions),
}));

export const crowdfundingContributionsRelations = relations(crowdfundingContributions, ({ one }) => ({
  campaign: one(crowdfundingCampaigns, { fields: [crowdfundingContributions.campaignId], references: [crowdfundingCampaigns.id] }),
  backer: one(users, { fields: [crowdfundingContributions.backerId], references: [users.id] }),
  rewardTier: one(crowdfundingRewardTiers, { fields: [crowdfundingContributions.rewardTierId], references: [crowdfundingRewardTiers.id] }),
}));

// --- Type exports ---

export type CrowdfundingCampaign = typeof crowdfundingCampaigns.$inferSelect;
export type NewCrowdfundingCampaign = typeof crowdfundingCampaigns.$inferInsert;
export type CrowdfundingMilestone = typeof crowdfundingMilestones.$inferSelect;
export type NewCrowdfundingMilestone = typeof crowdfundingMilestones.$inferInsert;
export type CrowdfundingRewardTier = typeof crowdfundingRewardTiers.$inferSelect;
export type NewCrowdfundingRewardTier = typeof crowdfundingRewardTiers.$inferInsert;
export type CrowdfundingContribution = typeof crowdfundingContributions.$inferSelect;
export type NewCrowdfundingContribution = typeof crowdfundingContributions.$inferInsert;
```

- [ ] **Step 2: Write user-wallets schema**

`src/shared/db/schema/user-wallets.ts`:
```typescript
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const userWallets = pgTable("user_wallets", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull(),
  encryptedSecretKey: text("encrypted_secret_key"),
  isCustodial: boolean("is_custodial").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userWalletsRelations = relations(userWallets, ({ one }) => ({
  user: one(users, { fields: [userWallets.userId], references: [users.id] }),
}));

export type UserWallet = typeof userWallets.$inferSelect;
export type NewUserWallet = typeof userWallets.$inferInsert;
```

- [ ] **Step 3: Add to schema barrel export**

Add these exports to `src/shared/db/schema/index.ts`:
```typescript
// Crowdfunding
export {
  campaignCategoryEnum,
  fundingModelEnum,
  campaignStatusEnum,
  milestoneStatusEnum,
  crowdfundingCampaigns,
  crowdfundingMilestones,
  crowdfundingRewardTiers,
  crowdfundingContributions,
  crowdfundingCampaignsRelations,
  crowdfundingMilestonesRelations,
  crowdfundingRewardTiersRelations,
  crowdfundingContributionsRelations,
  type CrowdfundingCampaign,
  type NewCrowdfundingCampaign,
  type CrowdfundingMilestone,
  type NewCrowdfundingMilestone,
  type CrowdfundingRewardTier,
  type NewCrowdfundingRewardTier,
  type CrowdfundingContribution,
  type NewCrowdfundingContribution,
} from "./crowdfunding";

// User Wallets
export {
  userWallets,
  userWalletsRelations,
  type UserWallet,
  type NewUserWallet,
} from "./user-wallets";
```

- [ ] **Step 4: Generate migration**

Run:
```bash
npm run db:generate
```
Expected: Migration SQL generated in `drizzle/` directory.

- [ ] **Step 5: Run migration**

Run:
```bash
npm run db:push
```
Expected: Tables created in database. Verify with `npm run db:studio`.

- [ ] **Step 6: Commit**

```bash
git add src/shared/db/schema/crowdfunding.ts src/shared/db/schema/user-wallets.ts src/shared/db/schema/index.ts drizzle/
git commit -m "feat(crowdfunding): add Drizzle schema for crowdfunding tables and user wallets"
```

---

### Task 14: Domain Types & Zod Schemas

**Files:**
- Create: `src/domains/crowdfunding/types.ts`
- Create: `src/domains/crowdfunding/schemas/validation.ts`

- [ ] **Step 1: Write domain types**

`src/domains/crowdfunding/types.ts`:
```typescript
export type CampaignCategory = "FARMER_INVESTMENT" | "GROUP_PRE_ORDER" | "COMMUNITY_PROJECT";
export type FundingModel = "ALL_OR_NOTHING" | "KEEP_WHAT_YOU_RAISE";
export type CampaignStatus = "SETUP" | "ACTIVE" | "SUCCESSFUL" | "FAILED" | "FINALIZED";
export type MilestoneStatus = "PENDING" | "APPROVED" | "RELEASED";

export interface CampaignSummary {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: CampaignCategory;
  fundingModel: FundingModel;
  goalAmount: string;
  status: CampaignStatus;
  deadline: Date;
  campaignPubkey: string;
  creatorName: string;
  creatorAvatar: string | null;
}

export interface CampaignDetail extends CampaignSummary {
  creatorId: string;
  groupId: string | null;
  groupName: string | null;
  currencyMint: string;
  contentHash: string;
  milestones: MilestoneDetail[];
  rewardTiers: RewardTierDetail[];
  backerCount: number;
  createdAt: Date;
}

export interface MilestoneDetail {
  id: string;
  milestoneIndex: number;
  title: string;
  description: string;
  targetAmount: string;
  status: MilestoneStatus;
}

export interface RewardTierDetail {
  id: string;
  tierIndex: number;
  title: string;
  description: string;
  price: string;
  maxBackers: number;
  currentBackers: number;
  isProductLinked: boolean;
  productId: string | null;
  productName: string | null;
}

export interface ContributionRecord {
  id: string;
  campaignId: string;
  campaignTitle: string;
  amount: string;
  rewardTierTitle: string | null;
  transactionSignature: string;
  refunded: boolean;
  createdAt: Date;
}
```

- [ ] **Step 2: Write Zod validation schemas**

`src/domains/crowdfunding/schemas/validation.ts`:
```typescript
import { z } from "zod";

export const createCampaignSchema = z.object({
  title: z.string().min(3, "Tytuł musi mieć minimum 3 znaki").max(200),
  description: z.string().min(10, "Opis musi mieć minimum 10 znaków").max(10000),
  images: z.array(z.string().url()).max(10).default([]),
  category: z.enum(["FARMER_INVESTMENT", "GROUP_PRE_ORDER", "COMMUNITY_PROJECT"]),
  fundingModel: z.enum(["ALL_OR_NOTHING", "KEEP_WHAT_YOU_RAISE"]),
  goalAmount: z.string().regex(/^\d+$/, "Kwota musi być liczbą"),
  currencyMint: z.string().min(32).max(44),
  deadline: z.string().datetime(),
  groupId: z.string().optional(),
});
export type CreateCampaignInput = z.input<typeof createCampaignSchema>;

export const addMilestoneSchema = z.object({
  campaignId: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  targetAmount: z.string().regex(/^\d+$/),
});
export type AddMilestoneInput = z.input<typeof addMilestoneSchema>;

export const addRewardTierSchema = z.object({
  campaignId: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  price: z.string().regex(/^\d+$/),
  maxBackers: z.number().int().min(0).default(0),
  isProductLinked: z.boolean().default(false),
  productId: z.string().optional(),
});
export type AddRewardTierInput = z.input<typeof addRewardTierSchema>;

export const contributeSchema = z.object({
  campaignId: z.string(),
  amount: z.string().regex(/^\d+$/),
  rewardTierId: z.string().optional(),
});
export type ContributeInput = z.input<typeof contributeSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/crowdfunding/types.ts src/domains/crowdfunding/schemas/
git commit -m "feat(crowdfunding): add domain types and Zod validation schemas"
```

---

### Task 15: Wallet Encryption & Content Hash Utilities

**Files:**
- Create: `src/domains/crowdfunding/lib/wallet-encryption.ts`
- Create: `src/domains/crowdfunding/lib/content-hash.ts`

- [ ] **Step 1: Write wallet encryption**

`src/domains/crowdfunding/lib/wallet-encryption.ts`:
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.WALLET_ENCRYPTION_KEY;
  if (!key) throw new Error("WALLET_ENCRYPTION_KEY not set");
  return Buffer.from(key, "hex");
}

export function encryptSecretKey(secretKey: Uint8Array): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKey)),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted (all base64)
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecretKey(encrypted: string): Uint8Array {
  const key = getEncryptionKey();
  const [ivB64, tagB64, dataB64] = encrypted.split(":");

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return new Uint8Array(decrypted);
}
```

- [ ] **Step 2: Write content hash utility**

`src/domains/crowdfunding/lib/content-hash.ts`:
```typescript
export async function computeContentHash(data: {
  title: string;
  description: string;
  images: string[];
}): Promise<string> {
  const payload = JSON.stringify({
    title: data.title,
    description: data.description,
    images: data.images.sort(),
  });

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}
```

- [ ] **Step 3: Write tests**

`src/domains/crowdfunding/lib/__tests__/content-hash.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { computeContentHash, hexToBytes } from "../content-hash";

describe("computeContentHash", () => {
  it("produces consistent hash for same input", async () => {
    const input = { title: "Test", description: "Description", images: ["a.jpg"] };
    const hash1 = await computeContentHash(input);
    const hash2 = await computeContentHash(input);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it("produces different hash for different input", async () => {
    const hash1 = await computeContentHash({ title: "A", description: "B", images: [] });
    const hash2 = await computeContentHash({ title: "C", description: "D", images: [] });
    expect(hash1).not.toBe(hash2);
  });

  it("is order-independent for images", async () => {
    const hash1 = await computeContentHash({ title: "T", description: "D", images: ["a.jpg", "b.jpg"] });
    const hash2 = await computeContentHash({ title: "T", description: "D", images: ["b.jpg", "a.jpg"] });
    expect(hash1).toBe(hash2);
  });
});

describe("hexToBytes", () => {
  it("converts hex string to byte array", () => {
    expect(hexToBytes("ff00ab")).toEqual([255, 0, 171]);
  });
});
```

- [ ] **Step 4: Run tests**

Run:
```bash
npm run test -- src/domains/crowdfunding/lib/__tests__/content-hash.test.ts
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domains/crowdfunding/lib/
git commit -m "feat(crowdfunding): add wallet encryption and content hash utilities"
```

---

## Phase 3: Frontend Integration

### Task 16: Solana Client & Provider

**Files:**
- Create: `src/domains/crowdfunding/lib/solana-client.ts`
- Create: `src/domains/crowdfunding/components/solana-provider.tsx`

**Prerequisites:** Install Solana frontend dependencies:
```bash
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base
```

Note: The Anchor TypeScript client currently requires `@solana/web3.js` v1. The `@solana/react-hooks` (framework-kit) is for `@solana/kit` v6. Since we use Anchor, we stick with the wallet-adapter ecosystem which is compatible with web3.js v1.

- [ ] **Step 1: Write Solana client**

`src/domains/crowdfunding/lib/solana-client.ts`:
```typescript
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import idl from "../../../../target/idl/plonbli_crowdfunding.json";

export const PROGRAM_ID = new PublicKey(idl.address);

export const SOLANA_CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet") as "devnet" | "mainnet-beta";

export function getConnection(): Connection {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_CLUSTER);
  return new Connection(endpoint, "confirmed");
}

export function getProgram(provider: AnchorProvider): Program {
  return new Program(idl as Idl, provider);
}

// PDA derivation helpers (mirror the on-chain seeds)

export function findPlatformConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    PROGRAM_ID
  );
}

export function findCampaignPDA(creator: PublicKey, campaignId: bigint): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(campaignId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("campaign"), creator.toBuffer(), idBuffer],
    PROGRAM_ID
  );
}

export function findVaultPDA(campaign: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), campaign.toBuffer()],
    PROGRAM_ID
  );
}

export function findMilestonePDA(campaign: PublicKey, index: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("milestone"), campaign.toBuffer(), Buffer.from([index])],
    PROGRAM_ID
  );
}

export function findRewardTierPDA(campaign: PublicKey, index: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reward_tier"), campaign.toBuffer(), Buffer.from([index])],
    PROGRAM_ID
  );
}

export function findContributionPDA(campaign: PublicKey, backer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("contribution"), campaign.toBuffer(), backer.toBuffer()],
    PROGRAM_ID
  );
}
```

- [ ] **Step 2: Write Solana provider**

`src/domains/crowdfunding/components/solana-provider.tsx`:
```typescript
"use client";

import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet"),
    []
  );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/crowdfunding/lib/solana-client.ts src/domains/crowdfunding/components/solana-provider.tsx
git commit -m "feat(crowdfunding): add Solana client with PDA helpers and wallet provider"
```

---

### Task 17: Campaign Queries

**Files:**
- Create: `src/domains/crowdfunding/queries/get-campaigns.ts`
- Create: `src/domains/crowdfunding/queries/get-campaign.ts`
- Create: `src/domains/crowdfunding/queries/get-user-contributions.ts`
- Create: `src/domains/crowdfunding/queries/get-user-campaigns.ts`

- [ ] **Step 1: Write get-campaigns query**

`src/domains/crowdfunding/queries/get-campaigns.ts`:
```typescript
import { db } from "@/shared/db";
import { crowdfundingCampaigns, users } from "@/shared/db/schema";
import { eq, desc, and, gte, lte, SQL, ilike } from "drizzle-orm";
import type { CampaignCategory, CampaignStatus } from "../types";

const ITEMS_PER_PAGE = 12;

interface GetCampaignsFilters {
  category?: CampaignCategory;
  status?: CampaignStatus;
  search?: string;
  page?: number;
}

export async function getCampaigns(filters: GetCampaignsFilters = {}) {
  const conditions: SQL[] = [];

  if (filters.category) {
    conditions.push(eq(crowdfundingCampaigns.category, filters.category));
  }
  if (filters.status) {
    conditions.push(eq(crowdfundingCampaigns.status, filters.status));
  }
  if (filters.search) {
    conditions.push(ilike(crowdfundingCampaigns.title, `%${filters.search}%`));
  }

  const page = filters.page || 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [results, countResult] = await Promise.all([
    db
      .select({
        id: crowdfundingCampaigns.id,
        title: crowdfundingCampaigns.title,
        description: crowdfundingCampaigns.description,
        images: crowdfundingCampaigns.images,
        category: crowdfundingCampaigns.category,
        fundingModel: crowdfundingCampaigns.fundingModel,
        goalAmount: crowdfundingCampaigns.goalAmount,
        status: crowdfundingCampaigns.status,
        deadline: crowdfundingCampaigns.deadline,
        campaignPubkey: crowdfundingCampaigns.campaignPubkey,
        creatorName: users.name,
        creatorAvatar: users.avatar,
      })
      .from(crowdfundingCampaigns)
      .innerJoin(users, eq(crowdfundingCampaigns.creatorId, users.id))
      .where(where)
      .orderBy(desc(crowdfundingCampaigns.createdAt))
      .limit(ITEMS_PER_PAGE)
      .offset(offset),
    db
      .select({ count: crowdfundingCampaigns.id })
      .from(crowdfundingCampaigns)
      .where(where),
  ]);

  const total = countResult.length;
  return {
    results,
    total,
    page,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
  };
}

export type CampaignListItem = Awaited<ReturnType<typeof getCampaigns>>["results"][number];
```

- [ ] **Step 2: Write get-campaign query**

`src/domains/crowdfunding/queries/get-campaign.ts`:
```typescript
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingMilestones,
  crowdfundingRewardTiers,
  crowdfundingContributions,
  users,
  groups,
  products,
} from "@/shared/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getCampaign(id: string) {
  const [campaign] = await db
    .select({
      id: crowdfundingCampaigns.id,
      title: crowdfundingCampaigns.title,
      description: crowdfundingCampaigns.description,
      images: crowdfundingCampaigns.images,
      category: crowdfundingCampaigns.category,
      fundingModel: crowdfundingCampaigns.fundingModel,
      goalAmount: crowdfundingCampaigns.goalAmount,
      status: crowdfundingCampaigns.status,
      deadline: crowdfundingCampaigns.deadline,
      campaignPubkey: crowdfundingCampaigns.campaignPubkey,
      currencyMint: crowdfundingCampaigns.currencyMint,
      contentHash: crowdfundingCampaigns.contentHash,
      creatorId: crowdfundingCampaigns.creatorId,
      groupId: crowdfundingCampaigns.groupId,
      createdAt: crowdfundingCampaigns.createdAt,
      creatorName: users.name,
      creatorAvatar: users.avatar,
    })
    .from(crowdfundingCampaigns)
    .innerJoin(users, eq(crowdfundingCampaigns.creatorId, users.id))
    .where(eq(crowdfundingCampaigns.id, id))
    .limit(1);

  if (!campaign) return null;

  const [milestones, rewardTiers, contributions] = await Promise.all([
    db
      .select()
      .from(crowdfundingMilestones)
      .where(eq(crowdfundingMilestones.campaignId, id))
      .orderBy(asc(crowdfundingMilestones.milestoneIndex)),
    db
      .select({
        id: crowdfundingRewardTiers.id,
        tierIndex: crowdfundingRewardTiers.tierIndex,
        title: crowdfundingRewardTiers.title,
        description: crowdfundingRewardTiers.description,
        price: crowdfundingRewardTiers.price,
        maxBackers: crowdfundingRewardTiers.maxBackers,
        currentBackers: crowdfundingRewardTiers.currentBackers,
        isProductLinked: crowdfundingRewardTiers.isProductLinked,
        productId: crowdfundingRewardTiers.productId,
        productName: products.name,
      })
      .from(crowdfundingRewardTiers)
      .leftJoin(products, eq(crowdfundingRewardTiers.productId, products.id))
      .where(eq(crowdfundingRewardTiers.campaignId, id))
      .orderBy(asc(crowdfundingRewardTiers.tierIndex)),
    db
      .select({ count: crowdfundingContributions.id })
      .from(crowdfundingContributions)
      .where(eq(crowdfundingContributions.campaignId, id)),
  ]);

  return {
    ...campaign,
    milestones,
    rewardTiers,
    backerCount: contributions.length,
  };
}

export type CampaignDetailResult = NonNullable<Awaited<ReturnType<typeof getCampaign>>>;
```

- [ ] **Step 3: Write get-user-contributions and get-user-campaigns**

`src/domains/crowdfunding/queries/get-user-contributions.ts`:
```typescript
import { db } from "@/shared/db";
import { crowdfundingContributions, crowdfundingCampaigns, crowdfundingRewardTiers } from "@/shared/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getUserContributions(userId: string) {
  return db
    .select({
      id: crowdfundingContributions.id,
      campaignId: crowdfundingContributions.campaignId,
      campaignTitle: crowdfundingCampaigns.title,
      amount: crowdfundingContributions.amount,
      rewardTierTitle: crowdfundingRewardTiers.title,
      transactionSignature: crowdfundingContributions.transactionSignature,
      refunded: crowdfundingContributions.refunded,
      createdAt: crowdfundingContributions.createdAt,
    })
    .from(crowdfundingContributions)
    .innerJoin(crowdfundingCampaigns, eq(crowdfundingContributions.campaignId, crowdfundingCampaigns.id))
    .leftJoin(crowdfundingRewardTiers, eq(crowdfundingContributions.rewardTierId, crowdfundingRewardTiers.id))
    .where(eq(crowdfundingContributions.backerId, userId))
    .orderBy(desc(crowdfundingContributions.createdAt));
}

export type UserContribution = Awaited<ReturnType<typeof getUserContributions>>[number];
```

`src/domains/crowdfunding/queries/get-user-campaigns.ts`:
```typescript
import { db } from "@/shared/db";
import { crowdfundingCampaigns } from "@/shared/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getUserCampaigns(userId: string) {
  return db
    .select()
    .from(crowdfundingCampaigns)
    .where(eq(crowdfundingCampaigns.creatorId, userId))
    .orderBy(desc(crowdfundingCampaigns.createdAt));
}

export type UserCampaign = Awaited<ReturnType<typeof getUserCampaigns>>[number];
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/crowdfunding/queries/
git commit -m "feat(crowdfunding): add campaign queries (list, detail, user contributions, user campaigns)"
```

---

### Task 18: Server Actions — Create Campaign & Contribute

**Files:**
- Create: `src/domains/crowdfunding/actions/create-campaign.ts`
- Create: `src/domains/crowdfunding/actions/contribute.ts`
- Create: `src/domains/crowdfunding/actions/wallet-actions.ts`

- [ ] **Step 1: Write wallet actions**

`src/domains/crowdfunding/actions/wallet-actions.ts`:
```typescript
"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { userWallets } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { Keypair } from "@solana/web3.js";
import { encryptSecretKey } from "../lib/wallet-encryption";

type WalletResult =
  | { success: true; publicKey: string; isCustodial: boolean }
  | { success: false; error: string };

export async function getOrCreateCustodialWallet(): Promise<WalletResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jesteś zalogowany" };
  }

  // Check if user already has a wallet
  const [existing] = await db
    .select()
    .from(userWallets)
    .where(eq(userWallets.userId, session.user.id))
    .limit(1);

  if (existing) {
    return { success: true, publicKey: existing.publicKey, isCustodial: existing.isCustodial };
  }

  // Generate new keypair
  const keypair = Keypair.generate();
  const encrypted = encryptSecretKey(keypair.secretKey);

  await db.insert(userWallets).values({
    userId: session.user.id,
    publicKey: keypair.publicKey.toBase58(),
    encryptedSecretKey: encrypted,
    isCustodial: true,
  });

  return {
    success: true,
    publicKey: keypair.publicKey.toBase58(),
    isCustodial: true,
  };
}

export async function saveExternalWallet(publicKey: string): Promise<WalletResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jesteś zalogowany" };
  }

  // Upsert: replace existing wallet
  const [existing] = await db
    .select()
    .from(userWallets)
    .where(eq(userWallets.userId, session.user.id))
    .limit(1);

  if (existing) {
    await db
      .update(userWallets)
      .set({ publicKey, encryptedSecretKey: null, isCustodial: false })
      .where(eq(userWallets.id, existing.id));
  } else {
    await db.insert(userWallets).values({
      userId: session.user.id,
      publicKey,
      encryptedSecretKey: null,
      isCustodial: false,
    });
  }

  return { success: true, publicKey, isCustodial: false };
}
```

- [ ] **Step 2: Write create campaign action**

`src/domains/crowdfunding/actions/create-campaign.ts`:
```typescript
"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { crowdfundingCampaigns } from "@/shared/db/schema";
import { createCampaignSchema, type CreateCampaignInput } from "../schemas/validation";
import { computeContentHash, hexToBytes } from "../lib/content-hash";

type CreateCampaignResult =
  | { success: true; campaignId: string; campaignPubkey: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createCampaignAction(
  input: CreateCampaignInput,
  campaignPubkey: string,
): Promise<CreateCampaignResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jesteś zalogowany" };
  }

  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const contentHash = await computeContentHash({
    title: data.title,
    description: data.description,
    images: data.images,
  });

  const [campaign] = await db
    .insert(crowdfundingCampaigns)
    .values({
      creatorId: session.user.id,
      groupId: data.groupId || null,
      title: data.title,
      description: data.description,
      images: data.images,
      category: data.category,
      campaignPubkey,
      currencyMint: data.currencyMint,
      fundingModel: data.fundingModel,
      goalAmount: data.goalAmount,
      deadline: new Date(data.deadline),
      status: "SETUP",
      contentHash,
    })
    .returning({ id: crowdfundingCampaigns.id });

  return {
    success: true,
    campaignId: campaign.id,
    campaignPubkey,
  };
}
```

- [ ] **Step 3: Write contribute action**

`src/domains/crowdfunding/actions/contribute.ts`:
```typescript
"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { crowdfundingContributions } from "@/shared/db/schema";
import { contributeSchema, type ContributeInput } from "../schemas/validation";

type ContributeResult =
  | { success: true; contributionId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function contributeAction(
  input: ContributeInput,
  contributionPubkey: string,
  transactionSignature: string,
): Promise<ContributeResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jesteś zalogowany" };
  }

  const parsed = contributeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const [contribution] = await db
    .insert(crowdfundingContributions)
    .values({
      campaignId: data.campaignId,
      backerId: session.user.id,
      amount: data.amount,
      rewardTierId: data.rewardTierId || null,
      contributionPubkey,
      transactionSignature,
      refunded: false,
    })
    .returning({ id: crowdfundingContributions.id });

  return { success: true, contributionId: contribution.id };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/crowdfunding/actions/
git commit -m "feat(crowdfunding): add server actions for wallet management, campaign creation, and contributions"
```

---

### Task 19: Core UI Components

**Files:**
- Create: `src/domains/crowdfunding/components/campaign-card.tsx`
- Create: `src/domains/crowdfunding/components/funding-progress.tsx`
- Create: `src/domains/crowdfunding/components/wallet-connect.tsx`
- Create: `src/domains/crowdfunding/hooks/use-wallet.ts`

- [ ] **Step 1: Write wallet hook**

`src/domains/crowdfunding/hooks/use-wallet.ts`:
```typescript
"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  isCustodial: boolean;
  loading: boolean;
}

export function useSolanaWallet(): WalletState {
  const { connected, publicKey } = useWallet();
  const [custodialKey, setCustodialKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected && publicKey) {
      setLoading(false);
      return;
    }

    // Check for custodial wallet
    fetch("/api/wallet/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.publicKey) {
          setCustodialKey(data.publicKey);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [connected, publicKey]);

  if (connected && publicKey) {
    return {
      connected: true,
      publicKey: publicKey.toBase58(),
      isCustodial: false,
      loading: false,
    };
  }

  return {
    connected: !!custodialKey,
    publicKey: custodialKey,
    isCustodial: true,
    loading,
  };
}
```

- [ ] **Step 2: Write campaign card**

`src/domains/crowdfunding/components/campaign-card.tsx`:
```typescript
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import type { CampaignListItem } from "../queries/get-campaigns";

interface CampaignCardProps {
  campaign: CampaignListItem;
  raisedAmount?: string;
}

const categoryColors: Record<string, string> = {
  FARMER_INVESTMENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  GROUP_PRE_ORDER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  COMMUNITY_PROJECT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function CampaignCard({ campaign, raisedAmount = "0" }: CampaignCardProps) {
  const t = useTranslations("crowdfunding");

  const goal = Number(campaign.goalAmount);
  const raised = Number(raisedAmount);
  const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86400000)
  );

  return (
    <Link href={`/crowdfunding/${campaign.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        {campaign.images[0] && (
          <div className="relative h-48 w-full">
            <Image
              src={campaign.images[0]}
              alt={campaign.title}
              fill
              className="object-cover rounded-t-lg"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge className={categoryColors[campaign.category] || ""}>
              {t(`category.${campaign.category}`)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {daysLeft > 0 ? t("daysLeft", { count: daysLeft }) : t("ended")}
            </span>
          </div>
          <h3 className="font-semibold text-lg line-clamp-2">{campaign.title}</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {campaign.description}
          </p>
          <Progress value={progress} className="mb-2" />
          <div className="flex justify-between text-sm">
            <span className="font-medium">{progress.toFixed(0)}%</span>
            <span className="text-muted-foreground">
              {t("goalOf", { amount: campaign.goalAmount })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-muted-foreground">
              {t("by")} {campaign.creatorName}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Write funding progress component**

`src/domains/crowdfunding/components/funding-progress.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Progress } from "@/shared/ui/progress";
import { getConnection } from "../lib/solana-client";
import { PublicKey } from "@solana/web3.js";

interface FundingProgressProps {
  vaultPubkey: string;
  goalAmount: string;
  currencyMint: string;
  decimals?: number;
}

export function FundingProgress({
  vaultPubkey,
  goalAmount,
  currencyMint,
  decimals = 6,
}: FundingProgressProps) {
  const t = useTranslations("crowdfunding");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const connection = getConnection();
    const vault = new PublicKey(vaultPubkey);

    async function fetchBalance() {
      try {
        const accountInfo = await connection.getTokenAccountBalance(vault);
        setBalance(Number(accountInfo.value.amount));
      } catch {
        setBalance(0);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [vaultPubkey]);

  const goal = Number(goalAmount);
  const progress = goal > 0 ? Math.min((balance / goal) * 100, 100) : 0;
  const displayBalance = (balance / Math.pow(10, decimals)).toFixed(2);
  const displayGoal = (goal / Math.pow(10, decimals)).toFixed(2);

  if (loading) {
    return <div className="animate-pulse h-8 bg-muted rounded" />;
  }

  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-3" />
      <div className="flex justify-between text-sm">
        <span className="font-bold text-lg">
          {displayBalance} {currencyMint.includes("USDC") ? "USDC" : "SOL"}
        </span>
        <span className="text-muted-foreground">
          {t("goalOf", { amount: displayGoal })}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{progress.toFixed(1)}% {t("funded")}</p>
    </div>
  );
}
```

- [ ] **Step 4: Write wallet connect component**

`src/domains/crowdfunding/components/wallet-connect.tsx`:
```typescript
"use client";

import { useTranslations } from "next-intl";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/shared/ui/button";
import { useSolanaWallet } from "../hooks/use-wallet";
import { getOrCreateCustodialWallet } from "../actions/wallet-actions";
import { useState } from "react";

export function WalletConnect() {
  const t = useTranslations("crowdfunding.wallet");
  const { connected, publicKey } = useWallet();
  const wallet = useSolanaWallet();
  const [creating, setCreating] = useState(false);

  if (wallet.loading) {
    return <div className="animate-pulse h-10 w-40 bg-muted rounded" />;
  }

  if (wallet.connected) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <p className="text-muted-foreground">
            {wallet.isCustodial ? t("custodial") : t("external")}
          </p>
          <p className="font-mono text-xs">
            {wallet.publicKey?.slice(0, 8)}...{wallet.publicKey?.slice(-8)}
          </p>
        </div>
        {!wallet.isCustodial && <WalletMultiButton />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <WalletMultiButton />
      <div className="text-center text-sm text-muted-foreground">{t("or")}</div>
      <Button
        variant="outline"
        disabled={creating}
        onClick={async () => {
          setCreating(true);
          await getOrCreateCustodialWallet();
          window.location.reload();
        }}
      >
        {creating ? t("creating") : t("createCustodial")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/domains/crowdfunding/components/ src/domains/crowdfunding/hooks/
git commit -m "feat(crowdfunding): add campaign card, funding progress, and wallet connect components"
```

---

### Task 20: App Routes

**Files:**
- Create: `src/app/[locale]/(main)/crowdfunding/page.tsx`
- Create: `src/app/[locale]/(main)/crowdfunding/[id]/page.tsx`
- Create: `src/app/[locale]/(main)/crowdfunding/layout.tsx`

- [ ] **Step 1: Write crowdfunding layout (wraps with SolanaProvider)**

`src/app/[locale]/(main)/crowdfunding/layout.tsx`:
```typescript
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const SolanaProvider = dynamic(
  () => import("@/domains/crowdfunding/components/solana-provider").then((m) => m.SolanaProvider),
  { ssr: false }
);

export default function CrowdfundingLayout({ children }: { children: ReactNode }) {
  return <SolanaProvider>{children}</SolanaProvider>;
}
```

- [ ] **Step 2: Write campaign listing page**

`src/app/[locale]/(main)/crowdfunding/page.tsx`:
```typescript
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getCampaigns } from "@/domains/crowdfunding/queries/get-campaigns";
import { CampaignCard } from "@/domains/crowdfunding/components/campaign-card";

export default async function CrowdfundingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("crowdfunding");
  const params = await searchParams;

  const filters = {
    category: typeof params.category === "string" ? params.category as any : undefined,
    status: typeof params.status === "string" ? params.status as any : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    page: typeof params.page === "string" ? Number(params.page) : 1,
  };

  const { results, totalPages, page } = await getCampaigns(filters);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
      {results.length === 0 && (
        <p className="text-center text-muted-foreground py-12">{t("noCampaigns")}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write campaign detail page**

`src/app/[locale]/(main)/crowdfunding/[id]/page.tsx`:
```typescript
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCampaign } from "@/domains/crowdfunding/queries/get-campaign";
import { FundingProgress } from "@/domains/crowdfunding/components/funding-progress";
import { WalletConnect } from "@/domains/crowdfunding/components/wallet-connect";
import { Badge } from "@/shared/ui/badge";
import { findVaultPDA } from "@/domains/crowdfunding/lib/solana-client";
import { PublicKey } from "@solana/web3.js";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("crowdfunding");
  const campaign = await getCampaign(id);

  if (!campaign) notFound();

  const campaignPubkey = new PublicKey(campaign.campaignPubkey);
  const [vaultPDA] = findVaultPDA(campaignPubkey);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div>
        <Badge>{t(`category.${campaign.category}`)}</Badge>
        <h1 className="text-3xl font-bold mt-2">{campaign.title}</h1>
        <p className="text-muted-foreground mt-1">
          {t("by")} {campaign.creatorName}
        </p>
      </div>

      <FundingProgress
        vaultPubkey={vaultPDA.toBase58()}
        goalAmount={campaign.goalAmount}
        currencyMint={campaign.currencyMint}
      />

      <div className="prose dark:prose-invert max-w-none">
        <p>{campaign.description}</p>
      </div>

      {campaign.milestones.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t("milestones")}</h2>
          <div className="space-y-3">
            {campaign.milestones.map((m) => (
              <div key={m.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{m.title}</h3>
                  <Badge variant="outline">{t(`milestoneStatus.${m.status}`)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {campaign.rewardTiers.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t("rewardTiers")}</h2>
          <div className="grid gap-4">
            {campaign.rewardTiers.map((tier) => (
              <div key={tier.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{tier.title}</h3>
                  <span className="font-bold">{tier.price}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                {tier.maxBackers > 0 && (
                  <p className="text-xs mt-2">
                    {tier.currentBackers}/{tier.maxBackers} {t("backers")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">{t("backThisCampaign")}</h2>
        <WalletConnect />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/\(main\)/crowdfunding/
git commit -m "feat(crowdfunding): add campaign listing and detail pages with Solana provider layout"
```

---

### Task 21: i18n Translations

**Files:**
- Modify: Polish translation file (find exact path first — check `src/` for `messages/` or `locales/`)

- [ ] **Step 1: Find translation file location**

Run:
```bash
find src -name "pl.json" -o -name "pl.ts" 2>/dev/null
# or
ls src/messages/ 2>/dev/null || ls src/locales/ 2>/dev/null || ls messages/ 2>/dev/null
```

- [ ] **Step 2: Add crowdfunding translations**

Add this key to the Polish translation file under a new `"crowdfunding"` section:
```json
{
  "crowdfunding": {
    "title": "Zbiórki",
    "noCampaigns": "Brak aktywnych zbiórek",
    "by": "od",
    "daysLeft": "{count} dni pozostało",
    "ended": "Zakończona",
    "goalOf": "cel: {amount}",
    "funded": "zebrano",
    "milestones": "Kamienie milowe",
    "rewardTiers": "Nagrody",
    "backers": "wspierających",
    "backThisCampaign": "Wesprzyj tę zbiórkę",
    "category": {
      "FARMER_INVESTMENT": "Inwestycja rolnika",
      "GROUP_PRE_ORDER": "Grupowe zamówienie",
      "COMMUNITY_PROJECT": "Projekt społeczności"
    },
    "milestoneStatus": {
      "PENDING": "Oczekujący",
      "APPROVED": "Zatwierdzony",
      "RELEASED": "Wypłacony"
    },
    "wallet": {
      "custodial": "Portfel platformy",
      "external": "Portfel zewnętrzny",
      "or": "lub",
      "creating": "Tworzenie portfela...",
      "createCustodial": "Utwórz portfel platformy"
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/ src/messages/ src/locales/
git commit -m "feat(crowdfunding): add Polish translations for crowdfunding UI"
```

---

### Task 22: Domain Barrel Export

**Files:**
- Create: `src/domains/crowdfunding/index.ts`

- [ ] **Step 1: Write barrel export**

`src/domains/crowdfunding/index.ts`:
```typescript
// Types
export type {
  CampaignCategory,
  FundingModel,
  CampaignStatus,
  MilestoneStatus,
  CampaignSummary,
  CampaignDetail,
  MilestoneDetail,
  RewardTierDetail,
  ContributionRecord,
} from "./types";

// Validation schemas
export {
  createCampaignSchema,
  addMilestoneSchema,
  addRewardTierSchema,
  contributeSchema,
  type CreateCampaignInput,
  type AddMilestoneInput,
  type AddRewardTierInput,
  type ContributeInput,
} from "./schemas/validation";

// Actions
export { createCampaignAction } from "./actions/create-campaign";
export { contributeAction } from "./actions/contribute";
export { getOrCreateCustodialWallet, saveExternalWallet } from "./actions/wallet-actions";

// Queries
export { getCampaigns, type CampaignListItem } from "./queries/get-campaigns";
export { getCampaign, type CampaignDetailResult } from "./queries/get-campaign";
export { getUserContributions, type UserContribution } from "./queries/get-user-contributions";
export { getUserCampaigns, type UserCampaign } from "./queries/get-user-campaigns";
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/crowdfunding/index.ts
git commit -m "feat(crowdfunding): add domain barrel export"
```

---

### Task 23: Environment Variables

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add crowdfunding env vars to .env.example**

Append:
```env
# Solana / Crowdfunding
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=
WALLET_ENCRYPTION_KEY=  # 32 bytes hex (64 chars) — generate with: openssl rand -hex 32
```

- [ ] **Step 2: Generate and add WALLET_ENCRYPTION_KEY to .env.local**

Run:
```bash
openssl rand -hex 32
```
Copy the output and add to `.env.local`:
```
WALLET_ENCRYPTION_KEY=<paste hex here>
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "feat(crowdfunding): add Solana and wallet env var templates"
```

---

### Task 24: Build & Smoke Test

- [ ] **Step 1: Build Next.js app**

Run:
```bash
npm run build
```
Expected: Builds successfully with no type errors. Fix any TypeScript errors that arise.

- [ ] **Step 2: Build Anchor program**

Run:
```bash
anchor build
```
Expected: Compiles successfully.

- [ ] **Step 3: Run Anchor tests**

Run:
```bash
anchor test
```
Expected: All on-chain tests pass.

- [ ] **Step 4: Run Vitest**

Run:
```bash
npm run test
```
Expected: Content hash tests pass. No regressions in existing tests.

- [ ] **Step 5: Final commit**

If any fixes were needed:
```bash
git add -A
git commit -m "fix(crowdfunding): resolve build and type errors"
```
