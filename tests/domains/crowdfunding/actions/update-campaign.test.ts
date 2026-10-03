import { describe, it, expect, vi, beforeEach } from "vitest";

// Top-level mocks
vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/domains/crowdfunding/lib/content-hash", () => ({
  hashToHex: vi.fn().mockReturnValue("b".repeat(64)),
}));
vi.mock("@/domains/crowdfunding/lib/campaign-content", () => ({
  generateCampaignContentHash: vi.fn().mockResolvedValue(new Uint8Array(32)),
}));

// ── Helpers ──────────────────────────────────────────────────────────

function mockDbChain(returnValue: any = []) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(returnValue);
  chain.then = (fn: any) => Promise.resolve(returnValue).then(fn);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockResolvedValue(returnValue);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue(returnValue);
  chain.set = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

const setupCampaign = {
  id: "campaign-1",
  creatorId: "user-1",
  status: "SETUP",
  title: "Existing title",
  description: "Existing description with enough chars",
  images: [],
  category: "FARMER_INVESTMENT",
  fundingModel: "ALL_OR_NOTHING",
  currencyMint: "So11111111111111111111111111111111111111112",
  goalAmount: "1000",
  deadline: new Date(Date.now() + 86_400_000),
};

// ── Tests ────────────────────────────────────────────────────────────

describe("updateCampaignAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { updateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/update-campaign"
    );
    const result = await updateCampaignAction(
      "campaign-1",
      makeFormData({ title: "New title here" })
    );
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when campaign not found/not owned/not SETUP", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]); // not found
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { updateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/update-campaign"
    );
    const result = await updateCampaignAction(
      "campaign-1",
      makeFormData({ title: "New title here" })
    );
    expect(result).toEqual({
      error: "Nie znaleziono zbi\u00f3rki lub brak uprawnie\u0144",
    });
  });

  it("returns validation error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([{ ...setupCampaign }]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { updateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/update-campaign"
    );
    // Title too short (min 3)
    const result = await updateCampaignAction(
      "campaign-1",
      makeFormData({ title: "ab" })
    );
    expect(result).toHaveProperty("error");
  });

  it("returns error when no changes provided", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([{ ...setupCampaign }]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { updateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/update-campaign"
    );
    // Empty form — no title, no description, no images
    const result = await updateCampaignAction(
      "campaign-1",
      makeFormData({})
    );
    expect(result).toEqual({
      error: "Brak zmian do zapisania",
    });
  });

  it("successfully updates and regenerates content hash", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const selectChain = mockDbChain([{ ...setupCampaign }]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { hashToHex } = await import(
      "@/domains/crowdfunding/lib/content-hash"
    );
    const { generateCampaignContentHash } = await import(
      "@/domains/crowdfunding/lib/campaign-content"
    );

    const { updateCampaignAction } = await import(
      "@/domains/crowdfunding/actions/update-campaign"
    );
    const result = await updateCampaignAction(
      "campaign-1",
      makeFormData({ title: "Updated title" })
    );

    expect(result).toEqual({ success: true });
    expect(generateCampaignContentHash).toHaveBeenCalled();
    expect(hashToHex).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });
});
