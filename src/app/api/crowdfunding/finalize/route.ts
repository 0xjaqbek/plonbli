import { NextResponse } from "next/server";
import { finalizeExpiredCampaigns } from "@/domains/crowdfunding/actions/finalize-campaign";

/**
 * Cron endpoint to finalize all expired ACTIVE campaigns.
 * Protected by CRON_SECRET env var.
 *
 * Usage: GET /api/crowdfunding/finalize?secret=<CRON_SECRET>
 * Or configure as Vercel Cron with Authorization header.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");

  // Accept either query param or Authorization: Bearer header
  const isAuthorized =
    (secret && secret === process.env.CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await finalizeExpiredCampaigns();

  return NextResponse.json(results);
}
