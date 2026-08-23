/** Stamp supply from the workspace webhook token so Dropi/Dropea queues stay isolated. */
export function sourceFromWebhookAuth(
  payloadSource: string,
  supply: "dropi" | "dropea" | null,
): string {
  const current = payloadSource.trim() || "Dropi Pro";
  const lower = current.toLowerCase();

  if (supply === "dropea") {
    return lower.includes("dropea") ? current : "Dropea";
  }
  if (supply === "dropi") {
    if (lower.includes("dropi") && !lower.includes("dropea")) return current;
    return "Dropi Pro";
  }
  return current;
}
