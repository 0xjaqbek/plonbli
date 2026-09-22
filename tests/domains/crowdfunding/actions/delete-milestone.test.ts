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

const setupCampaign = {
  id: "campaign-1",
  creatorId: "user-1",
  status: "SETUP",
};

// ── Tests ────────────────────────────────────────────────────────────

describe("deleteMilestoneAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { deleteMilestoneAction } = await import(
      "@/domains/crowdfunding/actions/delete-milestone"
    );
    const result = await deleteMilestoneAction("milestone-1", "campaign-1");
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

    const { deleteMilestoneAction } = await import(
      "@/domains/crowdfunding/actions/delete-milestone"
    );
    const result = await deleteMilestoneAction("milestone-1", "campaign-1");
    expect(result).toEqual({
      error: "Nie znaleziono zbi\u00f3rki lub brak uprawnie\u0144",
    });
  });

  it("successfully deletes and updates count", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    // First select: campaign found
    const campaignChain = mockDbChain([{ ...setupCampaign }]);
    vi.mocked(db.select).mockReturnValueOnce(campaignChain as any);

    // db.delete() for milestone removal
    const deleteChain = mockDbChain([]);
    vi.mocked(db.delete).mockReturnValue(deleteChain as any);

    // Second select: remaining milestone count after deletion
    const countChain = mockDbChain([{ count: 2 }]);
    vi.mocked(db.select).mockReturnValueOnce(countChain as any);

    // db.update() for campaign milestone count
    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { deleteMilestoneAction } = await import(
      "@/domains/crowdfunding/actions/delete-milestone"
    );
    const result = await deleteMilestoneAction("milestone-1", "campaign-1");
    expect(result).toEqual({ success: true });
    expect(db.delete).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });
});
