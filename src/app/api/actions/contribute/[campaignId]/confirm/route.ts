import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { ACTIONS_CORS_HEADERS } from "@solana/actions";
import { BorshCoder } from "@coral-xyz/anchor";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingContributions,
  crowdfundingRewardTiers,
  userWallets,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCampaignById } from "@/domains/crowdfunding/queries/get-campaigns";
import { findContributionPda } from "@/domains/crowdfunding/lib/pda";
import {
  CROWDFUNDING_PROGRAM_ID,
  SOLANA_RPC_URL,
} from "@/domains/crowdfunding/lib/constants";
import IDL from "@/domains/crowdfunding/lib/idl.json";

const coder = new BorshCoder(IDL as any);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: ACTIONS_CORS_HEADERS });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  let body: { account: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Nieprawidłowe dane żądania" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  const { account, signature } = body;
  if (!account || !signature) {
    return NextResponse.json(
      { message: "Brak adresu portfela lub sygnatury transakcji" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  let backerPubkey: PublicKey;
  try {
    backerPubkey = new PublicKey(account);
  } catch {
    return NextResponse.json(
      { message: "Nieprawidłowy adres portfela" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  // Fetch campaign
  const campaign = await getCampaignById(campaignId);
  if (!campaign || !campaign.campaignPubkey) {
    return NextResponse.json(
      { message: "Kampania nie została znaleziona" },
      { status: 404, headers: ACTIONS_CORS_HEADERS }
    );
  }

  const campaignPubkey = new PublicKey(campaign.campaignPubkey);
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");

  try {
    // Verify transaction on-chain
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return NextResponse.json(
        { message: "Transakcja nie została znaleziona — spróbuj ponownie za chwilę" },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (tx.meta?.err) {
      return NextResponse.json(
        { message: "Transakcja zakończyła się błędem" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Read on-chain Contribution PDA to get canonical data
    const contributionPda = findContributionPda(campaignPubkey, backerPubkey);
    const contributionAccount = await connection.getAccountInfo(contributionPda);

    if (!contributionAccount) {
      return NextResponse.json(
        { message: "Nie znaleziono wpłaty on-chain" },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Decode contribution account data
    const contributionData = coder.accounts.decode(
      "contribution",
      contributionAccount.data
    );

    const onChainAmount = (contributionData.amount as any).toString();
    const rewardTierIndex =
      contributionData.rewardTier !== null && contributionData.rewardTier !== undefined
        ? Number(contributionData.rewardTier)
        : null;

    // Convert on-chain amount (lamports) to human-readable
    const amountHuman = (
      Number(onChainAmount) / 1_000_000_000
    ).toString();

    // Look up plonbli user via wallet
    const walletAddress = backerPubkey.toBase58();
    const [linkedWallet] = await db
      .select({ userId: userWallets.userId })
      .from(userWallets)
      .where(eq(userWallets.publicKey, walletAddress))
      .limit(1);

    const backerId = linkedWallet?.userId ?? null;

    // Find reward tier DB id if tier was selected
    let rewardTierId: string | null = null;
    if (rewardTierIndex !== null) {
      const [tier] = await db
        .select({ id: crowdfundingRewardTiers.id })
        .from(crowdfundingRewardTiers)
        .where(
          and(
            eq(crowdfundingRewardTiers.campaignId, campaignId),
            eq(crowdfundingRewardTiers.tierIndex, rewardTierIndex)
          )
        )
        .limit(1);
      rewardTierId = tier?.id ?? null;
    }

    // Check if contribution already exists in DB
    const contributionPubkeyStr = contributionPda.toBase58();
    const [existing] = await db
      .select({ id: crowdfundingContributions.id })
      .from(crowdfundingContributions)
      .where(
        eq(crowdfundingContributions.contributionPubkey, contributionPubkeyStr)
      )
      .limit(1);

    if (existing) {
      // Update existing with latest on-chain data
      await db
        .update(crowdfundingContributions)
        .set({
          amount: amountHuman,
          transactionSignature: signature,
          walletAddress,
          backerId: backerId ?? undefined,
        })
        .where(eq(crowdfundingContributions.id, existing.id));
    } else {
      // Insert new contribution
      await db.insert(crowdfundingContributions).values({
        campaignId,
        backerId,
        rewardTierId,
        amount: amountHuman,
        walletAddress,
        contributionPubkey: contributionPubkeyStr,
        transactionSignature: signature,
        source: "ACTION",
      });

      // Update campaign totals
      await db
        .update(crowdfundingCampaigns)
        .set({
          raisedAmount: sql`(cast(${crowdfundingCampaigns.raisedAmount} as numeric) + ${parseFloat(amountHuman)})::text`,
          backerCount: sql`${crowdfundingCampaigns.backerCount} + 1`,
        })
        .where(eq(crowdfundingCampaigns.id, campaignId));

      // Increment tier backer count if applicable
      if (rewardTierId) {
        await db
          .update(crowdfundingRewardTiers)
          .set({
            currentBackers: sql`${crowdfundingRewardTiers.currentBackers} + 1`,
          })
          .where(eq(crowdfundingRewardTiers.id, rewardTierId));
      }
    }

    return NextResponse.json(
      {
        type: "completed" as const,
        message: "Dziękujemy za wsparcie kampanii!",
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err: any) {
    console.error("[actions/confirm] error:", err);
    return NextResponse.json(
      { message: "Nie udało się zweryfikować transakcji" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
