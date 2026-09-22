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

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/domains/crowdfunding/lib/content-hash", () => ({
  generateContentHash: vi.fn().mockResolvedValue(new Uint8Array(32)),
  hashToHex: vi.fn().mockReturnValue("a".repeat(64)),
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

const futureDate = new Date(Date.now() + 86_400_000 * 30).toISOString();
const pastDate = new Date(Date.now() - 86_400_000).toISOString();

const validFields = () => ({
  title: "Nowa zbiórka testowa",
  description: "To jest opis testowej zbiórki z minimum znaków",
  category: "FARMER_INVESTMENT",
  fundingModel: "ALL_OR_NOTHING",
  currencyMint: "SOL",
  goalAmount: "1000",
  deadline: futureDate,
});

// ── Tests ────────────────────────────────────────────────────────────

describe("createCampaignAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { createCampaignAction } = await import(
      "@/domains/crowdfunding/actions/create-campaign"
    );
    await expect(
      createCampaignAction(makeFormData(validFields()))
    ).rejects.toThrow("Unauthorized");
  });

  it("returns validation errors for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { createCampaignAction } = await import(
      "@/domains/crowdfunding/actions/create-campaign"
    );
    // Missing required fields
    const result = await createCampaignAction(
      makeFormData({ title: "ab" })
    );
    expect(result).toHaveProperty("error");
  });

  it("returns error when deadline is in the past (server-side re-check)", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    // The Zod schema also rejects past deadlines, so we need a date
    // that just barely passed between client-side check and server-side.
    // We test the server-side re-check by mocking Date.now to advance.
    const borderlineDate = new Date(Date.now() + 2000).toISOString();
    const fields = { ...validFields(), deadline: borderlineDate };

    const { createCampaignAction } = await import(
      "@/domains/crowdfunding/actions/create-campaign"
    );

    // Mock Date.now to simulate time passing after Zod validation
    const originalNow = Date.now;
    Date.now = vi.fn().mockReturnValue(originalNow() + 10_000);

    try {
      const result = await createCampaignAction(makeFormData(fields));
      // Either Zod catches it or the server-side check does
      expect(result).toHaveProperty("error");
    } finally {
      Date.now = originalNow;
    }
  });

  it("generates content hash and inserts campaign", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const insertChain = mockDbChain([{ id: "new-campaign-1" }]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const { generateContentHash, hashToHex } = await import(
      "@/domains/crowdfunding/lib/content-hash"
    );

    const { redirect } = await import("next/navigation");

    const { createCampaignAction } = await import(
      "@/domains/crowdfunding/actions/create-campaign"
    );
    await createCampaignAction(makeFormData(validFields()));

    expect(generateContentHash).toHaveBeenCalled();
    expect(hashToHex).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });

  it("calls redirect on success", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const insertChain = mockDbChain([{ id: "new-campaign-1" }]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const { redirect } = await import("next/navigation");

    const { createCampaignAction } = await import(
      "@/domains/crowdfunding/actions/create-campaign"
    );
    await createCampaignAction(makeFormData(validFields()));

    expect(redirect).toHaveBeenCalledWith("/crowdfunding/new-campaign-1");
  });
});
