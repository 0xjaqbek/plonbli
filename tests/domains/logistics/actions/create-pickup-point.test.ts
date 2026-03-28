import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPickupPoint } from "@/domains/logistics/actions/create-pickup-point";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "point-1" }]),
      }),
    }),
  },
}));

vi.mock("@/shared/db/schema", () => ({
  pickupPoints: { id: "id" },
}));

describe("createPickupPoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createPickupPoint({
      name: "Parking",
      address: "ul. Dluga 15",
    });

    expect(result.success).toBe(false);
  });

  it("returns error for empty name", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createPickupPoint({
      name: "",
      address: "ul. Dluga 15",
    });

    expect(result.success).toBe(false);
  });

  it("creates pickup point on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createPickupPoint({
      name: "Parking przy sklepie",
      address: "ul. Dluga 15, Krakow",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.pointId).toBe("point-1");
    }
  });
});
