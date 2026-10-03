import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { cropLogs } from "@/shared/db/schema";
import type {
  CropLogEntry,
  CropLogRecord,
  CropLogRepository,
} from "../types";

async function sha256(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Legacy v1 hash retained solely to verify existing rows. */
export async function computeCropLogHash(input: {
  description: string;
  images: string[];
  farmerId: string;
  timestamp: string;
}): Promise<string> {
  return sha256(
    JSON.stringify({
      description: input.description,
      images: [...input.images].sort(),
      farmerId: input.farmerId,
      timestamp: input.timestamp,
    })
  );
}

export type CropLogHashV2Input = {
  farmerId: string;
  productId?: string | null;
  campaignId?: string | null;
  type: CropLogEntry["type"];
  description: string;
  images: string[];
  imageHashes: string[];
  data?: CropLogEntry["data"] | null;
  previousHash: string | null;
  timestamp: string;
};

export async function computeCropLogHashV2(
  input: CropLogHashV2Input
): Promise<string> {
  const media = input.images.map((url, index) => ({
    url,
    sha256: input.imageHashes[index],
  }));

  return sha256(
    JSON.stringify({
      version: 2,
      farmerId: input.farmerId,
      productId: input.productId ?? null,
      campaignId: input.campaignId ?? null,
      type: input.type,
      description: input.description,
      media,
      data: input.data ?? null,
      previousHash: input.previousHash,
      timestamp: input.timestamp,
    })
  );
}

function toRecord(record: typeof cropLogs.$inferSelect): CropLogRecord {
  return {
    id: record.id,
    farmerId: record.farmerId,
    productId: record.productId ?? undefined,
    campaignId: record.campaignId ?? undefined,
    type: record.type,
    description: record.description,
    images: record.images,
    imageHashes: record.imageHashes,
    data: record.data ?? undefined,
    contentHash: record.contentHash,
    previousHash: record.previousHash,
    hashVersion: record.hashVersion,
    farmerWalletAddress: record.farmerWalletAddress ?? undefined,
    anchorTransactionSignature:
      record.anchorTransactionSignature ?? undefined,
    anchoredAt: record.anchoredAt ?? undefined,
    createdAt: record.createdAt,
  };
}

async function verifyRecord(
  record: typeof cropLogs.$inferSelect
): Promise<boolean> {
  const expected =
    record.hashVersion === 1
      ? await computeCropLogHash({
          description: record.description,
          images: record.images,
          farmerId: record.farmerId,
          timestamp: record.createdAt.toISOString(),
        })
      : await computeCropLogHashV2({
          farmerId: record.farmerId,
          productId: record.productId,
          campaignId: record.campaignId,
          type: record.type,
          description: record.description,
          images: record.images,
          imageHashes: record.imageHashes,
          data: record.data,
          previousHash: record.previousHash,
          timestamp: record.createdAt.toISOString(),
        });

  return expected === record.contentHash;
}

export async function verifyCropLogChain(
  records: Array<typeof cropLogs.$inferSelect>
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  let expectedPreviousHash: string | null = null;

  for (const record of records) {
    const linkIsValid = record.previousHash === expectedPreviousHash;
    const contentIsValid = await verifyRecord(record);
    result.set(record.id, linkIsValid && contentIsValid);
    expectedPreviousHash = record.contentHash;
  }

  return result;
}

export class PostgresCropLogRepository implements CropLogRepository {
  async create(entry: CropLogEntry): Promise<CropLogRecord> {
    return db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${entry.farmerId}, 0))`
      );

      const [lastEntry] = await transaction
        .select({ contentHash: cropLogs.contentHash })
        .from(cropLogs)
        .where(eq(cropLogs.farmerId, entry.farmerId))
        .orderBy(desc(cropLogs.createdAt))
        .limit(1);

      const previousHash = lastEntry?.contentHash ?? null;
      const now = new Date();
      const contentHash = await computeCropLogHashV2({
        farmerId: entry.farmerId,
        productId: entry.productId,
        campaignId: entry.campaignId,
        type: entry.type,
        description: entry.description,
        images: entry.images,
        imageHashes: entry.imageHashes,
        data: entry.data,
        previousHash,
        timestamp: now.toISOString(),
      });

      const [record] = await transaction
        .insert(cropLogs)
        .values({
          farmerId: entry.farmerId,
          productId: entry.productId,
          campaignId: entry.campaignId,
          type: entry.type,
          description: entry.description,
          images: entry.images,
          imageHashes: entry.imageHashes,
          data: entry.data,
          contentHash,
          previousHash,
          hashVersion: 2,
          createdAt: now,
        })
        .returning();

      return toRecord(record);
    });
  }

  async getByFarmer(farmerId: string): Promise<CropLogRecord[]> {
    const records = await db
      .select()
      .from(cropLogs)
      .where(eq(cropLogs.farmerId, farmerId))
      .orderBy(desc(cropLogs.createdAt));
    return records.map(toRecord);
  }

  async getByProduct(productId: string): Promise<CropLogRecord[]> {
    const records = await db
      .select()
      .from(cropLogs)
      .where(eq(cropLogs.productId, productId))
      .orderBy(desc(cropLogs.createdAt));
    return records.map(toRecord);
  }

  async verify(entryId: string): Promise<boolean> {
    const [target] = await db
      .select({ farmerId: cropLogs.farmerId })
      .from(cropLogs)
      .where(eq(cropLogs.id, entryId))
      .limit(1);
    if (!target) return false;

    const records = await db
      .select()
      .from(cropLogs)
      .where(eq(cropLogs.farmerId, target.farmerId))
      .orderBy(asc(cropLogs.createdAt));
    return (await verifyCropLogChain(records)).get(entryId) ?? false;
  }
}
