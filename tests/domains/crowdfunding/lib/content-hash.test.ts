import { describe, it, expect } from "vitest";
import {
  generateContentHash,
  hashToHex,
  hexToHash,
} from "@/domains/crowdfunding/lib/content-hash";

describe("generateContentHash", () => {
  it("returns a 32-byte Uint8Array (SHA-256)", async () => {
    const hash = await generateContentHash("hello");
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it("is deterministic (same input produces same output)", async () => {
    const hash1 = await generateContentHash("deterministic test");
    const hash2 = await generateContentHash("deterministic test");
    expect(hash1).toEqual(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await generateContentHash("input A");
    const hash2 = await generateContentHash("input B");
    expect(hash1).not.toEqual(hash2);
  });

  it("produces a valid hash for an empty string", async () => {
    const hash = await generateContentHash("");
    const hex = hashToHex(hash);
    // Known SHA-256 of empty string
    expect(hex).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("produces a valid hash for Unicode content (Polish characters)", async () => {
    const hash = await generateContentHash("Cześć");
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);

    // Ensure it differs from ASCII-only content
    const asciiHash = await generateContentHash("Czesc");
    expect(hash).not.toEqual(asciiHash);
  });
});

describe("hashToHex", () => {
  it("converts a 32-byte Uint8Array to a 64-character hex string", () => {
    const bytes = new Uint8Array(32);
    bytes.fill(0xab);
    const hex = hashToHex(bytes);
    expect(hex).toHaveLength(64);
    expect(hex).toBe("ab".repeat(32));
  });

  it("pads single-digit hex values with a leading zero", () => {
    const bytes = new Uint8Array(32);
    bytes[0] = 0x0f; // should be "0f", not "f"
    bytes[1] = 0x01; // should be "01", not "1"
    bytes[2] = 0x00; // should be "00", not "0"
    const hex = hashToHex(bytes);
    expect(hex.substring(0, 6)).toBe("0f0100");
  });
});

describe("hexToHash", () => {
  it("roundtrips with hashToHex (hex -> bytes -> hex)", () => {
    const originalHex =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const bytes = hexToHash(originalHex);
    const resultHex = hashToHex(bytes);
    expect(resultHex).toBe(originalHex);
  });
});

describe("full roundtrip", () => {
  it("generateContentHash -> hashToHex -> hexToHash returns original hash bytes", async () => {
    const originalHash = await generateContentHash("roundtrip test content");
    const hex = hashToHex(originalHash);
    const recoveredHash = hexToHash(hex);
    expect(recoveredHash).toEqual(originalHash);
  });
});
