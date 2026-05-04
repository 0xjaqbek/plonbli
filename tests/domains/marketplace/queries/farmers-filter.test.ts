import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  };
  return { db: mockDb };
});

describe("getProxyFarmersForList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call where when no filter provided", async () => {
    const { db } = await import("@/shared/db");
    const whereMock = vi.fn().mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: whereMock }) } as any);

    const { getProxyFarmersForList } = await import(
      "@/domains/marketplace/queries/get-proxy-farmer"
    );
    await getProxyFarmersForList();

    expect(whereMock).not.toHaveBeenCalled();
  });

  it("calls where when voivodeship filter provided", async () => {
    const { db } = await import("@/shared/db");
    const whereMock = vi.fn().mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: whereMock }) } as any);

    const { getProxyFarmersForList } = await import(
      "@/domains/marketplace/queries/get-proxy-farmer"
    );
    await getProxyFarmersForList({ voivodeship: "malopolskie" });

    expect(whereMock).toHaveBeenCalled();
  });
});

describe("getFarmersForMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls where when voivodeship filter provided", async () => {
    const { db } = await import("@/shared/db");
    const whereMock = vi.fn().mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: whereMock }) } as any);

    const { getFarmersForMap } = await import(
      "@/domains/marketplace/queries/get-farmers-for-map"
    );
    await getFarmersForMap({ voivodeship: "malopolskie" });

    expect(whereMock).toHaveBeenCalled();
  });

  it("calls where once (role condition) when no filter", async () => {
    const { db } = await import("@/shared/db");
    const whereMock = vi.fn().mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: whereMock }) } as any);

    const { getFarmersForMap } = await import(
      "@/domains/marketplace/queries/get-farmers-for-map"
    );
    await getFarmersForMap();

    expect(whereMock).toHaveBeenCalledTimes(1);
  });
});

describe("getProxyFarmersForMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls where when voivodeship filter provided", async () => {
    const { db } = await import("@/shared/db");
    const whereMock = vi.fn().mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: whereMock }) } as any);

    const { getProxyFarmersForMap } = await import(
      "@/domains/marketplace/queries/get-proxy-farmer"
    );
    await getProxyFarmersForMap({ voivodeship: "malopolskie" });

    expect(whereMock).toHaveBeenCalled();
  });
});
