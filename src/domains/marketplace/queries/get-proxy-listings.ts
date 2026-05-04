import { sql } from "drizzle-orm";
import { db } from "@/shared/db";

export interface ProxyListingItem {
  proxyFarmerId: string;
  proxyFarmerName: string;
  proxyFarmerAvatar: string | null;
  proxyFarmerVoivodeship: string | null;
  productName: string;
  productCategory: string | null;
  productMethod: string | null;
  productDescription: string | null;
}

const ITEMS_PER_PAGE = 12;

export async function getProxyListingsForMarket(page = 1): Promise<{
  results: ProxyListingItem[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const [rows, countRows] = await Promise.all([
    db.execute(sql`
      SELECT
        pf.id                    AS "proxyFarmerId",
        pf.name                  AS "proxyFarmerName",
        pf.avatar                AS "proxyFarmerAvatar",
        pf.voivodeship           AS "proxyFarmerVoivodeship",
        p->>'name'               AS "productName",
        p->>'category'           AS "productCategory",
        p->>'method'             AS "productMethod",
        p->>'description'        AS "productDescription"
      FROM proxy_farmers pf,
           jsonb_array_elements(pf.products) p
      WHERE jsonb_array_length(pf.products) > 0
        AND p->>'name' IS NOT NULL
      ORDER BY pf.created_at DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT cast(count(*) as int) AS total
      FROM proxy_farmers pf,
           jsonb_array_elements(pf.products) p
      WHERE jsonb_array_length(pf.products) > 0
        AND p->>'name' IS NOT NULL
    `),
  ]);

  const total = (countRows.rows[0] as { total: number }).total;

  return {
    results: rows.rows as unknown as ProxyListingItem[],
    total,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
    page,
  };
}
