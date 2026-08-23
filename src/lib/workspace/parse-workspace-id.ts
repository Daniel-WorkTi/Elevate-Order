const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Accept only UUID workspace ids so we never query unscoped operator data. */
export function parseWorkspaceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

export function isMissingWorkspaceColumn(message: string | undefined): boolean {
  const text = message ?? "";
  return /workspace_id/i.test(text) && /column|schema cache|does not exist/i.test(text);
}
