/**
 * Temporary multi-owned-workspace selection until UNIQUE(owner_user_id) reconciliation.
 * Never claims ownerless/foreign workspaces — only rows already owned by userId.
 */

export type OwnedWorkspaceCandidate = {
  id: string;
  name: string;
  createdAt: string | null;
  /** Cheap operational signals (counts / booleans). */
  hasShopify?: boolean;
  hasWebhook?: boolean;
  hasWhatsApp?: boolean;
  hasCredentials?: boolean;
  hasOrders?: boolean;
};

export function scoreOwnedWorkspace(c: OwnedWorkspaceCandidate): number {
  let score = 0;
  if (c.hasShopify) score += 8;
  if (c.hasWebhook) score += 4;
  if (c.hasWhatsApp) score += 4;
  if (c.hasCredentials) score += 4;
  if (c.hasOrders) score += 2;
  return score;
}

/**
 * Pick one owned workspace deterministically.
 * Prefer operational signal score; ties → earliest created_at → id lexicographic.
 */
export function pickOwnedWorkspace(
  candidates: OwnedWorkspaceCandidate[],
): OwnedWorkspaceCandidate | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;

  const ranked = [...candidates].sort((a, b) => {
    const scoreDiff = scoreOwnedWorkspace(b) - scoreOwnedWorkspace(a);
    if (scoreDiff !== 0) return scoreDiff;
    const aCreated = a.createdAt ?? "";
    const bCreated = b.createdAt ?? "";
    if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
    return a.id.localeCompare(b.id);
  });
  return ranked[0]!;
}

/** Supabase / Postgres unique-violation shapes we may see after a future UNIQUE index. */
export function isUniqueOwnerConflict(message: string | null | undefined): boolean {
  if (!message) return false;
  return (
    /duplicate key|unique constraint|workspaces_owner_user_id|23505/i.test(message) ||
    (/owner_user_id/i.test(message) && /unique/i.test(message))
  );
}
