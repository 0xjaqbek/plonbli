import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder, BorshAccountsCoder } from "@coral-xyz/anchor";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingContributions,
  crowdfundingRewardTiers,
  userWallets,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  CROWDFUNDING_PROGRAM_ID,
  SOLANA_RPC_URL,
} from "@/domains/crowdfunding/lib/constants";
import IDL from "@/domains/crowdfunding/lib/idl.json";

const coder = new BorshCoder(IDL as any);

// Contribution account discriminator (first 8 bytes of sha256("account:Contribution"))
const CONTRIBUTION_DISCRIMINATOR = Buffer.from(
  BorshAccountsCoder.accountDiscriminator("Contribution")
);

/**
 * Cron endpoint to sync on-chain contributions to the database.
 * Catches contributions made via Solana Actions where links.next failed,
 * and any other on-chain contributions not recorded through the app.
 *
 * Usage: GET /api/crowdfunding/sync?secret=<CRON_SECRET>
 * Or configure as Vercel Cron with Authorization header.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");

  const isAuthorized =
    (secret && secret === process.env.CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");

  // Fetch all active campaigns with on-chain pubkey
  const activeCampaigns = await db
    .select({
      id: crowdfundingCampaigns.id,
      campaignPubkey: crowdfundingCampaigns.campaignPubkey,
      currencyMint: crowdfundingCampaigns.currencyMint,
    })
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.status, "ACTIVE"),
        sql`${crowdfundingCampaigns.campaignPubkey} IS NOT NULL`
      )
    );

  let newContributions = 0;
  let updatedLinks = 0;

  for (const campaign of activeCampaigns) {
    if (!campaign.campaignPubkey) continue;
    const campaignPubkey = new PublicKey(campaign.campaignPubkey);

    try {
      // Find all on-chain Contribution PDAs for this campaign
      // Filter by: discriminator + campaign pubkey at offset 8 (after discriminator)
      const accounts = await connection.getProgramAccounts(
        CROWDFUNDING_PROGRAM_ID,
        {
          filters: [
            { memcmp: { offset: 0, bytes: CONTRIBUTION_DISCRIMINATOR.toString("base64"), encoding: "base64" } },
            { memcmp: { offset: 8, bytes: campaignPubkey.toBase58() } },
          ],
        }
      );

      for (const { pubkey, account } of accounts) {
        const contributionPubkeyStr = pubkey.toBase58();

        // Decode on-chain data
        let data: any;
        try {
          data = coder.accounts.decode("contribution", account.data);
        } catch {
          continue; // Skip malformed accounts
        }

        const backerPubkey = (data.backer as PublicKey).toBase58();
        const amountHuman = (Number(data.amount.toString()) / 1_000_000_000).toString();
        const rewardTierIndex =
          data.rewardTier !== null && data.rewardTier !== undefined
            ? Number(data.rewardTier)
            : null;

        // Check if already in DB
        const [existing] = await db
          .select({
            id: crowdfundingContributions.id,
            backerId: crowdfundingContributions.backerId,
          })
          .from(crowdfundingContributions)
          .where(
            eq(
              crowdfundingContributions.contributionPubkey,
              contributionPubkeyStr
            )
          )
          .limit(1);

        // Look up wallet → user
        const [linkedWallet] = await db
          .select({ userId: userWallets.userId })
          .from(userWallets)
          .where(eq(userWallets.publicKey, backerPubkey))
          .limit(1);
        const userId = linkedWallet?.userId ?? null;

        if (existing) {
          // Retroactively link user if wallet was connected after initial sync
          if (!existing.backerId && userId) {
            await db
              .update(crowdfundingContributions)
              .set({ backerId: userId })
              .where(eq(crowdfundingContributions.id, existing.id));
            updatedLinks++;
          }
          // Update amount to match on-chain (authoritative)
          await db
            .update(crowdfundingContributions)
            .set({ amount: amountHuman })
            .where(eq(crowdfundingContributions.id, existing.id));
        } else {
          // Find reward tier DB id
          let rewardTierId: string | null = null;
          if (rewardTierIndex !== null) {
            const [tier] = await db
              .select({ id: crowdfundingRewardTiers.id })
              .from(crowdfundingRewardTiers)
              .where(
                and(
                  eq(crowdfundingRewardTiers.campaignId, campaign.id),
                  eq(crowdfundingRewardTiers.tierIndex, rewardTierIndex)
                )
              )
              .limit(1);
            rewardTierId = tier?.id ?? null;
          }

          // Insert new contribution
          await db.insert(crowdfundingContributions).values({
            campaignId: campaign.id,
            backerId: userId,
            rewardTierId,
            amount: amountHuman,
            walletAddress: backerPubkey,
            contributionPubkey: contributionPubkeyStr,
            source: "SYNC",
          });

          newContributions++;
        }
      }

      // Reconcile campaign totals from on-chain contribution count
      const onChainBackerCount = accounts.length;
      const onChainRaisedAmount = accounts.reduce((sum, { account: acc }) => {
        try {
          const d = coder.accounts.decode("contribution", acc.data);
          return sum + Number(d.amount.toString());
        } catch {
          return sum;
        }
      }, 0);
      const raisedHuman = (onChainRaisedAmount / 1_000_000_000).toString();

      await db
        .update(crowdfundingCampaigns)
        .set({
          raisedAmount: raisedHuman,
          backerCount: onChainBackerCount,
        })
        .where(eq(crowdfundingCampaigns.id, campaign.id));
    } catch (err) {
      console.error(
        `[sync] error processing campaign ${campaign.id}:`,
        err
      );
    }
  }

  return NextResponse.json({
    campaignsProcessed: activeCampaigns.length,
    newContributions,
    updatedLinks,
  });
}
