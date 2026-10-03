import { describe, expect, it } from "vitest";
import { formatTokenAmount, parseTokenAmount } from "@/domains/crowdfunding/lib/token-amount";

describe("token amount conversion", () => {
  it("uses mint decimals without floating-point rounding", () => {
    const amount = parseTokenAmount("12.345678", 6);
    expect(amount.toString()).toBe("12345678");
    expect(formatTokenAmount(amount, 6)).toBe("12.345678");
  });

  it("rejects precision beyond the mint", () => {
    expect(() => parseTokenAmount("1.0000001", 6)).toThrow(
      "TOO_MANY_DECIMAL_PLACES"
    );
  });
});
