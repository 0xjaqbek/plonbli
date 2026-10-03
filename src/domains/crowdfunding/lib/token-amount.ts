import BN from "bn.js";

export function parseTokenAmount(value: string, decimals: number): BN {
  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error("INVALID_TOKEN_AMOUNT");
  }

  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) {
    throw new Error("TOO_MANY_DECIMAL_PLACES");
  }

  const paddedFraction = fraction.padEnd(decimals, "0");
  const base = new BN(10).pow(new BN(decimals));
  return new BN(whole).mul(base).add(new BN(paddedFraction || "0"));
}

export function formatTokenAmount(value: BN, decimals: number): string {
  if (decimals === 0) return value.toString();

  const base = new BN(10).pow(new BN(decimals));
  const whole = value.div(base).toString();
  const fraction = value
    .mod(base)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}
