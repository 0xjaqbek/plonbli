import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { cropLogs } from "@/shared/db/schema";
import type {
  CropLogEntry,
  CropLogRecord,
  CropLogRepository,
} from "../types";

export async function computeCropLogHash(input: {
  description: string;
  images: string[];
  farmerId: string;
  timestamp: string;
}): Promise<string> {
  const payload = JSON.stringify({
    description: input.description,
    images: input.images.sort(),
    farmerId: input.farmerId,
    timestamp: input.timestamp,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class PostgresCropLogRepository implements CropLogRepository {
  async create(entry: CropLogEntry): Promise<CropLogRecord> {
    const [lastEntry] = await db
      .select({ contentHash: cropLogs.contentHash })
      .from(cropLogs)
      .where(eq(cropLogs.farmerId, entry.farmerId))
      .orderBy(desc(cropLogs.createdAt))
      .limit(1);

    const previousHash = lastEntry?.contentHash ?? null;
    const now = new Date();

    const contentHash = await computeCropLogHash({
      description: entry.description,
      images: entry.images,
      farmerId: entry.farmerId,
      timestamp: now.toISOString(),
    });

    const [record] = await db
      .insert(cropLogs)
      .values({
        farmerId: entry.farmerId,
        productId: entry.productId,
        type: entry.type,
        description: entry.description,
        images: entry.images,
        data: entry.data,
        contentHash,
        previousHash,
        createdAt: now,
      })
      .returning();

    return {
      id: record.id,
      farmerId: record.farmerId,
      productId: record.productId ?? undefined,
      type: record.type,
      description: record.description,
      images: record.images,
      data: record.data ?? undefined,
      contentHash: record.contentHash,
      previousHash: record.previousHash,
      createdAt: record.createdAt,
    };
  }

  async getByFarmer(farmerId: string): Promise<CropLogRecord[]> {
    const records = await db
      .select()
      .from(cropLogs)
      .where(eq(cropLogs.farmerId, farmerId))
      .orderBy(desc(cropLogs.createdAt));

    return records.map((r) => ({
      id: r.id,
      farmerId: r.farmerId,
      productId: r.productId ?? undefined,
      type: r.type,
      description: r.description,
      images: r.images,
      data: r.data ?? undefined,
      contentHash: r.contentHash,
      previousHash: r.previousHash,
      createdAt: r.createdAt,
    }));
  }

  async getByProduct(productId: string): Promise<CropLogRecord[]> {
    const records = await db
      .select()
      .from(cropLogs)
      .where(eq(cropLogs.productId, productId))
      .orderBy(desc(cropLogs.createdAt));

    return records.map((r) => ({
      id: r.id,
      farmerId: r.farmerId,
      productId: r.productId ?? undefined,
      type: r.type,
      description: r.description,
      images: r.images,
      data: r.data ?? undefined,
      contentHash: r.contentHash,
      previousHash: r.previousHash,
      createdAt: r.createdAt,
    }));
  }

  async verify(entryId: string): Promise<boolean> {
    const [record] = await db
      .select()
      .from(cropLogs)
      .where(eq(cropLogs.id, entryId))
      .limit(1);

    if (!record) return false;

    const recomputedHash = await computeCropLogHash({
      description: record.description,
      images: record.images,
      farmerId: record.farmerId,
      timestamp: record.createdAt.toISOString(),
    });

    return recomputedHash === record.contentHash;
  }
}
