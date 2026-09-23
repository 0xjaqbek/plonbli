import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
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
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue(returnValue);
  return chain;
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

const validFields = () => ({
  campaignId: "campaign-1",
  title: "Nowy wpis",
  content: "Treść wpisu o postępach w zbiórce",
});

// ── Tests ────────────────────────────────────────────────────────────

describe("createUpdateAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { createUpdateAction } = await import(
      "@/domains/crowdfunding/actions/create-update"
    );
    const result = await createUpdateAction(makeFormData(validFields()));
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns validation errors for missing title", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { createUpdateAction } = await import(
      "@/domains/crowdfunding/actions/create-update"
    );
    const result = await createUpdateAction(
      makeFormData({ campaignId: "campaign-1", title: "", content: "test" })
    );
    expect(result).toHaveProperty("error");
  });

  it("returns validation errors for missing content", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { createUpdateAction } = await import(
      "@/domains/crowdfunding/actions/create-update"
    );
    const result = await createUpdateAction(
      makeFormData({ campaignId: "campaign-1", title: "test", content: "" })
    );
    expect(result).toHaveProperty("error");
  });

  it("returns error when campaign not found or not owned by user", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]); // campaign not found
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { createUpdateAction } = await import(
      "@/domains/crowdfunding/actions/create-update"
    );
    const result = await createUpdateAction(makeFormData(validFields()));
    expect(result).toEqual({
      error: "Campaign not found or not authorized",
    });
  });

  it("inserts update and returns success when authorized", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    // First select: campaign found
    const selectChain = mockDbChain([{ id: "campaign-1" }]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    // Insert
    const insertChain = mockDbChain([]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const { createUpdateAction } = await import(
      "@/domains/crowdfunding/actions/create-update"
    );
    const result = await createUpdateAction(makeFormData(validFields()));
    expect(result).toEqual({ success: true });
    expect(db.insert).toHaveBeenCalled();
  });

  it("calls revalidatePath on success", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const selectChain = mockDbChain([{ id: "campaign-1" }]);
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const insertChain = mockDbChain([]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const { revalidatePath } = await import("next/cache");

    const { createUpdateAction } = await import(
      "@/domains/crowdfunding/actions/create-update"
    );
    await createUpdateAction(makeFormData(validFields()));

    expect(revalidatePath).toHaveBeenCalledWith("/crowdfunding/campaign-1");
  });
});
