# Solana Crowdfunding Program — Technical Documentation

**Program ID:** `63fEfSpaubSMFFvGVo5ALKye38XACxTCwBtL1rR1beRX`
**Framework:** Anchor 0.29.0
**Configured cluster:** Devnet by default (configurable via `NEXT_PUBLIC_SOLANA_RPC_URL`)
**Deployment status:** devnet target configured; deployment must be verified on-chain before it is described as live

---

## Overview

The `plonbli_crowdfunding` Solana program implements crowdfunding with on-chain escrow, platform-verified milestone-gated fund release, reward tiers, platform fees, and refunds. Financial state changes require wallet-signed Solana transactions; PostgreSQL is a searchable application cache and never substitutes a database-only contribution, refund, activation, finalization, approval, or release.

This is deliberately described as **platform-verified milestone escrow**, not fully trustless governance. A single configured platform admin approves milestones on-chain. The program still enforces custody, authorization, release order, fee calculation, and refund rules independently of the web database.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Next.js Frontend (src/domains/crowdfunding/)       │
│                                                      │
│  ┌─────────────┐  ┌──────────────────────────────┐  │
│  │ Server      │  │ Client Components             │  │
│  │ Actions     │  │  - CampaignManagement         │  │
│  │  - create   │  │  - ContributeDialog           │  │
│  │  - activate │  │  - WalletButton               │  │
│  │  - contribute│ │                               │  │
│  │  - milestone│  │  Hooks:                       │  │
│  │  - reward   │  │  - useCreateCampaignOnChain   │  │
│  └──────┬──────┘  │  - useContributeOnChain       │  │
│         │         └──────────┬───────────────────┘  │
│         │                    │                       │
│    Drizzle/Neon         Anchor RPC                   │
│    (off-chain DB)       (on-chain tx)                │
└─────────┬───────────────────┬───────────────────────┘
          │                   │
     ┌────▼────┐        ┌────▼──────────────┐
     │ Neon DB │        │ Solana Blockchain  │
     │ (PostgreSQL)│    │ (Program Accounts) │
     └─────────┘        └───────────────────┘
```

The off-chain database stores rich metadata (titles, descriptions, images) while the on-chain program stores financial state (amounts, statuses, hashes). A SHA-256 `contentHash` bridges both: the hash of off-chain content is stored on-chain to prove integrity.

## End-to-end trust flow

1. A farmer drafts a campaign, milestones, and reward tiers in PostgreSQL.
2. Activation creates the Campaign PDA, vault, every Milestone PDA, and every RewardTier PDA, then activates the campaign. Each step is retry-safe: a retry reads and validates existing deterministic PDAs, skips matching accounts, creates only missing sequential accounts, and activates only while the campaign remains in Setup. The server derives the expected addresses and verifies account contents before marking the database campaign active; recovered steps may have no new transaction signature.
3. A backer contributes SPL tokens (including wrapped native SOL) to the campaign vault. Amounts use the mint's real decimal precision. The selected reward tier and cumulative contribution are stored in the wallet-specific Contribution PDA.
4. After the deadline, any wallet can finalize the campaign. The server reads the resulting on-chain status instead of calculating a separate database result.
5. The platform admin approves milestones on-chain. The campaign creator then releases each approved tranche from escrow. Milestone zero is released first; every later release must include the immediately preceding Milestone PDA and the program verifies that it is already Released. Only after this sequential proof can the final milestone drain the remaining vault balance, so the final tranche cannot bypass earlier milestones.
6. Backers of a failed all-or-nothing campaign claim refunds from the program. The database records a refund only after the Contribution PDA says it is refunded.

Every client transaction is simulated before the wallet signs it. Every server reconciliation verifies that the transaction invoked this program and referenced the expected campaign, milestone, or contribution account. Contribution confirmation also verifies that the expected backer wallet was one of the transaction's required signers, that the deterministic Contribution PDA is owned by this program, and that its decoded campaign/backer fields match.

## Network and currency configuration

The selected Solana cluster and accepted currency mints are coupled. Devnet uses the devnet USDC mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`; mainnet-beta uses `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. Wrapped SOL uses `So11111111111111111111111111111111111111112` on both clusters. `NEXT_PUBLIC_USDC_MINT_ADDRESS` may override the default for a controlled deployment, and campaign validation rejects other mints.

## Production provenance

Campaigns can link to farming timeline entries. A version 2 entry hash commits to the farmer, campaign, product, entry type, note, structured production data, timestamp, previous entry hash, image URLs, and SHA-256 hashes of the uploaded image bytes. This makes edits, deletions, reordering, and replacement of image content detectable.

After creating an entry, the farmer signs a Solana Memo transaction containing the entry ID, content hash, and campaign address. The server confirms the signer and exact memo before storing the anchor signature. The UI verifies the complete farmer chain and displays valid, tampered, legacy, or awaiting-anchor states. Corrections are appended as new entries; historical entries are not edited in place. Customer comments have a direct foreign-key relationship to the production entry they discuss.

This mechanism proves integrity and authorship of the recorded history. It does not independently prove that a farmer's original statement or photograph was truthful.

## Verified ratings

New ratings require evidence of either a completed marketplace order with the farmer or a non-refunded contribution to one of the farmer's successful campaigns. Each order or contribution can support one rating. Rating hashes form a versioned append-only chain that includes the score, dimensions, comment, target, evidence, timestamp, and previous hash. Older ratings remain visible as legacy unverified records but do not contribute to verified reputation aggregates.

---

## On-Chain Accounts

### PlatformConfig

Global singleton holding platform-wide settings.

| Field              | Type    | Description                              |
|--------------------|---------|------------------------------------------|
| `admin`            | Pubkey  | Platform administrator (can update config) |
| `fee_basis_points` | u16     | Platform fee (e.g., 250 = 2.5%, max 1000 = 10%) |
| `treasury`         | Pubkey  | Receives platform fees from fund releases |
| `bump`             | u8      | PDA bump seed                            |

**PDA:** `["platform_config"]`

### Campaign

Core campaign account holding all financial state.

| Field               | Type           | Description                              |
|---------------------|----------------|------------------------------------------|
| `creator`           | Pubkey         | Campaign creator's wallet                |
| `campaign_id`       | u64            | Unique numeric identifier                |
| `goal_amount`       | u64            | Funding goal (in token smallest units)   |
| `raised_amount`     | u64            | Total contributions received             |
| `currency_mint`     | Pubkey         | SPL token mint (e.g., USDC, wSOL)       |
| `funding_model`     | FundingModel   | `AllOrNothing` (0) or `KeepWhatYouRaise` (1) |
| `deadline`          | i64            | Unix timestamp when campaign ends        |
| `status`            | CampaignStatus | Current lifecycle stage                  |
| `milestone_count`   | u8             | Number of milestones added               |
| `reward_tier_count` | u8             | Number of reward tiers added             |
| `content_hash`      | [u8; 32]       | SHA-256 of off-chain campaign content    |
| `backer_count`      | u32            | Number of unique backers                 |
| `bump`              | u8             | PDA bump seed                            |

**PDA:** `["campaign", creator_pubkey, campaign_id.to_le_bytes()]`

### Vault (Token Account)

SPL token account that holds all contributed funds. Owned by the Campaign PDA (authority via seeds).

**PDA:** `["vault", campaign_pubkey]`

### Milestone

Tracks fund release stages for a campaign (max 10 per campaign).

| Field              | Type            | Description                              |
|--------------------|-----------------|------------------------------------------|
| `campaign`         | Pubkey          | Parent campaign account                  |
| `milestone_index`  | u8              | Sequential index (0-9)                   |
| `target_amount`    | u64             | Amount released when this milestone completes |
| `description_hash` | [u8; 32]        | SHA-256 of off-chain description         |
| `status`           | MilestoneStatus | `Pending` → `Approved` → `Released`     |
| `approved_by`      | Option\<Pubkey\>| Who approved (platform admin)            |
| `bump`             | u8              | PDA bump seed                            |

**PDA:** `["milestone", campaign_pubkey, milestone_index]`

### RewardTier

Defines backer reward levels (max 10 per campaign).

| Field              | Type     | Description                              |
|--------------------|----------|------------------------------------------|
| `campaign`         | Pubkey   | Parent campaign account                  |
| `tier_index`       | u8       | Sequential index (0-9)                   |
| `price`            | u64      | Minimum contribution for this tier       |
| `max_backers`      | u32      | Capacity limit (0 = unlimited)           |
| `current_backers`  | u32      | Number of backers who selected this tier |
| `description_hash` | [u8; 32] | SHA-256 of off-chain description         |
| `is_product_linked`| bool     | Whether reward includes a marketplace product |
| `bump`             | u8       | PDA bump seed                            |

**PDA:** `["reward_tier", campaign_pubkey, tier_index]`

### Contribution

Tracks individual backer contributions. Uses `init_if_needed` so repeated contributions from the same backer accumulate into a single account.

| Field         | Type         | Description                              |
|---------------|--------------|------------------------------------------|
| `campaign`    | Pubkey       | Campaign being backed                    |
| `backer`      | Pubkey       | Backer's wallet                          |
| `amount`      | u64          | Total contributed amount                 |
| `reward_tier` | Option\<u8\> | Selected reward tier index (if any)      |
| `timestamp`   | i64          | Last contribution timestamp              |
| `refunded`    | bool         | Whether refund has been claimed          |
| `bump`        | u8           | PDA bump seed                            |

**PDA:** `["contribution", campaign_pubkey, backer_pubkey]`

---

## Campaign Lifecycle

```
    ┌───────┐     activate      ┌────────┐
    │ SETUP │ ─────────────────►│ ACTIVE │
    └───────┘  (requires ≥1     └───┬────┘
               milestone,           │
               deadline in          │ deadline passes
               future)              │
                                    ▼
                        ┌───────────────────────┐
                        │   finalize_campaign    │
                        │                        │
                  ┌─────┴──────┐         ┌──────┴──────┐
                  │ SUCCESSFUL │         │   FAILED    │
                  │            │         │ (AllOrNothing│
                  │ funds      │         │  only)      │
                  │ released   │         │             │
                  │ via        │         │ backers can │
                  │ milestones │         │ claim_refund│
                  └─────┬──────┘         └──────┬──────┘
                        │                       │
                        ▼                       ▼
                   ┌──────────┐          ┌──────────┐
                   │FINALIZED │          │FINALIZED │
                   └──────────┘          └──────────┘
```

### Status Transitions

| From       | To         | Instruction            | Conditions                                    |
|------------|------------|------------------------|-----------------------------------------------|
| Setup      | Active     | `activate_campaign`    | Creator signs; ≥1 milestone; deadline > now   |
| Active     | Successful | `finalize_campaign`    | Deadline passed; goal met OR KeepWhatYouRaise |
| Active     | Failed     | `finalize_campaign`    | Deadline passed; AllOrNothing; goal not met   |
| Successful | Finalized  | (after all milestones released)                        |
| Failed     | —          | Backers call `claim_refund`                            |

---

## Instructions (11 total)

### 1. `initialize_platform(fee_basis_points: u16)`

Creates the global PlatformConfig. Called once by the platform admin.

- Sets `admin` to signer
- Sets `treasury` to signer's wallet
- `fee_basis_points` max 1000 (10%)

### 2. `create_campaign(campaign_id, goal_amount, deadline, funding_model, content_hash)`

Creates a new campaign in Setup status.

- `goal_amount` must be > 0
- `deadline` must be in the future
- `funding_model`: 0 = AllOrNothing, 1 = KeepWhatYouRaise
- `content_hash`: SHA-256 of off-chain campaign data
- Creates associated token vault for the campaign's currency mint
- **Emits:** `CampaignCreated`

### 3. `add_milestone(milestone_index, target_amount, description_hash)`

Adds a milestone to a Setup campaign.

- Only creator can add
- `milestone_index` must match `campaign.milestone_count` (sequential)
- Max 10 milestones per campaign
- Validates that total milestone targets don't exceed goal
- Increments `campaign.milestone_count`

### 4. `add_reward_tier(tier_index, price, max_backers, description_hash, is_product_linked)`

Adds a reward tier to a Setup campaign.

- Only creator can add
- `tier_index` must match `campaign.reward_tier_count` (sequential)
- Max 10 tiers per campaign
- `max_backers` = 0 means unlimited
- Increments `campaign.reward_tier_count`

### 5. `activate_campaign()`

Transitions campaign from Setup to Active.

- Only creator can activate
- Requires `milestone_count >= 1`
- Requires `deadline > Clock::get().unix_timestamp`
- **Emits:** `CampaignActivated`

### 6. `contribute(amount, reward_tier: Option<u8>)`

Processes a contribution to an Active campaign.

- `amount` must be > 0
- Campaign must be Active and before deadline
- If `reward_tier` specified: validates tier exists, not full, and amount >= tier price
- Transfers SPL tokens from backer's token account to campaign vault
- Uses `init_if_needed` — first contribution creates the Contribution account, subsequent ones accumulate
- Increments `backer_count` on first contribution
- Updates `raised_amount` on campaign
- **Emits:** `ContributionMade`

### 7. `approve_milestone()`

Platform admin approves a milestone for fund release.

- Only platform admin can approve
- Milestone must be in Pending status
- Sets `status = Approved`, records `approved_by`
- **Emits:** `MilestoneApproved`

### 8. `release_milestone_funds()`

Releases funds for an approved milestone to the campaign creator.

- Campaign must be Successful
- Milestone must be Approved
- Milestone zero requires no predecessor; every later milestone requires the immediately preceding Milestone PDA in Released status
- Calculates platform fee: `amount * fee_basis_points / 10000`
- Transfers fee to treasury, remainder to creator
- Uses PDA-signed CPI transfers (campaign account is vault authority)
- Sets milestone to Released
- **Emits:** `MilestoneFundsReleased`

### 9. `finalize_campaign()`

Evaluates campaign outcome after deadline.

- Campaign must be Active and deadline must have passed
- **AllOrNothing:** if `raised_amount >= goal_amount` → Successful, else → Failed
- **KeepWhatYouRaise:** always → Successful (even if goal not met)
- **Emits:** `CampaignFinalized`

### 10. `claim_refund()`

Allows backers to reclaim funds from a Failed campaign.

- Campaign status must be Failed (only possible with AllOrNothing)
- Contribution must not already be refunded
- Transfers full contribution amount from vault back to backer
- Uses PDA-signed CPI transfer
- Sets `contribution.refunded = true`
- **Emits:** `RefundClaimed`

### 11. `update_platform_config(fee_basis_points: Option<u16>, new_treasury: Option<Pubkey>)`

Admin updates platform settings.

- Only current admin can call
- Can update fee (max 1000) and/or treasury address

---

## Fee Mechanism

Platform fees are collected during milestone fund releases, not during contributions:

```
release_milestone_funds:
  fee = target_amount * fee_basis_points / 10_000
  creator_receives = target_amount - fee

  vault ──► treasury (fee)
  vault ──► creator  (target_amount - fee)
```

All arithmetic uses checked operations to prevent overflow.

---

## PDA Seeds Summary

| Account        | Seeds                                          |
|----------------|------------------------------------------------|
| PlatformConfig | `["platform_config"]`                          |
| Campaign       | `["campaign", creator, campaign_id.to_le_bytes()]` |
| Vault          | `["vault", campaign]`                          |
| Milestone      | `["milestone", campaign, [milestone_index]]`   |
| RewardTier     | `["reward_tier", campaign, [tier_index]]`      |
| Contribution   | `["contribution", campaign, backer]`           |

---

## On-Chain Events

| Event                   | Emitted By               | Key Data                          |
|-------------------------|--------------------------|-----------------------------------|
| `CampaignCreated`       | `create_campaign`        | campaign, creator, goal, deadline |
| `CampaignActivated`     | `activate_campaign`      | campaign                          |
| `ContributionMade`      | `contribute`             | campaign, backer, amount, total   |
| `MilestoneApproved`     | `approve_milestone`      | campaign, index, approved_by      |
| `MilestoneFundsReleased`| `release_milestone_funds`| campaign, index, amount           |
| `CampaignFinalized`     | `finalize_campaign`      | campaign, status, total_raised    |
| `RefundClaimed`         | `claim_refund`           | campaign, backer, amount          |

---

## Error Codes (28 variants)

| Error                       | When                                          |
|-----------------------------|-----------------------------------------------|
| `Unauthorized`              | Signer is not expected authority               |
| `InvalidFundingModel`       | Funding model value not 0 or 1                |
| `CampaignNotInSetup`        | Modifying a non-Setup campaign                |
| `CampaignNotActive`         | Contributing to inactive campaign             |
| `CampaignNotExpired`        | Finalizing before deadline                    |
| `CampaignExpired`           | Contributing after deadline                   |
| `MaxMilestonesReached`      | More than 10 milestones                       |
| `MaxRewardTiersReached`     | More than 10 reward tiers                     |
| `InvalidMilestoneIndex`     | Index doesn't match next expected             |
| `InvalidRewardTierIndex`    | Index doesn't match next expected             |
| `ZeroContribution`          | Contributing 0 tokens                         |
| `RewardTierFull`            | Tier at max_backers capacity                  |
| `InsufficientForRewardTier` | Amount < tier price                           |
| `MilestoneNotPending`       | Approving non-pending milestone               |
| `MilestoneNotApproved`      | Releasing non-approved milestone              |
| `PreviousMilestoneNotReleased` | Releasing a later milestone before its predecessor |
| `RefundNotAvailable`        | Refunding from non-Failed campaign            |
| `AlreadyRefunded`           | Double-claiming refund                        |
| `CannotFinalize`            | Finalizing non-Active campaign                |
| `GoalNotReached`            | AllOrNothing goal not met (for success path)  |
| `Overflow`                  | Arithmetic overflow in fee/amount calculation |
| `DeadlineInPast`            | Creating campaign with past deadline          |
| `ZeroGoalAmount`            | Goal amount is zero                           |
| `FeeTooHigh`                | Fee > 1000 basis points                       |
| `MilestoneAmountsExceedGoal`| Milestone targets sum exceeds goal            |

---

## Frontend Integration

### Wallet Connection

The `SolanaWalletProvider` wraps all `/crowdfunding` routes, providing wallet context via `@solana/wallet-adapter-react`. Supported wallets: Phantom.

### Hooks

**`useCreateCampaignOnChain`** builds the complete activation sequence:
- Derives deterministic campaign, vault, milestone, and reward-tier PDAs
- Reads and validates any accounts left by an interrupted earlier attempt
- Creates only missing sequential accounts and simulates every new instruction
- Returns nullable per-step signatures plus all canonical account addresses for reconciliation

**`useContributeOnChain`** builds and simulates the contribution transaction:
- Creates the backer's associated token account when needed
- Wraps native SOL atomically when SOL is selected
- Returns the signature and deterministic Contribution PDA

### On-chain-required financial flow

Campaign activation, contribution, finalization, milestone approval/release, and refunds require the corresponding Solana account and wallet transaction. The application does not provide a database-only fallback for those financial state changes. Database rows are drafts, searchable metadata, and reconciled cache records; Solana accounts are authoritative for escrow and lifecycle state.

### Content Hash Bridge

Off-chain content (titles, descriptions) is hashed with SHA-256 and stored on-chain as `content_hash` / `description_hash`. This allows anyone to verify that the on-chain campaign matches its off-chain metadata.

```typescript
// src/domains/crowdfunding/lib/content-hash.ts
const hash = await crypto.subtle.digest("SHA-256", data.buffer);
```

---

## Testing

Integration tests are in `tests/plonbli-crowdfunding.ts` using `anchor-bankrun` and `ts-mocha`. Run with:

```bash
npx ts-mocha -p ./tsconfig.anchor.json -t 1000000 tests/**/*.ts
```

Tests cover: platform initialization, campaign creation, milestones, reward tiers, activation, contributions, finalization (both funding models), milestone approval/release, refunds, and all error conditions.

---

## Worktree Summary

**Branch:** `feature/solana-crowdfunding`
**Base:** `main`
**80 files changed** (+40,612 / -8,135 lines)

### What was built

| Area | Files | Description |
|------|-------|-------------|
| **Anchor program** | `programs/plonbli-crowdfunding/src/` | 11-instruction Solana program with full crowdfunding lifecycle |
| **Integration tests** | `tests/plonbli-crowdfunding.ts` | 1150-line test suite covering all instructions and error paths |
| **DB schema** | `src/shared/db/schema/crowdfunding-*.ts` | 4 Drizzle tables (campaigns, milestones, reward_tiers, contributions) + user_wallets |
| **Server actions** | `src/domains/crowdfunding/actions/` | 7 actions: create, activate, contribute, add/delete milestone, add/delete reward tier |
| **UI components** | `src/domains/crowdfunding/components/` | 9 components: card, detail, management, forms, dialogs, wallet |
| **On-chain hooks** | `src/domains/crowdfunding/hooks/` | 2 hooks: useCreateCampaignOnChain, useContributeOnChain |
| **Solana utilities** | `src/domains/crowdfunding/lib/` | PDA derivation, program setup, content hashing, constants, IDL |
| **Queries** | `src/domains/crowdfunding/queries/` | Campaign listing/detail, milestones, reward tiers |
| **Pages** | `src/app/[locale]/(main)/crowdfunding/` | Listing, detail, create pages + SolanaWalletProvider layout |
| **Notifications** | `src/domains/notifications/` | Crowdfunding notification types + preference toggle |
| **Navigation** | `src/shared/ui/nav-bar.tsx` | Crowdfunding link in bottom nav (Rocket icon) |
| **i18n** | `messages/pl.json` | ~95 Polish translation keys for all crowdfunding UI |
| **Design docs** | `docs/superpowers/` | Design spec + implementation plan |

### Commits (oldest → newest)

1. `ee24e11` — Design spec
2. `1661c59` — Implementation plan
3. `bbedb2b` — Anchor program (Rust)
4. `fc50ed3` — Integration tests
5. `9374795` — Drizzle DB schema
6. `b7913a3` — Domain types, Zod schemas, Solana utilities
7. `f403f53` — Frontend pages, components, wallet integration
8. `b0cde54` — Campaign management, milestones, reward tiers, contribution flow
9. `df709b8` — Navigation link + notification support
10. `dce7370` — Solana wallet integration + on-chain transactions
