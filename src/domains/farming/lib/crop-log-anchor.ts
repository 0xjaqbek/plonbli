export function buildCropLogMemo(input: {
  logId: string;
  contentHash: string;
  campaignPubkey?: string;
}): string {
  return [
    "plonbli",
    "crop-log",
    "v2",
    input.logId,
    input.contentHash,
    input.campaignPubkey ?? "none",
  ].join(":");
}
