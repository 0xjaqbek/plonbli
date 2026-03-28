import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn(),
          }),
        }),
        orderBy: vi.fn(),
      }),
    }),
  };
  return { db: mockDb };
});

describe("computeCropLogHash", () => {
  it("produces consistent SHA-256 hex string", async () => {
    const { computeCropLogHash } = await import(
      "@/domains/farming/repository/postgres"
    );

    const hash = await computeCropLogHash({
      description: "Posadzono pomidory",
      images: [],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different inputs", async () => {
    const { computeCropLogHash } = await import(
      "@/domains/farming/repository/postgres"
    );

    const hash1 = await computeCropLogHash({
      description: "Posadzono pomidory",
      images: [],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    const hash2 = await computeCropLogHash({
      description: "Posadzono ogorki",
      images: [],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    expect(hash1).not.toBe(hash2);
  });

  it("includes images in hash computation", async () => {
    const { computeCropLogHash } = await import(
      "@/domains/farming/repository/postgres"
    );

    const hashWithout = await computeCropLogHash({
      description: "Posadzono pomidory",
      images: [],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    const hashWith = await computeCropLogHash({
      description: "Posadzono pomidory",
      images: ["img1.jpg"],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    expect(hashWithout).not.toBe(hashWith);
  });
});
