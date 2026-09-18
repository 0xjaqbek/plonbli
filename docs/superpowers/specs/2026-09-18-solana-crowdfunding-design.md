# Solana Crowdfunding — Design Spec

> Crowdfunding campaigns on Plonbli, powered by Solana smart contracts (Anchor framework).
> Farmers and group representatives create campaigns; consumers back them with SOL or USDC.

## 1. Purpose

Enable crowdfunding on the Plonbli platform so that:

- **Farmers** can raise funds for equipment, land, greenhouses, or future harvests
- **Groups** (buying groups, communities) can fund shared infrastructure (delivery vans, cold storage, community gardens)
- **Consumers** can pre-order future products collectively (group pre-orders)

All fund movements happen on-chain (Solana) for transparency and trustlessness. Campaign content (text, images) lives off-chain in PostgreSQL for performance and cost.

## 2. Campaign Types

| Type | Creator | Example |
|------|---------|---------|
| Farmer Investment | Farmer | "Help me buy a greenhouse — backers get discounted produce for a year" |
| Group Pre-Order | Group representative | "Pre-order 500kg of organic flour from Farmer X at harvest" |
| Community Project | Group representative | "Fund a shared cold storage unit for our buying group" |

The type is a category label stored off-chain. The on-chain program treats all campaigns identically.

## 3. Architecture Split

### On-chain (Solana program) — handles money

- Campaign escrow vaults (PDA-owned token accounts)
- Contributions, refunds, milestone fund releases
- Funding model enforcement (all-or-nothing vs keep-what-you-raise)
- Fee collection (configurable, currently 0%)
- All fund movements are trustless and verifiable

### Off-chain (PostgreSQL + Next.js) — handles content

- Campaign metadata (title, description, images, category)
- Reward tier descriptions, product links
- Creator profiles, backer lists with display info
- Search, filtering, notifications
- Custodial wallet management (encrypted keypairs)

### Bridge

Each campaign row in PostgreSQL stores the on-chain `campaignPubkey`. The frontend reads both sources — DB for display content, Solana RPC for live funding status (raised amount, backer count, vault balance).

A `contentHash` (SHA-256 of campaign metadata) is stored on-chain so anyone can verify the off-chain content hasn't been tampered with.

The on-chain state is the source of truth for all financial data. If on-chain and off-chain disagree, on-chain wins.

## 4. On-Chain Program Design (Anchor)

### 4.1 Accounts (PDAs)

**PlatformConfig** — singleton, global settings
- Seeds: `["platform_config"]`
- Fields: `admin` (Pubkey), `fee_basis_points` (u16, 0 now), `treasury` (Pubkey, fee destination), `bump` (u8)

**Campaign** — one per crowdfunding campaign
- Seeds: `["campaign", creator_pubkey, campaign_id (u64)]`
- Fields:
  - `creator` (Pubkey)
  - `campaign_id` (u64)
  - `goal_amount` (u64, in token base units)
  - `raised_amount` (u64)
  - `currency_mint` (Pubkey — wrapped SOL mint or USDC mint)
  - `funding_model` (enum: AllOrNothing | KeepWhatYouRaise)
  - `deadline` (i64, unix timestamp)
  - `status` (enum: Setup | Active | Successful | Failed | Finalized)
  - `milestone_count` (u8)
  - `reward_tier_count` (u8)
  - `content_hash` ([u8; 32], SHA-256 of off-chain metadata)
  - `backer_count` (u32)
  - `bump` (u8)

**Milestone** — optional, linked to campaign
- Seeds: `["milestone", campaign_pubkey, milestone_index (u8)]`
- Fields: `campaign` (Pubkey), `milestone_index` (u8), `target_amount` (u64), `description_hash` ([u8; 32]), `status` (enum: Pending | Approved | Released), `approved_by` (Option\<Pubkey\>), `bump` (u8)
- Max 10 milestones per campaign

**RewardTier** — reward tiers per campaign
- Seeds: `["reward_tier", campaign_pubkey, tier_index (u8)]`
- Fields: `campaign` (Pubkey), `tier_index` (u8), `price` (u64), `max_backers` (u32, 0 = unlimited), `current_backers` (u32), `description_hash` ([u8; 32]), `is_product_linked` (bool), `bump` (u8)
- Max 10 tiers per campaign

**Contribution** — one per backer per campaign
- Seeds: `["contribution", campaign_pubkey, backer_pubkey]`
- Fields: `campaign` (Pubkey), `backer` (Pubkey), `amount` (u64), `reward_tier` (Option\<u8\>), `timestamp` (i64), `refunded` (bool), `bump` (u8)

**CampaignVault** — PDA-owned token account holding escrowed funds
- Seeds: `["vault", campaign_pubkey]`
- The program is authority over this account — no one can withdraw without going through instructions

### 4.2 Instructions

| Instruction | Who calls | What it does |
|---|---|---|
| `initialize_platform` | Admin (once) | Creates PlatformConfig singleton |
| `create_campaign` | Farmer / Group rep | Creates Campaign PDA + CampaignVault token account |
| `add_milestone` | Campaign creator | Creates Milestone PDA (only during Setup status) |
| `add_reward_tier` | Campaign creator | Creates RewardTier PDA (only during Setup status) |
| `activate_campaign` | Campaign creator | Sets status from Setup → Active, locks structure |
| `contribute` | Backer | Transfers tokens to vault, creates/updates Contribution PDA |
| `approve_milestone` | Admin | Sets Milestone status to Approved |
| `release_milestone_funds` | Campaign creator | Withdraws approved milestone amount from vault to creator |
| `finalize_campaign` | Anyone (after deadline) | If goal met → Successful; if not + AllOrNothing → Failed (enables refunds); if not + KeepWhatYouRaise → Successful |
| `claim_refund` | Backer | Withdraws contribution from vault (only if AllOrNothing + Failed) |
| `update_platform_config` | Admin | Updates fee_basis_points, treasury |

### 4.3 Key Design Decisions

- **One Contribution PDA per backer per campaign.** Additional contributions accumulate into the same PDA (amount increases).
- **Milestones are optional.** Campaigns without milestones release all funds at once after success via `finalize_campaign`.
- **`activate_campaign` as a separate step.** Creator sets up everything (milestones, tiers), reviews, then activates. No structural changes after activation.
- **`finalize_campaign` is permissionless.** Anyone can trigger it after the deadline passes, preventing creators from stalling.
- **Admin role for milestone approval.** Initially the platform admin. Could later be replaced by a DAO, multisig, or community vote.
- **Fee deducted at withdrawal.** When creator withdraws (finalize or milestone release), `fee_basis_points` is deducted and sent to `treasury`. Currently 0.

### 4.4 Program Location

```
programs/
  plonbli-crowdfunding/
    Cargo.toml
    src/
      lib.rs              # Program entry, declare_id!
      instructions/       # One file per instruction
        mod.rs
        initialize_platform.rs
        create_campaign.rs
        add_milestone.rs
        add_reward_tier.rs
        activate_campaign.rs
        contribute.rs
        approve_milestone.rs
        release_milestone_funds.rs
        finalize_campaign.rs
        claim_refund.rs
        update_platform_config.rs
      state/              # Account structs
        mod.rs
        platform_config.rs
        campaign.rs
        milestone.rs
        reward_tier.rs
        contribution.rs
      errors.rs           # Custom error codes
      events.rs           # On-chain events (for indexing)
Anchor.toml               # Anchor config (cluster, program ID, wallet)
```

Lives at project root, separate from `src/` (Next.js). The generated IDL (`target/idl/plonbli_crowdfunding.json`) is imported by the frontend client.

## 5. Off-Chain Data (PostgreSQL)

### 5.1 New Tables

**`crowdfunding_campaigns`**
- `id` (uuid), `creatorId` → User, `groupId` → Group (nullable)
- `title` (text), `description` (text), `images` (text[]), `category` (enum: FarmerInvestment | GroupPreOrder | CommunityProject)
- `campaignPubkey` (text — Solana address, the bridge to on-chain)
- `currencyMint` (text — SOL or USDC mint address)
- `fundingModel` (enum: AllOrNothing | KeepWhatYouRaise)
- `goalAmount` (text — string to preserve precision)
- `deadline` (timestamp), `status` (enum — mirrors on-chain, cached for fast queries)
- `contentHash` (text — SHA-256 hex)
- `createdAt`, `updatedAt`

**`crowdfunding_milestones`**
- `id` (uuid), `campaignId` → Campaign, `milestoneIndex` (smallint)
- `title` (text), `description` (text), `descriptionHash` (text)
- `targetAmount` (text), `status` (enum: Pending | Approved | Released)

**`crowdfunding_reward_tiers`**
- `id` (uuid), `campaignId` → Campaign, `tierIndex` (smallint)
- `title` (text), `description` (text), `descriptionHash` (text)
- `price` (text), `maxBackers` (integer, 0 = unlimited), `currentBackers` (integer)
- `isProductLinked` (boolean), `productId` → Product (nullable)

**`crowdfunding_contributions`**
- `id` (uuid), `campaignId` → Campaign, `backerId` → User
- `amount` (text), `rewardTierId` → RewardTier (nullable)
- `contributionPubkey` (text — on-chain PDA address)
- `transactionSignature` (text — Solana tx hash)
- `refunded` (boolean), `createdAt`

**`user_wallets`**
- `id` (uuid), `userId` → User
- `publicKey` (text — Solana address)
- `encryptedSecretKey` (text — AES-256-GCM encrypted, nullable for external wallets)
- `isCustodial` (boolean)
- `createdAt`

### 5.2 Sync Strategy

A background job (cron or triggered after transactions) syncs `raised_amount`, `backer_count`, and `status` from Solana RPC into the DB cache. On-chain is always authoritative.

### 5.3 What's NOT in the DB

- Vault balances (read from Solana RPC in real-time)
- Fund movements (verified via on-chain transaction history)
- Any financial authorization — the DB never triggers fund transfers

## 6. Wallet & Custodial System

### 6.1 External Wallet (crypto-native users)

- User connects Phantom, Solflare, or any Solana wallet via `@solana/react-hooks`
- Transactions signed in the browser by the wallet extension
- Platform only stores the `publicKey` in `user_wallets` for display/lookup
- Full self-custody — platform never touches private keys

### 6.2 Custodial Wallet (regular users)

- Platform generates a Solana keypair server-side when user first needs one
- Secret key encrypted with AES-256-GCM using `WALLET_ENCRYPTION_KEY` (env var)
- Stored in `user_wallets.encryptedSecretKey`
- Transactions built on server, signed with decrypted key, submitted to Solana
- User sees SOL/USDC amounts — no wallet popups, no seed phrases
- User can export their wallet (reveal private key) to migrate to self-custody

### 6.3 Funding Custodial Wallets

- Platform shows a "deposit" screen with the wallet address + QR code
- User sends SOL/USDC from an exchange or another wallet
- Balance detected via RPC polling, then available for contributions
- No fiat on-ramp in v1

### 6.4 Security

- Encryption key is server-side env var, never exposed to frontend
- Custodial signing happens only in Server Actions
- Rate limiting on all custodial transaction endpoints
- Audit log: every custodial transaction logged with IP, timestamp, action
- This is the highest-risk component — must be the most heavily tested

### 6.5 Switching Modes

- User with a custodial wallet can connect an external wallet at any time
- Contributions remain valid on-chain regardless of which wallet was used
- New contributions go through whichever wallet is currently active

## 7. Frontend

### 7.1 Domain Structure

```
src/domains/crowdfunding/
  types.ts                     # Campaign, Milestone, RewardTier, Contribution types + Zod schemas
  actions/
    create-campaign.ts         # Server Action: create campaign on-chain + DB
    contribute.ts              # Server Action: back a campaign
    finalize-campaign.ts       # Server Action: trigger finalization
    claim-refund.ts            # Server Action: claim refund
    manage-milestones.ts       # Server Action: add milestones, approve, release
    manage-rewards.ts          # Server Action: add reward tiers
    sync-campaign.ts           # Server Action: sync on-chain state to DB
  queries/
    get-campaigns.ts           # List/filter/search campaigns
    get-campaign.ts            # Single campaign with milestones, tiers, contributions
    get-user-contributions.ts  # Campaigns backed by user
    get-user-campaigns.ts      # Campaigns created by user
  components/
    campaign-card.tsx           # Card for listing view
    campaign-detail.tsx         # Full campaign page content
    campaign-form.tsx           # Create/setup campaign wizard
    milestone-list.tsx          # Milestone progress display
    reward-tier-list.tsx        # Reward tiers with "back this" buttons
    contribution-form.tsx       # Backing flow (amount, tier selection, wallet)
    funding-progress.tsx        # Progress bar + live stats from Solana RPC
    wallet-connect.tsx          # Connect external wallet or show custodial info
    campaign-dashboard.tsx      # Creator's management view
  hooks/
    use-campaign-balance.ts    # Real-time vault balance via Solana RPC
    use-wallet.ts              # Wallet state (connected/custodial/none)
  lib/
    solana-client.ts           # Anchor client setup, program interaction helpers
    content-hash.ts            # SHA-256 hashing for content verification
    wallet-encryption.ts       # Server-side custodial key encrypt/decrypt
```

### 7.2 Routes

| Route | Purpose |
|---|---|
| `(main)/crowdfunding/page.tsx` | Campaign listing — browse, search, filter by category/status/location |
| `(main)/crowdfunding/[id]/page.tsx` | Campaign detail — description, milestones, tiers, contribute button, live funding stats |
| `(main)/crowdfunding/create/page.tsx` | Campaign creation wizard (details → milestones → reward tiers → review → activate) |
| `(main)/crowdfunding/dashboard/page.tsx` | Creator dashboard — my campaigns, status, milestone management |
| `(main)/profile/contributions/page.tsx` | User's backed campaigns and contribution history |
| `(main)/profile/wallet/page.tsx` | Wallet management — connect external, view custodial, deposit, export |

### 7.3 Solana Provider

A `SolanaProvider` wrapper (client component) that:
- Initializes `@solana/react-hooks` with cluster config (devnet initially, mainnet later)
- Auto-discovers wallets (Phantom, Solflare)
- Makes wallet state available to all crowdfunding components
- Dynamically imported only on crowdfunding routes to avoid bloating other pages

## 8. Integration with Existing Domains

### Marketplace

- Product-linked reward tiers reference existing `Product` records
- "Back 200 PLN, get 10kg honey at harvest" — tier links to a product
- Campaign cards can appear on farmer profile pages alongside listings

### Social

- Campaign creation auto-posts to creator's feed
- Milestone achievements and campaign success/failure → feed updates
- Users can share campaigns as social posts

### Reputation

- Campaign completion history could contribute to farmer reputation (future, not v1)
- Successful campaigns = trust signal

### Auth

- Wallet association stored per user in `user_wallets`
- Only farmers and group admins can create campaigns (enforced in Server Actions via session role check)

### Notifications

- Backer: campaign funded, milestone completed, refund available
- Creator: new contribution, milestone approved, deadline approaching

### Cross-domain rules

- Crowdfunding imports from `shared/` and reads from other domains via their public APIs (barrel exports)
- Other domains never import from crowdfunding
- Social/notification integration via Server Actions calling respective domain functions — no tight coupling

## 9. Currencies

- **SOL** — via wrapped SOL (native SOL wrapped into SPL token for uniform handling)
- **USDC** — Solana USDC mint (devnet: known test mint; mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- Creator chooses currency when creating a campaign
- All on-chain amounts in token base units (lamports for SOL, 6 decimals for USDC)
- Frontend displays human-readable amounts with proper decimal formatting

## 10. Fee Architecture

- `PlatformConfig.fee_basis_points` — currently 0 (free platform)
- Deducted when creator withdraws funds (finalize or milestone release)
- Fee sent to `PlatformConfig.treasury` address
- Admin can update via `update_platform_config` instruction
- 100 basis points = 1%. Max reasonable range: 0-1000 (0-10%)

## 11. Out of Scope (v1)

- Fiat on-ramp (card/bank → SOL/USDC conversion)
- DAO/multisig for milestone approval (admin-only for now)
- Campaign reputation impact on farmer score
- On-chain governance or voting
- Token economics / custom SPL token
- Secondary market for reward tiers
- Campaign updates/comments on-chain (these stay in PostgreSQL via social domain)
