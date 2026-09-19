/**
 * Generate SHA-256 content hash for on-chain tamper-proof bridge.
 * Used for campaigns (title+description) and milestones/rewards (description).
 */
export async function generateContentHash(content: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

/**
 * Convert hash bytes to hex string for storage in PostgreSQL.
 */
export function hashToHex(hash: Uint8Array): string {
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string back to Uint8Array for on-chain comparison.
 */
export function hexToHash(hex: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
