import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { cropLogs, users, products } from "@/shared/db/schema";

export async function getCropLogsByFarmer(farmerId: string) {
  return db
    .select({
      id: cropLogs.id,
      type: cropLogs.type,
      description: cropLogs.description,
      images: cropLogs.images,
      data: cropLogs.data,
      contentHash: cropLogs.contentHash,
      previousHash: cropLogs.previousHash,
      createdAt: cropLogs.createdAt,
      product: {
        id: products.id,
        name: products.name,
      },
    })
    .from(cropLogs)
    .leftJoin(products, eq(cropLogs.productId, products.id))
    .where(eq(cropLogs.farmerId, farmerId))
    .orderBy(desc(cropLogs.createdAt));
}

export async function getCropLogsByProduct(productId: string) {
  return db
    .select({
      id: cropLogs.id,
      type: cropLogs.type,
      description: cropLogs.description,
      images: cropLogs.images,
      data: cropLogs.data,
      contentHash: cropLogs.contentHash,
      previousHash: cropLogs.previousHash,
      createdAt: cropLogs.createdAt,
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
}

export type FarmerCropLog = Awaited<
  ReturnType<typeof getCropLogsByFarmer>
>[number];
export type ProductCropLog = Awaited<
  ReturnType<typeof getCropLogsByProduct>
>[number];
