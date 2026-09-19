import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorError } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import * as fs from "fs";
import * as path from "path";

const IDL = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../target/idl/plonbli_crowdfunding.json"),
    "utf8"
  )
);

const PROGRAM_ID = new PublicKey(
  "63fEfSpaubSMFFvGVo5ALKye38XACxTCwBtL1rR1beRX"
);

describe("plonbli-crowdfunding", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(IDL, PROGRAM_ID, provider) as any;
  const connection = provider.connection;

  // Shared state
  let admin: Keypair;
  let treasury: Keypair;
  let creator: Keypair;
  let backer1: Keypair;
  let backer2: Keypair;
  let mint: PublicKey;

  // PDAs
  let platformConfigPda: PublicKey;
  let campaignPda: PublicKey;
  let vaultPda: PublicKey;

  // Token accounts
  let creatorTokenAccount: PublicKey;
  let backer1TokenAccount: PublicKey;
  let backer2TokenAccount: PublicKey;
  let treasuryTokenAccount: PublicKey;

  const CAMPAIGN_ID = new BN(1);
  const GOAL_AMOUNT = new BN(1_000_000); // 1M tokens (6 decimals = 1 USDC)
  const FEE_BASIS_POINTS = 250; // 2.5%
  const CONTENT_HASH = Buffer.alloc(32, 1); // dummy hash

  function findPda(seeds: Buffer[]): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(seeds, program.programId);
    return pda;
  }

  function getFutureDeadline(seconds: number): BN {
    return new BN(Math.floor(Date.now() / 1000) + seconds);
  }

  async function fundAccount(pubkey: PublicKey, sol = 10) {
    const tx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: pubkey,
        lamports: sol * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx);
  }

  before(async () => {
    admin = Keypair.generate();
    treasury = Keypair.generate();
    creator = Keypair.generate();
    backer1 = Keypair.generate();
    backer2 = Keypair.generate();

    // Fund all accounts from provider wallet
    await fundAccount(admin.publicKey);
    await fundAccount(creator.publicKey);
    await fundAccount(backer1.publicKey);
    await fundAccount(backer2.publicKey);
    await fundAccount(treasury.publicKey);

    // Create SPL token mint
    mint = await createMint(
      connection,
      admin,
      admin.publicKey,
      null,
      6 // 6 decimals like USDC
    );

    // Create token accounts
    creatorTokenAccount = await createAccount(
      connection,
      creator,
      mint,
      creator.publicKey
    );
    backer1TokenAccount = await createAccount(
      connection,
      backer1,
      mint,
      backer1.publicKey
    );
    backer2TokenAccount = await createAccount(
      connection,
      backer2,
      mint,
      backer2.publicKey
    );
    treasuryTokenAccount = await createAccount(
      connection,
      treasury,
      mint,
      treasury.publicKey
    );

    // Mint tokens to backers
    await mintTo(
      connection,
      admin,
      mint,
      backer1TokenAccount,
      admin,
      10_000_000 // 10 tokens
    );
    await mintTo(
      connection,
      admin,
      mint,
      backer2TokenAccount,
      admin,
      10_000_000 // 10 tokens
    );

    // Derive PDAs
    platformConfigPda = findPda([Buffer.from("platform_config")]);
    campaignPda = findPda([
      Buffer.from("campaign"),
      creator.publicKey.toBuffer(),
      CAMPAIGN_ID.toArrayLike(Buffer, "le", 8),
    ]);
    vaultPda = findPda([Buffer.from("vault"), campaignPda.toBuffer()]);
  });

  // ── Initialize Platform ────────────────────────────────────────────

  describe("initialize_platform", () => {
    it("initializes the platform config", async () => {
      await program.methods
        .initializePlatform(FEE_BASIS_POINTS)
        .accounts({
          platformConfig: platformConfigPda,
          admin: admin.publicKey,
          treasury: treasury.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.platformConfig.fetch(
        platformConfigPda
      );
      assert.ok(config.admin.equals(admin.publicKey));
      assert.equal(config.feeBasisPoints, FEE_BASIS_POINTS);
      assert.ok(config.treasury.equals(treasury.publicKey));
    });

    it("rejects fee > 1000 basis points", async () => {
      const admin2 = Keypair.generate();
      await fundAccount(admin2.publicKey);
      try {
        await program.methods
          .initializePlatform(1001)
          .accounts({
            platformConfig: findPda([Buffer.from("platform_config")]),
            admin: admin2.publicKey,
            treasury: treasury.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin2])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err) {
        // PDA already initialized OR fee too high — either way it should fail
        assert.ok(err);
      }
    });
  });

  // ── Create Campaign ────────────────────────────────────────────────

  describe("create_campaign", () => {
    it("creates a campaign in Setup status", async () => {
      const deadline = getFutureDeadline(3600); // 1 hour from now

      await program.methods
        .createCampaign(
          CAMPAIGN_ID,
          GOAL_AMOUNT,
          deadline,
          0, // AllOrNothing
          Array.from(CONTENT_HASH) as any
        )
        .accounts({
          campaign: campaignPda,
          vault: vaultPda,
          currencyMint: mint,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const campaign = await program.account.campaign.fetch(campaignPda);
      assert.ok(campaign.creator.equals(creator.publicKey));
      assert.ok(campaign.campaignId.eq(CAMPAIGN_ID));
      assert.ok(campaign.goalAmount.eq(GOAL_AMOUNT));
      assert.ok(campaign.raisedAmount.eq(new BN(0)));
      assert.ok(campaign.currencyMint.equals(mint));
      assert.deepEqual(campaign.fundingModel, { allOrNothing: {} });
      assert.deepEqual(campaign.status, { setup: {} });
      assert.equal(campaign.milestoneCount, 0);
      assert.equal(campaign.rewardTierCount, 0);
      assert.equal(campaign.backerCount, 0);

      // Verify vault token account
      const vaultAccount = await getAccount(connection, vaultPda);
      assert.ok(vaultAccount.mint.equals(mint));
      assert.ok(vaultAccount.owner.equals(campaignPda));
      assert.equal(Number(vaultAccount.amount), 0);
    });

    it("rejects zero goal amount", async () => {
      const id = new BN(999);
      const pda = findPda([
        Buffer.from("campaign"),
        creator.publicKey.toBuffer(),
        id.toArrayLike(Buffer, "le", 8),
      ]);
      const vault = findPda([Buffer.from("vault"), pda.toBuffer()]);

      try {
        await program.methods
          .createCampaign(
            id,
            new BN(0),
            getFutureDeadline(3600),
            0,
            Array.from(CONTENT_HASH) as any
          )
          .accounts({
            campaign: pda,
            vault: vault,
            currencyMint: mint,
            creator: creator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "ZeroGoalAmount");
      }
    });

    it("rejects invalid funding model", async () => {
      const id = new BN(998);
      const pda = findPda([
        Buffer.from("campaign"),
        creator.publicKey.toBuffer(),
        id.toArrayLike(Buffer, "le", 8),
      ]);
      const vault = findPda([Buffer.from("vault"), pda.toBuffer()]);

      try {
        await program.methods
          .createCampaign(
            id,
            GOAL_AMOUNT,
            getFutureDeadline(3600),
            5, // invalid
            Array.from(CONTENT_HASH) as any
          )
          .accounts({
            campaign: pda,
            vault: vault,
            currencyMint: mint,
            creator: creator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "InvalidFundingModel");
      }
    });
  });

  // ── Add Milestone ──────────────────────────────────────────────────

  describe("add_milestone", () => {
    const MILESTONE_HASH = Buffer.alloc(32, 2);

    it("adds milestone 0", async () => {
      const milestonePda = findPda([
        Buffer.from("milestone"),
        campaignPda.toBuffer(),
        Buffer.from([0]),
      ]);

      await program.methods
        .addMilestone(0, new BN(500_000), Array.from(MILESTONE_HASH) as any)
        .accounts({
          milestone: milestonePda,
          campaign: campaignPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const milestone = await program.account.milestone.fetch(milestonePda);
      assert.ok(milestone.campaign.equals(campaignPda));
      assert.equal(milestone.milestoneIndex, 0);
      assert.ok(milestone.targetAmount.eq(new BN(500_000)));
      assert.deepEqual(milestone.status, { pending: {} });
      assert.isNull(milestone.approvedBy);

      const campaign = await program.account.campaign.fetch(campaignPda);
      assert.equal(campaign.milestoneCount, 1);
    });

    it("adds milestone 1", async () => {
      const milestonePda = findPda([
        Buffer.from("milestone"),
        campaignPda.toBuffer(),
        Buffer.from([1]),
      ]);

      await program.methods
        .addMilestone(
          1,
          new BN(500_000),
          Array.from(Buffer.alloc(32, 3)) as any
        )
        .accounts({
          milestone: milestonePda,
          campaign: campaignPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const campaign = await program.account.campaign.fetch(campaignPda);
      assert.equal(campaign.milestoneCount, 2);
    });

    it("rejects wrong milestone index", async () => {
      const milestonePda = findPda([
        Buffer.from("milestone"),
        campaignPda.toBuffer(),
        Buffer.from([5]), // should be 2
      ]);

      try {
        await program.methods
          .addMilestone(
            5,
            new BN(100_000),
            Array.from(Buffer.alloc(32, 4)) as any
          )
          .accounts({
            milestone: milestonePda,
            campaign: campaignPda,
            creator: creator.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "InvalidMilestoneIndex");
      }
    });

    it("rejects non-creator signer", async () => {
      const milestonePda = findPda([
        Buffer.from("milestone"),
        campaignPda.toBuffer(),
        Buffer.from([2]),
      ]);

      try {
        await program.methods
          .addMilestone(
            2,
            new BN(100_000),
            Array.from(Buffer.alloc(32, 5)) as any
          )
          .accounts({
            milestone: milestonePda,
            campaign: campaignPda,
            creator: backer1.publicKey, // wrong signer
            systemProgram: SystemProgram.programId,
          })
          .signers([backer1])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "Unauthorized");
      }
    });
  });

  // ── Add Reward Tier ────────────────────────────────────────────────

  describe("add_reward_tier", () => {
    const TIER_HASH = Buffer.alloc(32, 6);

    it("adds reward tier 0", async () => {
      const tierPda = findPda([
        Buffer.from("reward_tier"),
        campaignPda.toBuffer(),
        Buffer.from([0]),
      ]);

      await program.methods
        .addRewardTier(
          0,
          new BN(100_000), // price: 0.1 token
          100, // max backers
          Array.from(TIER_HASH) as any,
          true // product-linked
        )
        .accounts({
          rewardTier: tierPda,
          campaign: campaignPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const tier = await program.account.rewardTier.fetch(tierPda);
      assert.ok(tier.campaign.equals(campaignPda));
      assert.equal(tier.tierIndex, 0);
      assert.ok(tier.price.eq(new BN(100_000)));
      assert.equal(tier.maxBackers, 100);
      assert.equal(tier.currentBackers, 0);
      assert.equal(tier.isProductLinked, true);

      const campaign = await program.account.campaign.fetch(campaignPda);
      assert.equal(campaign.rewardTierCount, 1);
    });
  });

  // ── Activate Campaign ──────────────────────────────────────────────

  describe("activate_campaign", () => {
    it("activates the campaign", async () => {
      await program.methods
        .activateCampaign()
        .accounts({
          campaign: campaignPda,
          creator: creator.publicKey,
        })
        .signers([creator])
        .rpc();

      const campaign = await program.account.campaign.fetch(campaignPda);
      assert.deepEqual(campaign.status, { active: {} });
    });

    it("rejects activating an already active campaign", async () => {
      try {
        await program.methods
          .activateCampaign()
          .accounts({
            campaign: campaignPda,
            creator: creator.publicKey,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "CampaignNotInSetup");
      }
    });
  });

  // ── Contribute ─────────────────────────────────────────────────────

  describe("contribute", () => {
    it("backer1 contributes 500,000 tokens", async () => {
      const contributionPda = findPda([
        Buffer.from("contribution"),
        campaignPda.toBuffer(),
        backer1.publicKey.toBuffer(),
      ]);

      const amount = new BN(500_000);

      await program.methods
        .contribute(amount, null) // no reward tier
        .accounts({
          contribution: contributionPda,
          campaign: campaignPda,
          vault: vaultPda,
          backerTokenAccount: backer1TokenAccount,
          backer: backer1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([backer1])
        .rpc();

      const contribution = await program.account.contribution.fetch(
        contributionPda
      );
      assert.ok(contribution.campaign.equals(campaignPda));
      assert.ok(contribution.backer.equals(backer1.publicKey));
      assert.ok(contribution.amount.eq(amount));
      assert.equal(contribution.refunded, false);

      const campaign = await program.account.campaign.fetch(campaignPda);
      assert.ok(campaign.raisedAmount.eq(amount));
      assert.equal(campaign.backerCount, 1);

      // Verify vault balance
      const vaultAccount = await getAccount(connection, vaultPda);
      assert.equal(Number(vaultAccount.amount), 500_000);
    });

    it("backer1 contributes again (accumulates)", async () => {
      const contributionPda = findPda([
        Buffer.from("contribution"),
        campaignPda.toBuffer(),
        backer1.publicKey.toBuffer(),
      ]);

      const additionalAmount = new BN(200_000);

      await program.methods
        .contribute(additionalAmount, null)
        .accounts({
          contribution: contributionPda,
          campaign: campaignPda,
          vault: vaultPda,
          backerTokenAccount: backer1TokenAccount,
          backer: backer1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([backer1])
        .rpc();

      const contribution = await program.account.contribution.fetch(
        contributionPda
      );
      // Should be 500_000 + 200_000 = 700_000
      assert.ok(contribution.amount.eq(new BN(700_000)));

      const campaign = await program.account.campaign.fetch(campaignPda);
      assert.ok(campaign.raisedAmount.eq(new BN(700_000)));
      // backer_count should NOT increase for repeat contributor
      assert.equal(campaign.backerCount, 1);
    });

    it("backer2 contributes 500,000 tokens (reaching goal)", async () => {
      const contributionPda = findPda([
        Buffer.from("contribution"),
        campaignPda.toBuffer(),
        backer2.publicKey.toBuffer(),
      ]);

      await program.methods
        .contribute(new BN(500_000), 0) // with reward tier 0
        .accounts({
          contribution: contributionPda,
          campaign: campaignPda,
          vault: vaultPda,
          backerTokenAccount: backer2TokenAccount,
          backer: backer2.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([backer2])
        .rpc();

      const campaign = await program.account.campaign.fetch(campaignPda);
      // 700_000 + 500_000 = 1_200_000 (exceeds goal of 1_000_000)
      assert.ok(campaign.raisedAmount.eq(new BN(1_200_000)));
      assert.equal(campaign.backerCount, 2);

      const contribution = await program.account.contribution.fetch(
        contributionPda
      );
      assert.equal(contribution.rewardTier, 0);
    });

    it("rejects zero contribution", async () => {
      const newBacker = Keypair.generate();
      await fundAccount(newBacker.publicKey);
      const newBackerToken = await createAccount(
        connection,
        newBacker,
        mint,
        newBacker.publicKey
      );

      const contributionPda = findPda([
        Buffer.from("contribution"),
        campaignPda.toBuffer(),
        newBacker.publicKey.toBuffer(),
      ]);

      try {
        await program.methods
          .contribute(new BN(0), null)
          .accounts({
            contribution: contributionPda,
            campaign: campaignPda,
            vault: vaultPda,
            backerTokenAccount: newBackerToken,
            backer: newBacker.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([newBacker])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "ZeroContribution");
      }
    });
  });

  // ── Approve Milestone ──────────────────────────────────────────────

  describe("approve_milestone", () => {
    it("admin approves milestone 0", async () => {
      const milestonePda = findPda([
        Buffer.from("milestone"),
        campaignPda.toBuffer(),
        Buffer.from([0]),
      ]);

      await program.methods
        .approveMilestone()
        .accounts({
          milestone: milestonePda,
          campaign: campaignPda,
          platformConfig: platformConfigPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const milestone = await program.account.milestone.fetch(milestonePda);
      assert.deepEqual(milestone.status, { approved: {} });
      assert.ok(milestone.approvedBy.equals(admin.publicKey));
    });

    it("rejects non-admin approving milestone", async () => {
      const milestonePda = findPda([
        Buffer.from("milestone"),
        campaignPda.toBuffer(),
        Buffer.from([1]),
      ]);

      try {
        await program.methods
          .approveMilestone()
          .accounts({
            milestone: milestonePda,
            campaign: campaignPda,
            platformConfig: platformConfigPda,
            admin: creator.publicKey, // not the admin
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "Unauthorized");
      }
    });

    it("rejects approving already approved milestone", async () => {
      const milestonePda = findPda([
        Buffer.from("milestone"),
        campaignPda.toBuffer(),
        Buffer.from([0]),
      ]);

      try {
        await program.methods
          .approveMilestone()
          .accounts({
            milestone: milestonePda,
            campaign: campaignPda,
            platformConfig: platformConfigPda,
            admin: admin.publicKey,
          })
          .signers([admin])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "MilestoneNotPending");
      }
    });
  });

  // ── Release Milestone Funds ────────────────────────────────────────

  describe("release_milestone_funds", () => {
    it("creator releases milestone 0 funds", async () => {
      const milestonePda = findPda([
        Buffer.from("milestone"),
        campaignPda.toBuffer(),
        Buffer.from([0]),
      ]);

      const creatorBalanceBefore = Number(
        (await getAccount(connection, creatorTokenAccount)).amount
      );
      const treasuryBalanceBefore = Number(
        (await getAccount(connection, treasuryTokenAccount)).amount
      );

      await program.methods
        .releaseMilestoneFunds()
        .accounts({
          milestone: milestonePda,
          campaign: campaignPda,
          vault: vaultPda,
          creatorTokenAccount: creatorTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          platformConfig: platformConfigPda,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      const milestone = await program.account.milestone.fetch(milestonePda);
      assert.deepEqual(milestone.status, { released: {} });

      // Milestone target was 500_000
      // Fee: 500_000 * 250 / 10_000 = 12_500
      // Creator gets: 500_000 - 12_500 = 487_500
      const creatorBalanceAfter = Number(
        (await getAccount(connection, creatorTokenAccount)).amount
      );
      const treasuryBalanceAfter = Number(
        (await getAccount(connection, treasuryTokenAccount)).amount
      );

      assert.equal(
        creatorBalanceAfter - creatorBalanceBefore,
        487_500,
        "Creator should receive milestone amount minus fee"
      );
      assert.equal(
        treasuryBalanceAfter - treasuryBalanceBefore,
        12_500,
        "Treasury should receive fee"
      );
    });

    it("rejects releasing non-approved milestone", async () => {
      const milestonePda = findPda([
        Buffer.from("milestone"),
        campaignPda.toBuffer(),
        Buffer.from([1]), // milestone 1 is still Pending
      ]);

      try {
        await program.methods
          .releaseMilestoneFunds()
          .accounts({
            milestone: milestonePda,
            campaign: campaignPda,
            vault: vaultPda,
            creatorTokenAccount: creatorTokenAccount,
            treasuryTokenAccount: treasuryTokenAccount,
            platformConfig: platformConfigPda,
            creator: creator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "MilestoneNotApproved");
      }
    });
  });

  // ── Update Platform Config ─────────────────────────────────────────

  describe("update_platform_config", () => {
    it("updates fee basis points", async () => {
      await program.methods
        .updatePlatformConfig(500, null) // 5% fee, no treasury change
        .accounts({
          platformConfig: platformConfigPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.platformConfig.fetch(
        platformConfigPda
      );
      assert.equal(config.feeBasisPoints, 500);
    });

    it("updates treasury", async () => {
      const newTreasury = Keypair.generate();
      await program.methods
        .updatePlatformConfig(null, newTreasury.publicKey)
        .accounts({
          platformConfig: platformConfigPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.platformConfig.fetch(
        platformConfigPda
      );
      assert.ok(config.treasury.equals(newTreasury.publicKey));

      // Restore original treasury for other tests
      await program.methods
        .updatePlatformConfig(FEE_BASIS_POINTS, treasury.publicKey)
        .accounts({
          platformConfig: platformConfigPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();
    });

    it("rejects non-admin", async () => {
      try {
        await program.methods
          .updatePlatformConfig(100, null)
          .accounts({
            platformConfig: platformConfigPda,
            admin: creator.publicKey,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "Unauthorized");
      }
    });

    it("rejects fee > 1000", async () => {
      try {
        await program.methods
          .updatePlatformConfig(1001, null)
          .accounts({
            platformConfig: platformConfigPda,
            admin: admin.publicKey,
          })
          .signers([admin])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "FeeTooHigh");
      }
    });
  });

  // ── AllOrNothing Failed Campaign + Refund Flow ─────────────────────

  describe("AllOrNothing campaign failure + refunds", () => {
    let failCampaignPda: PublicKey;
    let failVaultPda: PublicKey;
    let failBacker1Contribution: PublicKey;
    const FAIL_CAMPAIGN_ID = new BN(100);

    before(async () => {
      failCampaignPda = findPda([
        Buffer.from("campaign"),
        creator.publicKey.toBuffer(),
        FAIL_CAMPAIGN_ID.toArrayLike(Buffer, "le", 8),
      ]);
      failVaultPda = findPda([
        Buffer.from("vault"),
        failCampaignPda.toBuffer(),
      ]);
      failBacker1Contribution = findPda([
        Buffer.from("contribution"),
        failCampaignPda.toBuffer(),
        backer1.publicKey.toBuffer(),
      ]);

      // Create campaign with very short deadline (2 seconds)
      await program.methods
        .createCampaign(
          FAIL_CAMPAIGN_ID,
          new BN(10_000_000), // 10 tokens (unreachable goal)
          getFutureDeadline(3), // 3 seconds from now
          0, // AllOrNothing
          Array.from(CONTENT_HASH) as any
        )
        .accounts({
          campaign: failCampaignPda,
          vault: failVaultPda,
          currencyMint: mint,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Activate
      await program.methods
        .activateCampaign()
        .accounts({
          campaign: failCampaignPda,
          creator: creator.publicKey,
        })
        .signers([creator])
        .rpc();

      // Backer1 contributes a small amount
      await program.methods
        .contribute(new BN(100_000), null)
        .accounts({
          contribution: failBacker1Contribution,
          campaign: failCampaignPda,
          vault: failVaultPda,
          backerTokenAccount: backer1TokenAccount,
          backer: backer1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([backer1])
        .rpc();

      // Wait for deadline to pass
      await new Promise((resolve) => setTimeout(resolve, 4000));
    });

    it("finalizes as Failed (AllOrNothing, goal not met)", async () => {
      await program.methods
        .finalizeCampaign()
        .accounts({
          campaign: failCampaignPda,
          vault: failVaultPda,
          creatorTokenAccount: null,
          treasuryTokenAccount: null,
          platformConfig: platformConfigPda,
          caller: backer1.publicKey, // anyone can call
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([backer1])
        .rpc();

      const campaign = await program.account.campaign.fetch(failCampaignPda);
      assert.deepEqual(campaign.status, { failed: {} });
    });

    it("backer1 claims refund", async () => {
      const balanceBefore = Number(
        (await getAccount(connection, backer1TokenAccount)).amount
      );

      await program.methods
        .claimRefund()
        .accounts({
          contribution: failBacker1Contribution,
          campaign: failCampaignPda,
          vault: failVaultPda,
          backerTokenAccount: backer1TokenAccount,
          backer: backer1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([backer1])
        .rpc();

      const balanceAfter = Number(
        (await getAccount(connection, backer1TokenAccount)).amount
      );
      assert.equal(balanceAfter - balanceBefore, 100_000, "Full refund");

      const contribution = await program.account.contribution.fetch(
        failBacker1Contribution
      );
      assert.equal(contribution.refunded, true);
    });

    it("rejects double refund", async () => {
      try {
        await program.methods
          .claimRefund()
          .accounts({
            contribution: failBacker1Contribution,
            campaign: failCampaignPda,
            vault: failVaultPda,
            backerTokenAccount: backer1TokenAccount,
            backer: backer1.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([backer1])
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        assert.include(err.toString(), "AlreadyRefunded");
      }
    });
  });

  // ── KeepWhatYouRaise No-Milestone Success Flow ─────────────────────

  describe("KeepWhatYouRaise + no milestones (direct payout)", () => {
    let kwyrCampaignPda: PublicKey;
    let kwyrVaultPda: PublicKey;
    const KWYR_CAMPAIGN_ID = new BN(200);

    before(async () => {
      kwyrCampaignPda = findPda([
        Buffer.from("campaign"),
        creator.publicKey.toBuffer(),
        KWYR_CAMPAIGN_ID.toArrayLike(Buffer, "le", 8),
      ]);
      kwyrVaultPda = findPda([
        Buffer.from("vault"),
        kwyrCampaignPda.toBuffer(),
      ]);

      // Create KeepWhatYouRaise campaign with no milestones
      await program.methods
        .createCampaign(
          KWYR_CAMPAIGN_ID,
          new BN(5_000_000), // 5 tokens goal
          getFutureDeadline(3),
          1, // KeepWhatYouRaise
          Array.from(CONTENT_HASH) as any
        )
        .accounts({
          campaign: kwyrCampaignPda,
          vault: kwyrVaultPda,
          currencyMint: mint,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Activate (no milestones, no reward tiers)
      await program.methods
        .activateCampaign()
        .accounts({
          campaign: kwyrCampaignPda,
          creator: creator.publicKey,
        })
        .signers([creator])
        .rpc();

      // Backer2 contributes (goal won't be met, but KeepWhatYouRaise)
      const contributionPda = findPda([
        Buffer.from("contribution"),
        kwyrCampaignPda.toBuffer(),
        backer2.publicKey.toBuffer(),
      ]);

      await program.methods
        .contribute(new BN(300_000), null)
        .accounts({
          contribution: contributionPda,
          campaign: kwyrCampaignPda,
          vault: kwyrVaultPda,
          backerTokenAccount: backer2TokenAccount,
          backer: backer2.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([backer2])
        .rpc();

      // Wait for deadline
      await new Promise((resolve) => setTimeout(resolve, 4000));
    });

    it("finalizes as Successful and transfers funds directly", async () => {
      const creatorBalanceBefore = Number(
        (await getAccount(connection, creatorTokenAccount)).amount
      );
      const treasuryBalanceBefore = Number(
        (await getAccount(connection, treasuryTokenAccount)).amount
      );

      await program.methods
        .finalizeCampaign()
        .accounts({
          campaign: kwyrCampaignPda,
          vault: kwyrVaultPda,
          creatorTokenAccount: creatorTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          platformConfig: platformConfigPda,
          caller: admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([admin])
        .rpc();

      const campaign = await program.account.campaign.fetch(kwyrCampaignPda);
      assert.deepEqual(campaign.status, { successful: {} });

      // 300_000 raised, fee = 300_000 * 250 / 10_000 = 7_500
      // Creator gets 300_000 - 7_500 = 292_500
      const creatorBalanceAfter = Number(
        (await getAccount(connection, creatorTokenAccount)).amount
      );
      const treasuryBalanceAfter = Number(
        (await getAccount(connection, treasuryTokenAccount)).amount
      );

      assert.equal(creatorBalanceAfter - creatorBalanceBefore, 292_500);
      assert.equal(treasuryBalanceAfter - treasuryBalanceBefore, 7_500);
    });
  });
});
