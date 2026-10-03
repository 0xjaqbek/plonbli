export interface CropLogEntry {
  farmerId: string;
  productId?: string;
  campaignId?: string;
  type: "PLANTING" | "GROWING" | "TREATMENT" | "HARVEST" | "OTHER";
  description: string;
  images: string[];
  imageHashes: string[];
  data?: {
    crop?: string;
    area?: string;
    quantity?: string;
    method?: string;
  };
}

export interface CropLogRecord extends CropLogEntry {
  id: string;
  contentHash: string;
  previousHash: string | null;
  hashVersion: number;
  farmerWalletAddress?: string;
  anchorTransactionSignature?: string;
  anchoredAt?: Date;
  createdAt: Date;
}

export interface CropLogRepository {
  create(entry: CropLogEntry): Promise<CropLogRecord>;
  getByFarmer(farmerId: string): Promise<CropLogRecord[]>;
  getByProduct(productId: string): Promise<CropLogRecord[]>;
  verify(entryId: string): Promise<boolean>;
}
