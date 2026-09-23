import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

vi.mock("@/domains/crowdfunding/queries/get-campaigns", () => ({
  getCampaignById: vi.fn(),
}));
vi.mock("@/domains/crowdfunding/queries/get-reward-tiers", () => ({
  getRewardTiers: vi.fn(),
}));
vi.mock("@/domains/crowdfunding/lib/instruction-builder", () => ({
  buildContributeInstructions: vi.fn(),
}));
vi.mock("@/domains/crowdfunding/lib/constants", () => ({
  SOLANA_RPC_URL: "https://api.devnet.solana.com",
}));

// Mock @solana/web3.js Connection + Transaction
const mockGetLatestBlockhash = vi.fn();
const mockSerialize = vi.fn().mockReturnValue(Buffer.from("mock-transaction"));
vi.mock("@solana/web3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/web3.js")>();
  return {
    ...actual,
    Connection: class MockConnection {
      getLatestBlockhash = mockGetLatestBlockhash;
    },
    Transaction: class MockTransaction {
      feePayer: any = null;
      recentBlockhash: string = "";
      lastValidBlockHeight: number = 0;
      instructions: any[] = [];
      add(...items: any[]) {
        this.instructions.push(...items);
        return this;
      }
      serialize = mockSerialize;
    },
  };
});

import { GET, POST, OPTIONS } from "@/app/api/actions/contribute/[campaignId]/route";
import { getCampaignById } from "@/domains/crowdfunding/queries/get-campaigns";
import { getRewardTiers } from "@/domains/crowdfunding/queries/get-reward-tiers";
import { buildContributeInstructions } from "@/domains/crowdfunding/lib/instruction-builder";

const VALID_PUBKEY = "11111111111111111111111111111112";

const futureDate = new Date(Date.now() + 86_400_000).toISOString();
const pastDate = new Date(Date.now() - 86_400_000).toISOString();

const activeCampaign = {
  id: "camp-1",
  title: "Test Campaign",
  description: "Test description",
  images: ["https://example.com/img.jpg"],
  status: "ACTIVE",
  deadline: futureDate,
  campaignPubkey: "11111111111111111111111111111112",
  currencyMint: "So11111111111111111111111111111111111111112",
  goalAmount: "1000",
  raisedAmount: "100",
  backerCount: 5,
  fundingModel: "ALL_OR_NOTHING",
  category: "FARMER_INVESTMENT",
};

const sampleTier = {
  id: "tier-1",
  campaignId: "camp-1",
  tierIndex: 0,
  title: "Bronze",
  description: "Bronze reward tier",
  descriptionHash: null,
  price: "10",
  maxBackers: 100,
  currentBackers: 5,
  isProductLinked: false,
  productId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fullTier = {
  ...sampleTier,
  id: "tier-full",
  tierIndex: 1,
  title: "Gold",
  description: "Gold reward tier (full)",
  price: "50",
  maxBackers: 10,
  currentBackers: 10,
};

function makeParams(campaignId: string) {
  return { params: Promise.resolve({ campaignId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── OPTIONS ────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/actions/contribute/[campaignId]", () => {
  it("returns 200 with CORS headers", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBeTruthy();
  });
});

// ─── GET ────────────────────────────────────────────────────────────────────────

describe("GET /api/actions/contribute/[campaignId]", () => {
  it("returns 404 when campaign not found", async () => {
    vi.mocked(getCampaignById).mockResolvedValue(undefined);

    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-missing"
    );
    const response = await GET(req, makeParams("camp-missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBeTruthy();
  });

  it("returns 400 when campaign is not ACTIVE", async () => {
    vi.mocked(getCampaignById).mockResolvedValue({
      ...activeCampaign,
      status: "DRAFT",
    } as any);

    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1"
    );
    const response = await GET(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBeTruthy();
  });

  it("returns 400 when deadline has passed", async () => {
    vi.mocked(getCampaignById).mockResolvedValue({
      ...activeCampaign,
      deadline: pastDate,
    } as any);

    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1"
    );
    const response = await GET(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBeTruthy();
  });

  it("returns valid ActionGetResponse for active campaign", async () => {
    vi.mocked(getCampaignById).mockResolvedValue(activeCampaign as any);
    vi.mocked(getRewardTiers).mockResolvedValue([]);

    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1"
    );
    const response = await GET(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBe("action");
    expect(body.title).toBe("Test Campaign");
    expect(body.icon).toBe("https://example.com/img.jpg");
    expect(body.links).toBeDefined();
    expect(body.links.actions).toBeInstanceOf(Array);
    expect(body.links.actions.length).toBeGreaterThan(0);
    expect(body.links.actions[0].parameters).toBeInstanceOf(Array);
  });

  it("includes reward tiers as select options when tiers exist", async () => {
    vi.mocked(getCampaignById).mockResolvedValue(activeCampaign as any);
    vi.mocked(getRewardTiers).mockResolvedValue([sampleTier] as any);

    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1"
    );
    const response = await GET(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(200);

    const action = body.links.actions[0];
    const tierParam = action.parameters.find(
      (p: any) => p.name === "tier"
    );
    expect(tierParam).toBeDefined();
    expect(tierParam.type).toBe("select");
    expect(tierParam.options).toBeInstanceOf(Array);
    expect(tierParam.options.length).toBeGreaterThanOrEqual(2); // "Bez nagrody" + tier
    expect(
      tierParam.options.some((o: any) => o.value === String(sampleTier.tierIndex))
    ).toBe(true);
  });

  it("response has CORS headers", async () => {
    vi.mocked(getCampaignById).mockResolvedValue(activeCampaign as any);
    vi.mocked(getRewardTiers).mockResolvedValue([]);

    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1"
    );
    const response = await GET(req, makeParams("camp-1"));

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────────

describe("POST /api/actions/contribute/[campaignId]", () => {
  it("returns 400 for invalid body (no account)", async () => {
    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1?amount=10",
      { method: "POST", body: JSON.stringify({}) }
    );
    const response = await POST(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBeTruthy();
  });

  it("returns 400 for invalid pubkey", async () => {
    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1?amount=10",
      { method: "POST", body: JSON.stringify({ account: "not-a-valid-pubkey" }) }
    );
    const response = await POST(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBeTruthy();
  });

  it("returns 400 for missing amount", async () => {
    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1",
      { method: "POST", body: JSON.stringify({ account: VALID_PUBKEY }) }
    );
    const response = await POST(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBeTruthy();
  });

  it("returns 400 for amount <= 0", async () => {
    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1?amount=0",
      { method: "POST", body: JSON.stringify({ account: VALID_PUBKEY }) }
    );
    const response = await POST(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBeTruthy();
  });

  it("returns 400 when campaign not active", async () => {
    vi.mocked(getCampaignById).mockResolvedValue({
      ...activeCampaign,
      status: "DRAFT",
    } as any);

    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1?amount=10",
      { method: "POST", body: JSON.stringify({ account: VALID_PUBKEY }) }
    );
    const response = await POST(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBeTruthy();
  });

  it("returns 400 when tier capacity full", async () => {
    vi.mocked(getCampaignById).mockResolvedValue(activeCampaign as any);
    vi.mocked(getRewardTiers).mockResolvedValue([fullTier] as any);

    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1?amount=100&tier=1",
      { method: "POST", body: JSON.stringify({ account: VALID_PUBKEY }) }
    );
    const response = await POST(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain("Gold");
  });

  it("returns valid ActionPostResponse with base64 transaction on success", async () => {
    vi.mocked(getCampaignById).mockResolvedValue(activeCampaign as any);

    // Return a simple no-op instruction
    const dummyInstruction = new TransactionInstruction({
      keys: [],
      programId: new PublicKey("11111111111111111111111111111111"),
      data: Buffer.alloc(0),
    });
    vi.mocked(buildContributeInstructions).mockResolvedValue([dummyInstruction]);

    mockGetLatestBlockhash.mockResolvedValue({
      blockhash: "EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N",
      lastValidBlockHeight: 200_000_000,
    });

    const req = new NextRequest(
      "http://localhost/api/actions/contribute/camp-1?amount=5",
      { method: "POST", body: JSON.stringify({ account: VALID_PUBKEY }) }
    );
    const response = await POST(req, makeParams("camp-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBe("transaction");
    expect(typeof body.transaction).toBe("string");
    // Verify it's a valid base64 string
    expect(() => Buffer.from(body.transaction, "base64")).not.toThrow();
    expect(body.links).toBeDefined();
    expect(body.links.next).toBeDefined();
    expect(body.links.next.type).toBe("post");
    expect(body.links.next.href).toContain("camp-1");
    expect(body.links.next.href).toContain("confirm");

    // Verify CORS headers on success response too
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
