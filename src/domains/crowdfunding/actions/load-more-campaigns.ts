"use server";

import { getCampaigns } from "../queries/get-campaigns";

export async function loadMoreCampaigns(params: {
  offset: number;
  limit: number;
  category?: string;
}) {
  return getCampaigns({
    category: params.category,
    limit: params.limit,
    offset: params.offset,
  });
}
