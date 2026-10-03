import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { ACTIONS_CORS_HEADERS } from "@solana/actions";
import { getMint } from "@solana/spl-token";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingContributions,
  crowdfundingRewardTiers,
  userWallets,
} from "@/shared/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getCampaignById } from "@/domains/crowdfunding/queries/get-campaigns";
import { findContributionPda } from "@/domains/crowdfunding/lib/pda";
import { SOLANA_RPC_URL } from "@/domains/crowdfunding/lib/constants";
import { formatTokenAmount } from "@/domains/crowdfunding/lib/token-amount";
import { verifyContributionOnChain } from "@/domains/crowdfunding/lib/verify-contribution";

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

  const campaign = await getCampaignById(campaignId);
  if (!campaign?.campaignPubkey) {
    return NextResponse.json(
      { message: "Kampania nie została znaleziona" },
      { status: 404, headers: ACTIONS_CORS_HEADERS }
    );
  }

  const campaignPubkey = new PublicKey(campaign.campaignPubkey);
  const contributionPda = findContributionPda(campaignPubkey, backerPubkey);

  let verified;
  try {
    verified = await verifyContributionOnChain({
      campaignPubkey: campaignPubkey.toBase58(),
      contributionPubkey: contributionPda.toBase58(),
      backerWalletAddress: backerPubkey.toBase58(),
      transactionSignature: signature,
    });
  } catch (verificationError) {
    console.error("[actions/confirm] verification failed:", verificationError);
    return NextResponse.json(
      { message: "Nie udało się zweryfikować transakcji i podpisu portfela" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const mint = await getMint(connection, new PublicKey(campaign.currencyMint));
    const amountHuman = formatTokenAmount(verified.amount, mint.decimals);
    const rewardTierIndex = verified.rewardTierIndex;

    const walletAddress = backerPubkey.toBase58();
    const [linkedWallet] = await db
      .select({ userId: userWallets.userId })
      .from(userWallets)
      .where(eq(userWallets.publicKey, walletAddress))
      .limit(1);
    const backerId = linkedWallet?.userId ?? null;

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
      if (!tier) {
        return NextResponse.json(
          { message: "Próg nagrody z transakcji nie istnieje w kampanii" },
          { status: 409, headers: ACTIONS_CORS_HEADERS }
        );
      }
      rewardTierId = tier.id;
    }

    const contributionPubkey = contributionPda.toBase58();
    const [existing] = await db
      .select({
        id: crowdfundingContributions.id,
        amount: crowdfundingContributions.amount,
      })
      .from(crowdfundingContributions)
      .where(eq(crowdfundingContributions.contributionPubkey, contributionPubkey))
      .limit(1);

    if (existing) {
      const delta = parseFloat(amountHuman) - parseFloat(existing.amount);
      if (delta < 0) {
        return NextResponse.json(
          { message: "Kwota wpłaty on-chain jest niższa niż zapisana" },
          { status: 409, headers: ACTIONS_CORS_HEADERS }
        );
      }

      await db
        .update(crowdfundingContributions)
        .set({
          amount: amountHuman,
          rewardTierId,
          transactionSignature: signature,
          walletAddress,
          backerId: backerId ?? undefined,
        })
        .where(eq(crowdfundingContributions.id, existing.id));

      if (delta > 0) {
        await db
          .update(crowdfundingCampaigns)
          .set({
            raisedAmount: sql`(cast(${crowdfundingCampaigns.raisedAmount} as numeric) + ${delta})::text`,
          })
          .where(eq(crowdfundingCampaigns.id, campaignId));
      }
    } else {
      await db.insert(crowdfundingContributions).values({
        campaignId,
        backerId,
        rewardTierId,
        amount: amountHuman,
        walletAddress,
        contributionPubkey,
        transactionSignature: signature,
        source: "ACTION",
      });

      await db
        .update(crowdfundingCampaigns)
        .set({
          raisedAmount: sql`(cast(${crowdfundingCampaigns.raisedAmount} as numeric) + ${parseFloat(amountHuman)})::text`,
          backerCount: sql`${crowdfundingCampaigns.backerCount} + 1`,
        })
        .where(eq(crowdfundingCampaigns.id, campaignId));

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
  } catch (error: unknown) {
    console.error("[actions/confirm] reconciliation error:", error);
    return NextResponse.json(
      { message: "Nie udało się zapisać zweryfikowanej transakcji" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
