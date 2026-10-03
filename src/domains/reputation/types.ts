export interface ReviewEntry {
  reviewerId: string;
  targetId: string | null;
  proxyFarmerId?: string | null;
  productId?: string;
  overall: number;
  dimensions?: {
    quality?: number;
    communication?: number;
    punctuality?: number;
    accuracy?: number;
  };
  comment?: string;
  verificationSource: "UNVERIFIED" | "ORDER" | "CAMPAIGN";
  verificationEvidenceId: string;
}

export interface ReviewRecord extends ReviewEntry {
  id: string;
  contentHash: string;
  previousHash: string | null;
  hashVersion: number;
  createdAt: Date;
}

export interface ReviewRepository {
  create(entry: ReviewEntry): Promise<ReviewRecord>;
  getByTarget(targetId: string): Promise<ReviewRecord[]>;
  getByReviewer(reviewerId: string): Promise<ReviewRecord[]>;
  verify(entryId: string): Promise<boolean>;
}

export interface ReputationStats {
  averageRating: number;
  reviewCount: number;
  dimensionAverages: {
    quality: number | null;
    communication: number | null;
    punctuality: number | null;
    accuracy: number | null;
  };
}
