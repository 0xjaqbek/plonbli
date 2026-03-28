import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCollection } from "@/domains/logistics/actions/create-collection";
import { joinCollection } from "@/domains/logistics/actions/join-collection";
import { updateCollectionStatus } from "@/domains/logistics/actions/update-collection-status";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    query: {
      groupMembers: {
        findFirst: vi.fn(),
      },
      collections: {
        findFirst: vi.fn(),
      },
      collectionItems: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "col-1" }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock("@/shared/db/schema", () => ({
  collections: { id: "id" },
  collectionItems: { collectionId: "collectionId", userId: "userId" },
  groupMembers: { groupId: "groupId", userId: "userId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => val),
  and: vi.fn((...args) => args),
}));

describe("createCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createCollection({
      groupId: "group-1",
      listingId: "listing-1",
      title: "Zbiorka na pomidory",
    });

    expect(result.success).toBe(false);
  });

  it("returns error when not a group member", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.groupMembers.findFirst).mockResolvedValueOnce(undefined);

    const result = await createCollection({
      groupId: "group-1",
      listingId: "listing-1",
      title: "Zbiorka na pomidory",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("czlonkiem");
    }
  });

  it("creates collection on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.query.groupMembers.findFirst).mockResolvedValueOnce({
      groupId: "group-1",
      userId: "user-1",
      role: "MEMBER",
      joinedAt: new Date(),
    } as any);

    const result = await createCollection({
      groupId: "group-1",
      listingId: "listing-1",
      title: "Zbiorka na pomidory",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.collectionId).toBe("col-1");
    }
  });
});

describe("joinCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await joinCollection({
      collectionId: "col-1",
      quantity: "5.00",
    });

    expect(result.success).toBe(false);
  });

  it("returns error when collection not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.collections.findFirst).mockResolvedValueOnce(undefined);

    const result = await joinCollection({
      collectionId: "col-1",
      quantity: "5.00",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("nie istnieje");
    }
  });

  it("returns error when collection is not collecting", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.query.collections.findFirst).mockResolvedValueOnce({
      id: "col-1",
      status: "ORDERED",
      coordinatorId: "user-2",
    } as any);

    const result = await joinCollection({
      collectionId: "col-1",
      quantity: "5.00",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("nie przyjmuje");
    }
  });
});

describe("updateCollectionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not coordinator", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.query.collections.findFirst).mockResolvedValueOnce({
      id: "col-1",
      status: "COLLECTING",
      coordinatorId: "user-2",
    } as any);

    const result = await updateCollectionStatus({
      collectionId: "col-1",
      status: "ORDERED",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("koordynator");
    }
  });

  it("updates status when coordinator", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.query.collections.findFirst).mockResolvedValueOnce({
      id: "col-1",
      status: "COLLECTING",
      coordinatorId: "user-1",
    } as any);

    const result = await updateCollectionStatus({
      collectionId: "col-1",
      status: "ORDERED",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.status).toBe("ORDERED");
    }
  });
});
