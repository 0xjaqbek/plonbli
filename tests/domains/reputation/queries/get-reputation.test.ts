import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWhere, mockFrom, mockSelect } = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return { mockWhere, mockFrom, mockSelect };
});

vi.mock("@/shared/db", () => ({
  db: { select: mockSelect },
}));

import { getReputation } from "@/domains/reputation/queries/get-reputation";

describe("getReputation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("zwraca null dla wymiarow gdy brak ocen", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        averageRating: null,
        reviewCount: 0,
        qualityAvg: null,
        communicationAvg: null,
        punctualityAvg: null,
        accuracyAvg: null,
      },
    ]);

    const result = await getReputation("user-1");

    expect(result.dimensionAverages.quality).toBeNull();
    expect(result.dimensionAverages.communication).toBeNull();
    expect(result.dimensionAverages.punctuality).toBeNull();
    expect(result.dimensionAverages.accuracy).toBeNull();
  });

  it("zwraca srednie wymiarow gdy istnieja oceny", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        averageRating: "4.5",
        reviewCount: 3,
        qualityAvg: "4.2",
        communicationAvg: "4.8",
        punctualityAvg: "3.9",
        accuracyAvg: "4.1",
      },
    ]);

    const result = await getReputation("user-1");

    expect(result.dimensionAverages.quality).toBeCloseTo(4.2);
    expect(result.dimensionAverages.communication).toBeCloseTo(4.8);
    expect(result.dimensionAverages.punctuality).toBeCloseTo(3.9);
    expect(result.dimensionAverages.accuracy).toBeCloseTo(4.1);
  });

  it("zwraca null dla wymiaru gdy nikt nie ocenial tego wymiaru", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        averageRating: "4.0",
        reviewCount: 5,
        qualityAvg: "4.0",
        communicationAvg: null,
        punctualityAvg: null,
        accuracyAvg: null,
      },
    ]);

    const result = await getReputation("user-1");

    expect(result.dimensionAverages.quality).toBeCloseTo(4.0);
    expect(result.dimensionAverages.communication).toBeNull();
  });
});
