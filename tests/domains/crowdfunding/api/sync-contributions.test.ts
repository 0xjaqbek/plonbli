import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// Mock DB
vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock constants
vi.mock("@/domains/crowdfunding/lib/constants", () => ({
  CROWDFUNDING_PROGRAM_ID: new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  ),
  SOLANA_RPC_URL: "https://api.devnet.solana.com",
}));

// Mock BorshCoder as a class so `new BorshCoder()` works at module level
const mockDecode = vi.fn();
vi.mock("@coral-xyz/anchor", () => ({
  BorshCoder: class MockBorshCoder {
    accounts = { decode: mockDecode };
  },
  BorshAccountsCoder: {
    accountDiscriminator: vi.fn().mockReturnValue(Buffer.alloc(8)),
  },
}));

// Mock IDL
vi.mock("@/domains/crowdfunding/lib/idl.json", () => ({
  default: { instructions: [], accounts: [], types: [], events: [], errors: [] },
}));

vi.mock("@solana/spl-token", () => ({
  getMint: vi.fn().mockResolvedValue({ decimals: 9 }),
}));

// Mock Connection
const mockGetProgramAccounts = vi.fn();
vi.mock("@solana/web3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/web3.js")>();
  return {
    ...actual,
    Connection: class MockConnection {
      getProgramAccounts = mockGetProgramAccounts;
    },
  };
});

// ── Helpers ──────────────────────────────────────────────────────────

function mockDbChain(returnValue: any = []) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(returnValue);
  chain.then = (fn: any) => Promise.resolve(returnValue).then(fn);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue(returnValue);
  chain.set = vi.fn().mockReturnValue(chain);
  return chain;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("GET /api/crowdfunding/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("returns 401 without secret", async () => {
    const { GET } = await import("@/app/api/crowdfunding/sync/route");

    const req = new Request("http://localhost/api/crowdfunding/sync");
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const { GET } = await import("@/app/api/crowdfunding/sync/route");

    const req = new Request(
      "http://localhost/api/crowdfunding/sync?secret=wrong"
    );
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("accepts secret via query parameter", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { GET } = await import("@/app/api/crowdfunding/sync/route");

    const req = new Request(
      "http://localhost/api/crowdfunding/sync?secret=test-secret"
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaignsProcessed).toBe(0);
  });

  it("accepts secret via Authorization Bearer header", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { GET } = await import("@/app/api/crowdfunding/sync/route");

    const req = new Request("http://localhost/api/crowdfunding/sync", {
      headers: { authorization: "Bearer test-secret" },
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it("returns summary with campaignsProcessed=0 when no active campaigns", async () => {
    const { db } = await import("@/shared/db");
    const chain = mockDbChain([]);
    vi.mocked(db.select).mockReturnValue(chain as any);

    const { GET } = await import("@/app/api/crowdfunding/sync/route");

    const req = new Request(
      "http://localhost/api/crowdfunding/sync?secret=test-secret"
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      campaignsProcessed: 0,
      newContributions: 0,
      updatedLinks: 0,
    });
  });

  it("processes campaigns and reports new contributions count", async () => {
    const { db } = await import("@/shared/db");

    // First select: active campaigns
    const campaignChain = mockDbChain([
      {
        id: "camp-1",
        campaignPubkey: "11111111111111111111111111111112",
        currencyMint: "So11111111111111111111111111111111111111112",
      },
    ]);

    // Subsequent selects: contribution lookup (not found), wallet lookup (not found)
    const emptyChain = mockDbChain([]);

    vi.mocked(db.select)
      .mockReturnValueOnce(campaignChain as any) // active campaigns
      .mockReturnValue(emptyChain as any); // all subsequent lookups

    // Mock on-chain: one contribution found
    const backerKey = new PublicKey(
      "SysvarC1ock11111111111111111111111111111111"
    );
    mockGetProgramAccounts.mockResolvedValue([
      {
        pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"),
        account: { data: Buffer.alloc(84) },
      },
    ]);

    // Configure BorshCoder decode mock
    mockDecode.mockReturnValue({
      backer: backerKey,
      amount: new BN("1000000000"),
      rewardTier: null,
    });

    // Mock insert and update
    const insertChain = mockDbChain([]);
    vi.mocked(db.insert).mockReturnValue(insertChain as any);

    const updateChain = mockDbChain([]);
    vi.mocked(db.update).mockReturnValue(updateChain as any);

    const { GET } = await import("@/app/api/crowdfunding/sync/route");

    const req = new Request(
      "http://localhost/api/crowdfunding/sync?secret=test-secret"
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaignsProcessed).toBe(1);
    expect(body.newContributions).toBe(1);
    expect(db.insert).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });
});
