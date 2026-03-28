import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCropLog } from "@/domains/farming/actions/create-crop-log";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/domains/farming/repository/postgres", () => {
  const MockRepo = class {
    create = vi.fn().mockResolvedValue({
      id: "log-1",
      farmerId: "user-1",
      type: "PLANTING",
      description: "Posadzono pomidory",
      images: [],
      contentHash: "abc123",
      previousHash: null,
      createdAt: new Date(),
    });
  };
  return { PostgresCropLogRepository: MockRepo };
});

describe("createCropLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createCropLog({
      type: "PLANTING",
      description: "Posadzono pomidory",
    });

    expect(result.success).toBe(false);
  });

  it("returns error for empty description", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createCropLog({
      type: "PLANTING",
      description: "",
    });

    expect(result.success).toBe(false);
  });

  it("creates crop log on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createCropLog({
      type: "PLANTING",
      description: "Posadzono pomidory na polu nr 3",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.logId).toBe("log-1");
    }
  });
});
