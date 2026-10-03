import { NextRequest, NextResponse } from "next/server";
import {
  Transaction,
  PublicKey,
  Connection,
} from "@solana/web3.js";
import {
  ACTIONS_CORS_HEADERS,
  type ActionGetResponse,
  type ActionPostResponse,
} from "@solana/actions";
import { getMint } from "@solana/spl-token";
import { getCampaignById } from "@/domains/crowdfunding/queries/get-campaigns";
import { getRewardTiers } from "@/domains/crowdfunding/queries/get-reward-tiers";
import { buildContributeInstructions } from "@/domains/crowdfunding/lib/instruction-builder";
import {
  SOLANA_RPC_URL,
  getCurrencyLabel,
} from "@/domains/crowdfunding/lib/constants";
import { parseTokenAmount } from "@/domains/crowdfunding/lib/token-amount";

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: ACTIONS_CORS_HEADERS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json(
      { message: "Nie znaleziono kampanii" },
      { status: 404, headers: ACTIONS_CORS_HEADERS }
    );
  }

  if (campaign.status !== "ACTIVE") {
    return NextResponse.json(
      { message: "Kampania nie jest aktywna" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  if (new Date(campaign.deadline).getTime() <= Date.now()) {
    return NextResponse.json(
      { message: "Termin kampanii upłynął" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  const tiers = await getRewardTiers(campaignId);
  const currency = getCurrencyLabel(campaign.currencyMint);
  const raised = parseFloat(campaign.raisedAmount).toLocaleString("pl-PL");
  const goal = parseFloat(campaign.goalAmount).toLocaleString("pl-PL");

  const tierOptions = [
    { label: "Bez nagrody", value: "" },
    ...tiers
      .filter(
        (t) => t.maxBackers === 0 || t.currentBackers < t.maxBackers
      )
      .map((t) => ({
        label: `${t.title} (min. ${parseFloat(t.price).toLocaleString("pl-PL")} ${currency})${
          t.maxBackers > 0
            ? ` — ${t.maxBackers - t.currentBackers} wolnych`
            : ""
        }`,
        value: String(t.tierIndex),
      })),
  ];

  const icon =
    campaign.images.length > 0
      ? campaign.images[0]
      : `${new URL(_req.url).origin}/logoMonochrome.png`;

  const response: ActionGetResponse = {
    type: "action",
    icon,
    title: campaign.title,
    description: `${campaign.description.slice(0, 200)}${campaign.description.length > 200 ? "..." : ""}\n\nZebrano: ${raised} / ${goal} ${currency} | Wspierających: ${campaign.backerCount}`,
    label: "Wesprzyj",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Wesprzyj kampanię",
          href: `/api/actions/contribute/${campaignId}?amount={amount}&tier={tier}`,
          parameters: [
            {
              name: "amount",
              label: `Kwota (${currency})`,
              type: "number",
              required: true,
            },
            ...(tiers.length > 0
              ? [
                  {
                    name: "tier",
                    label: "Nagroda",
                    type: "select" as const,
                    required: false,
                    options: tierOptions,
                  },
                ]
              : []),
          ],
        },
      ],
    },
  };

  return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  let body: { account: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Nieprawidłowe dane żądania" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  // Parse backer pubkey
  let backerPubkey: PublicKey;
  try {
    backerPubkey = new PublicKey(body.account);
  } catch {
    return NextResponse.json(
      { message: "Nieprawidłowy adres portfela" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  // Parse query params
  const url = new URL(req.url);
  const amountStr = url.searchParams.get("amount");
  const tierStr = url.searchParams.get("tier");

  if (!amountStr) {
    return NextResponse.json(
      { message: "Kwota jest wymagana" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  const amountFloat = parseFloat(amountStr);
  if (isNaN(amountFloat) || amountFloat <= 0) {
    return NextResponse.json(
      { message: "Kwota musi być większa od 0" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  // Fetch campaign
  const campaign = await getCampaignById(campaignId);
  if (!campaign || campaign.status !== "ACTIVE") {
    return NextResponse.json(
      { message: "Kampania nie jest aktywna" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  if (new Date(campaign.deadline).getTime() <= Date.now()) {
    return NextResponse.json(
      { message: "Termin kampanii upłynął" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  if (!campaign.campaignPubkey) {
    return NextResponse.json(
      { message: "Kampania nie jest jeszcze aktywna on-chain" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  // Validate tier if selected
  let rewardTier: number | null = null;
  if (tierStr && tierStr !== "") {
    rewardTier = parseInt(tierStr, 10);
    if (isNaN(rewardTier) || rewardTier < 0 || rewardTier > 9) {
      return NextResponse.json(
        { message: "Nieprawidłowy indeks nagrody" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Best-effort capacity check
    const tiers = await getRewardTiers(campaignId);
    const tier = tiers.find((t) => t.tierIndex === rewardTier);
    if (!tier) {
      return NextResponse.json(
        { message: "Wybrany próg nagrody nie istnieje" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (amountFloat < parseFloat(tier.price)) {
      return NextResponse.json(
        {
          message: `Minimalna kwota dla nagrody "${tier.title}" to ${tier.price}`,
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (tier.maxBackers > 0 && tier.currentBackers >= tier.maxBackers) {
      return NextResponse.json(
        { message: `Nagroda "${tier.title}" jest już pełna` },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }
  }

  const campaignPubkey = new PublicKey(campaign.campaignPubkey);
  const currencyMint = new PublicKey(campaign.currencyMint);

  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const mint = await getMint(connection, currencyMint);
    const amountBN = parseTokenAmount(amountStr, mint.decimals);
    const instructions = await buildContributeInstructions({
      campaignPubkey,
      backerPubkey,
      currencyMint,
      amount: amountBN,
      rewardTier,
    });

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const transaction = new Transaction();
    transaction.feePayer = backerPubkey;
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    instructions.forEach((ix) => transaction.add(ix));

    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const currency = getCurrencyLabel(campaign.currencyMint);

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: serialized.toString("base64"),
      message: `Wspierasz "${campaign.title}" kwotą ${amountFloat} ${currency}`,
      links: {
        next: {
          type: "post",
          href: `/api/actions/contribute/${campaignId}/confirm`,
        },
      },
    };

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (error: unknown) {
    console.error("[actions/contribute] build tx error:", error);
    return NextResponse.json(
      { message: "Nie udało się przygotować transakcji" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
