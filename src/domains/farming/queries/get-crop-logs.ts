import { desc, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { cropLogs, products, users } from "@/shared/db/schema";
import { verifyCropLogChain } from "../repository/postgres";

export async function getCropLogsByFarmer(farmerId: string) {
  const rows = await db
    .select({
      entry: cropLogs,
      product: {
        id: products.id,
        name: products.name,
      },
    })
    .from(cropLogs)
    .leftJoin(products, eq(cropLogs.productId, products.id))
    .where(eq(cropLogs.farmerId, farmerId))
    .orderBy(desc(cropLogs.createdAt));

  const verification = await verifyCropLogChain(
    rows.map((row) => row.entry).reverse()
  );

  return rows.map(({ entry, product }) => ({
    ...entry,
    product,
    isHashValid: verification.get(entry.id) ?? false,
  }));
}

export async function getCropLogsByProduct(productId: string) {
  const rows = await db
    .select({
      entry: cropLogs,
      farmer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(cropLogs)
    .innerJoin(users, eq(cropLogs.farmerId, users.id))
    .where(eq(cropLogs.productId, productId))
    .orderBy(desc(cropLogs.createdAt));

  const verification = await verifyCropLogChain(
    rows.map((row) => row.entry).reverse()
  );

  return rows.map(({ entry, farmer }) => ({
    ...entry,
    farmer,
    isHashValid: verification.get(entry.id) ?? false,
  }));
}

export async function getCropLogsByCampaign(campaignId: string) {
  const rows = await db
    .select({
      entry: cropLogs,
      product: {
        id: products.id,
        name: products.name,
      },
    })
    .from(cropLogs)
    .leftJoin(products, eq(cropLogs.productId, products.id))
    .where(eq(cropLogs.campaignId, campaignId))
    .orderBy(desc(cropLogs.createdAt));

  const verification = await verifyCropLogChain(
    rows.map((row) => row.entry).reverse()
  );
  return rows.map(({ entry, product }) => ({
    ...entry,
    product,
    isHashValid: verification.get(entry.id) ?? false,
  }));
}

export type FarmerCropLog = Awaited<
  ReturnType<typeof getCropLogsByFarmer>
>[number];
export type ProductCropLog = Awaited<
  ReturnType<typeof getCropLogsByProduct>
>[number];
