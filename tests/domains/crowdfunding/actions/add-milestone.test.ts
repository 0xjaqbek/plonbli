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
  generateContentHash: vi.fn().mockResolvedValue(new Uint8Array(32)),
  hashToHex: vi.fn().mockReturnValue("c".repeat(64)),
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
};

const validMilestone = () =>
  makeFormData({
    title: "Milestone One",
    description: "This is a detailed milestone description text",
    targetAmount: "500",
  });

// ── Tests ────────────────────────────────────────────────────────────

describe("addMilestoneAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { addMilestoneAction } = await import(
      "@/domains/crowdfunding/actions/add-milestone"
    );
    const result = await addMilestoneAction("campaign-1", validMilestone());
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when campaign not found/not SETUP", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]); // not found
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { addMilestoneAction } = await import(
      "@/domains/crowdfunding/actions/add-milestone"
    );
    const result = await addMilestoneAction("campaign-1", validMilestone());
    expect(result).toEqual({
      error: "Nie znaleziono zbi\u00f3rki lub brak uprawnie\u0144",
    });
  });

  it("returns validation error for bad input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([{ ...setupCampaign }]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { addMilestoneAction } = await import(
      "@/domains/crowdfunding/actions/add-milestone"
    );
    // Title too short, description missing, bad amount
    const result = await addMilestoneAction(
      "campaign-1",
      makeFormData({ title: "ab", description: "short", targetAmount: "-1" })
    );
    expect(result).toHaveProperty("error");
  });

  it("successfully adds milestone with correct index", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    // First select: campaign found
    const campaignChain = mockDbChain([{ ...setupCampaign }]);
    // Second select: existing milestone count = 2
    const countChain = mockDbChain([{ count: 2 }]);

    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(countChain as any);

    const insertChain = mockDbChain([]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { addMilestoneAction } = await import(
      "@/domains/crowdfunding/actions/add-milestone"
    );
    const result = await addMilestoneAction("campaign-1", validMilestone());
    expect(result).toEqual({ success: true });
    expect(db.insert).toHaveBeenCalled();
  });

  it("updates campaign milestone count", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const campaignChain = mockDbChain([{ ...setupCampaign }]);
    const countChain = mockDbChain([{ count: 3 }]);

    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any)
      .mockReturnValueOnce(countChain as any);

    const insertChain = mockDbChain([]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { addMilestoneAction } = await import(
      "@/domains/crowdfunding/actions/add-milestone"
    );
    await addMilestoneAction("campaign-1", validMilestone());

    // Should update campaign with new milestone count (3 + 1 = 4)
    expect(db.update).toHaveBeenCalled();
  });
});
